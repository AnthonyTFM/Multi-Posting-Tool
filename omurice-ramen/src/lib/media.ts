// Photo & video library. Files live on disk (MEDIA_DIR, next to the database on
// the persistent volume); metadata lives in SQLite. Served by /media/[file].

import fs from "node:fs";
import path from "node:path";
import { db, nowIso } from "./db.ts";
import { getSettings, updateSettings } from "./settings.ts";
import { randomId } from "./util.ts";

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
};

type Row = { id: string; filename: string; kind: string; mime: string; size: number; alt: string; created_at: string };

const LIMITS: Record<MediaKind, number> = { image: 15 * 1024 * 1024, video: 100 * 1024 * 1024 };

export function mediaDir(): string {
  if (process.env.MEDIA_DIR) return process.env.MEDIA_DIR;
  const dbPath = process.env.DATABASE_PATH;
  const base = dbPath && dbPath !== ":memory:" ? path.dirname(dbPath) : path.join(process.cwd(), "data");
  return path.join(base, "media");
}

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
  };
}

export function saveMedia(bytes: Uint8Array, alt = ""): Media {
  const type = sniff(bytes);
  if (!type) {
    throw new MediaError("Unsupported file. Use JPG, PNG, WebP or GIF photos and MP4/WebM/MOV videos. (iPhone HEIC photos: export as JPG.)");
  }
  if (bytes.length > LIMITS[type.kind]) {
    throw new MediaError(`File too large. Max ${LIMITS[type.kind] / 1024 / 1024} MB for ${type.kind}s.`);
  }
  const id = randomId(10);
  const filename = `${id}.${type.ext}`;
  fs.mkdirSync(mediaDir(), { recursive: true });
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ mediaDir(), filename), bytes);
  db()
    .prepare("INSERT INTO media (id, filename, kind, mime, size, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, filename, type.kind, MIME_BY_EXT[type.ext], bytes.length, alt.slice(0, 200), nowIso());
  return getMedia(id)!;
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
  fs.rmSync(path.join(/*turbopackIgnore: true*/ mediaDir(), m.filename), { force: true });
}

/** Hero + gallery for the public site, skipping anything since deleted. */
export function siteMedia(): { hero: Media | null; gallery: Media[] } {
  const s = getSettings();
  return {
    hero: s.heroMediaId ? getMedia(s.heroMediaId) : null,
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
