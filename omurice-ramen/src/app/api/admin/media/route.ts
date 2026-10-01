import { adminGuard } from "@/lib/admin-api";
import { isAdmin } from "@/lib/auth";
import { listMedia, MediaError, saveMedia } from "@/lib/media";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const s = getSettings();
  return Response.json({ media: listMedia(), heroMediaId: s.heroMediaId, galleryIds: s.galleryIds, socials: s.socials });
}

// Multipart upload (can't be JSON). A cross-site form can't set custom headers,
// so the X-Omurice-Upload header + origin check stand in for the JSON CSRF guard.
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (req.headers.get("x-omurice-upload") !== "1") return Response.json({ error: "Bad request" }, { status: 400 });
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return Response.json({ error: "Bad origin" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Upload failed. Try a smaller file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  try {
    const media = saveMedia(new Uint8Array(await file.arrayBuffer()), String(form.get("alt") ?? ""));
    return Response.json(media, { status: 201 });
  } catch (e) {
    if (e instanceof MediaError) return Response.json({ error: e.message }, { status: 400 });
    console.error("[media] upload failed", e);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
