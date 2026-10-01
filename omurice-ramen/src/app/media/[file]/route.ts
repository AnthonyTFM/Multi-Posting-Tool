// Serves uploaded photos/videos. Supports HTTP Range requests, which Safari
// requires to play video at all.

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { FILENAME_RE, mediaDir, mimeForFilename, parseRange } from "@/lib/media";

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!FILENAME_RE.test(file)) return new Response("Not found", { status: 404 });
  const full = path.join(/*turbopackIgnore: true*/ mediaDir(), file);
  let size: number;
  try {
    size = fs.statSync(full).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": mimeForFilename(file),
    "Accept-Ranges": "bytes",
    // Filenames are random ids and never reused, so they can be cached forever.
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  const range = parseRange(req.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  if (range) {
    const stream = Readable.toWeb(fs.createReadStream(full, { start: range.start, end: range.end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${range.start}-${range.end}/${size}`, "Content-Length": String(range.end - range.start + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(full)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
