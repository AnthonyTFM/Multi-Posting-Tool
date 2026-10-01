import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { adminGuard } from "@/lib/admin-api";
import { isAdmin } from "@/lib/auth";
import { ingestUpload, listMedia, MediaError, UPLOAD_LIMITS } from "@/lib/media";
import { getSettings } from "@/lib/settings";
import { randomId } from "@/lib/util";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // video conversion can take a few minutes

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const s = getSettings();
  return Response.json({ media: listMedia(), heroMediaId: s.heroMediaId, galleryIds: s.galleryIds, socials: s.socials });
}

// The file is the raw request body (not multipart), streamed to a temp file so
// large phone videos never sit in memory. A cross-site form can't set custom
// headers, so X-Omurice-Upload + the origin check stand in for the JSON CSRF guard.
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (req.headers.get("x-omurice-upload") !== "1") return Response.json({ error: "Bad request" }, { status: 400 });
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Bad origin" }, { status: 403 });
  if (!req.body) return Response.json({ error: "No file" }, { status: 400 });

  const max = UPLOAD_LIMITS.video;
  if (Number(req.headers.get("content-length") ?? 0) > max) {
    return Response.json({ error: `File too large. Max ${max / 1024 / 1024} MB.` }, { status: 413 });
  }
  const alt = decodeURIComponent(req.headers.get("x-alt") ?? "").slice(0, 200);
  const tmp = path.join(os.tmpdir(), `omu-upload-${randomId()}`);
  const out = fs.createWriteStream(tmp);
  try {
    let size = 0;
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new MediaError(`File too large. Max ${max / 1024 / 1024} MB.`);
      if (!out.write(value)) await once(out, "drain");
    }
    out.end();
    await once(out, "close");
    const media = await ingestUpload(tmp, alt);
    return Response.json(media, { status: 201 });
  } catch (e) {
    out.destroy();
    if (e instanceof MediaError) return Response.json({ error: e.message }, { status: 400 });
    console.error("[media] upload failed", e);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
