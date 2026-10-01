// Photo & video library. Files live on disk (MEDIA_DIR, next to the database on
// the persistent volume); metadata lives in SQLite. Served by /media/[file].
//
// Videos are converted with ffmpeg to H.264 MP4 (+ a poster frame) so iPhone
// HEVC .mov clips play in every browser. Without ffmpeg they're stored as-is.

import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { db, nowIso } from "./db.ts";
import { getSettings, updateSettings } from "./settings.ts";
import { randomId } from "./util.ts";

const run = promisify(execFile);

export type MediaKind = "image" | "video";
export type Media = {
  id: string;
  filename: string;
  kind: MediaKind;
  mime: string;
  size: number;
  alt: string;
  createdAt: string;
  url: string;
  poster: string | null; // video still frame
};

type Row = { id: string; filename: string; kind: string; mime: string; size: number; alt: string; created_at: string; poster: string | null };

export const UPLOAD_LIMITS: Record<MediaKind, number> = { image: 15 * 1024 * 1024, video: 500 * 1024 * 1024 };
export const MAX_VIDEO_SECONDS = 180;

export function mediaDir(): string {
  if (process.env.MEDIA_DIR) return process.env.MEDIA_DIR;
  const dbPath = process.env.DATABASE_PATH;
  const base = dbPath && dbPath !== ":memory:" ? path.dirname(dbPath) : path.join(process.cwd(), "data");
  return path.join(base, "media");
}

const inMediaDir = (name: string) => path.join(/*turbopackIgnore: true*/ mediaDir(), name);

export const FILENAME_RE = /^[A-Za-z0-9_-]+\.(jpg|png|webp|gif|mp4|webm|mov)$/;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export function mimeForFilename(name: string): string {
  return MIME_BY_EXT[name.split(".").pop() ?? ""] ?? "application/octet-stream";
}

/** Identify a file by its first bytes; never trust the browser's claimed type. */
export function sniff(buf: Uint8Array): { ext: string; kind: MediaKind } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", kind: "image" };
  if (buf[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", kind: "image" };
  if (ascii(0, 4) === "GIF8") return { ext: "gif", kind: "image" };
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: "webm", kind: "video" };
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (/^(heic|heix|hevc|mif1|msf1|avif)/.test(brand)) return null; // HEIC/AVIF photos: not web-safe everywhere
    return { ext: brand === "qt  " ? "mov" : "mp4", kind: "video" };
  }
  return null;
}

export class MediaError extends Error {}

function toMedia(r: Row): Media {
  return {
    id: r.id,
    filename: r.filename,
    kind: r.kind as MediaKind,
    mime: r.mime,
    size: r.size,
    alt: r.alt,
    createdAt: r.created_at,
    url: `/media/${r.filename}`,
    poster: r.poster ? `/media/${r.poster}` : null,
  };
}

let ffmpegOk: boolean | null = null;
export async function ffmpegAvailable(): Promise<boolean> {
  if (ffmpegOk === null) {
    try {
      await run("ffmpeg", ["-version"]);
      await run("ffprobe", ["-version"]);
      ffmpegOk = true;
    } catch {
      ffmpegOk = false;
    }
  }
  return ffmpegOk;
}

async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number.parseFloat(stdout.trim()) || 0;
}

/**
 * Convert any phone video (HEVC .mov, 4K, 60fps, rotated) to a web-safe H.264
 * MP4: longest edge ≤ 1920px, 30fps, AAC audio, moov atom up front.
 */
async function transcodeVideo(input: string, output: string, poster: string): Promise<void> {
  await run(
    "ffmpeg",
    [
      "-v", "error", "-y", "-i", input,
      "-map", "0:v:0", "-map", "0:a:0?",
      "-vf", "scale=w='if(gte(iw,ih),min(1920,iw),-2)':h='if(gte(iw,ih),-2,min(1920,ih))',fps=30,format=yuv420p",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-profile:v", "high",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      output,
    ],
    { timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 },
  );
  await run("ffmpeg", ["-v", "error", "-y", "-i", output, "-frames:v", "1", "-q:v", "4", poster], { timeout: 60 * 1000 });
}

/**
 * Validate and store an uploaded file already written to `tempPath` (the caller
 * deletes the temp file). Photos are stored as-is; videos are converted.
 */
export async function ingestUpload(tempPath: string, alt = ""): Promise<Media> {
  const head = Buffer.alloc(32);
  const fd = fs.openSync(tempPath, "r");
  fs.readSync(fd, head, 0, 32, 0);
  fs.closeSync(fd);
  const type = sniff(head);
  if (!type) {
    throw new MediaError("Unsupported file. Use JPG, PNG, WebP or GIF photos and MP4/MOV/WebM videos. (iPhone HEIC photos: upload from the iPhone, or export as JPG.)");
  }
  const size = fs.statSync(tempPath).size;
  if (size > UPLOAD_LIMITS[type.kind]) {
    throw new MediaError(`File too large. Max ${UPLOAD_LIMITS[type.kind] / 1024 / 1024} MB for ${type.kind}s.`);
  }

  const id = randomId(10);
  fs.mkdirSync(mediaDir(), { recursive: true });
  let filename = `${id}.${type.ext}`;
  let poster: string | null = null;

  if (type.kind === "video" && (await ffmpegAvailable())) {
    let seconds: number;
    try {
      seconds = await probeDuration(tempPath);
    } catch {
      throw new MediaError("That video couldn't be read. Try exporting it again from your phone.");
    }
    if (seconds > MAX_VIDEO_SECONDS) throw new MediaError(`Videos must be under ${MAX_VIDEO_SECONDS / 60} minutes. Trim it on your phone first.`);
    filename = `${id}.mp4`;
    poster = `${id}-poster.jpg`;
    try {
      await transcodeVideo(tempPath, inMediaDir(filename), inMediaDir(poster));
    } catch (e) {
      fs.rmSync(inMediaDir(filename), { force: true });
      fs.rmSync(inMediaDir(poster), { force: true });
      console.error("[media] transcode failed", e);
      throw new MediaError("That video couldn't be converted. Try a shorter clip or export it as MP4.");
    }
  } else {
    fs.copyFileSync(tempPath, inMediaDir(filename));
  }

  const stored = fs.statSync(inMediaDir(filename)).size;
  db()
    .prepare("INSERT INTO media (id, filename, kind, mime, size, alt, created_at, poster) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, filename, type.kind, mimeForFilename(filename), stored, alt.slice(0, 200), nowIso(), poster);
  return getMedia(id)!;
}

/** Store bytes already in memory (tests, scripts). */
export async function saveMedia(bytes: Uint8Array, alt = ""): Promise<Media> {
  const tmp = path.join(os.tmpdir(), `omu-${randomId()}`);
  fs.writeFileSync(tmp, bytes);
  try {
    return await ingestUpload(tmp, alt);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

export function getMedia(id: string): Media | null {
  const r = db().prepare("SELECT * FROM media WHERE id = ?").get(id) as Row | undefined;
  return r ? toMedia(r) : null;
}

export function listMedia(): Media[] {
  return (db().prepare("SELECT * FROM media ORDER BY created_at DESC").all() as Row[]).map(toMedia);
}

export function updateMediaAlt(id: string, alt: string): Media | null {
  db().prepare("UPDATE media SET alt = ? WHERE id = ?").run(alt.slice(0, 200), id);
  return getMedia(id);
}

/** Delete the file and every reference to it (hero, gallery, menu photos). */
export function deleteMedia(id: string): void {
  const m = getMedia(id);
  if (!m) return;
  const s = getSettings();
  updateSettings({
    heroMediaId: s.heroMediaId === id ? null : s.heroMediaId,
    galleryIds: s.galleryIds.filter((g) => g !== id),
  });
  db().prepare("UPDATE items SET image = NULL WHERE image = ?").run(m.url);
  db().prepare("DELETE FROM media WHERE id = ?").run(id);
  fs.rmSync(inMediaDir(m.filename), { force: true });
  if (m.poster) fs.rmSync(inMediaDir(m.poster.replace("/media/", "")), { force: true });
}

/** The restaurant's own dining-room video, used until a hero is chosen in /admin/media. */
export const DEFAULT_HERO: Media & { webm: string } = {
  id: "default",
  filename: "hero.mp4",
  kind: "video",
  mime: "video/mp4",
  size: 0,
  alt: "Our dining room: the golden tree, the bubble tea neon and the tables set for dinner",
  createdAt: "",
  url: "/brand/hero.mp4",
  poster: "/brand/hero-poster.jpg",
  webm: "/brand/hero.webm", // for browsers without H.264 (some Linux Chromium builds)
};

/** Hero + gallery for the public site, skipping anything since deleted. */
export function siteMedia(): { hero: Media & { webm?: string }; gallery: Media[] } {
  const s = getSettings();
  return {
    hero: (s.heroMediaId ? getMedia(s.heroMediaId) : null) ?? DEFAULT_HERO,
    gallery: s.galleryIds.map(getMedia).filter((m): m is Media => !!m),
  };
}

/** Parse a single HTTP Range header. null = whole file; "invalid" = 416. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalid";
  let start: number;
  let end: number;
  if (m[1] === "") {
    start = Math.max(0, size - Number(m[2])); // suffix range: last N bytes
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return "invalid";
  return { start, end };
}
