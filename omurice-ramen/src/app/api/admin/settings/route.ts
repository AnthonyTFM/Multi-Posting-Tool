import { adminGuard, readJson } from "@/lib/admin-api";
import { getMedia } from "@/lib/media";
import { type Settings, getSettings, updateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  return Response.json(getSettings());
}

export async function PATCH(req: Request) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const b = (await readJson<Record<string, unknown>>(req)) ?? {};
  const patch: Partial<Settings> = {};
  if (b.prepMinutes !== undefined) {
    const m = Math.round(Number(b.prepMinutes));
    if (!Number.isFinite(m) || m < 5 || m > 120) return Response.json({ error: "Prep time must be 5–120 minutes" }, { status: 400 });
    patch.prepMinutes = m;
  }
  for (const k of ["orderingPaused", "reservationsPaused", "aiPhoneEnabled"] as const) if (typeof b[k] === "boolean") patch[k] = b[k] as boolean;
  if (typeof b.announcement === "string") patch.announcement = b.announcement.trim().slice(0, 200);
  if (b.closures !== undefined) {
    if (!Array.isArray(b.closures) || !b.closures.every((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))) {
      return Response.json({ error: "Closures must be YYYY-MM-DD dates" }, { status: 400 });
    }
    patch.closures = [...new Set(b.closures as string[])].sort();
  }
  if (b.heroMediaId !== undefined) {
    if (b.heroMediaId !== null && !(typeof b.heroMediaId === "string" && getMedia(b.heroMediaId))) {
      return Response.json({ error: "Unknown media" }, { status: 400 });
    }
    patch.heroMediaId = b.heroMediaId as string | null;
  }
  if (b.galleryIds !== undefined) {
    if (!Array.isArray(b.galleryIds) || !b.galleryIds.every((id) => typeof id === "string" && getMedia(id))) {
      return Response.json({ error: "Unknown media in gallery" }, { status: 400 });
    }
    patch.galleryIds = [...new Set(b.galleryIds as string[])].slice(0, 48);
  }
  if (b.socials !== undefined) {
    const s = b.socials as Record<string, unknown>;
    const clean = (v: unknown) => {
      const url = String(v ?? "").trim();
      return url && /^https:\/\/[^\s"<>]+$/.test(url) ? url.slice(0, 200) : "";
    };
    patch.socials = { instagram: clean(s?.instagram), facebook: clean(s?.facebook), tiktok: clean(s?.tiktok) };
  }
  if (b.reviewRating !== undefined) {
    const r = Math.round(Number(b.reviewRating) * 10) / 10;
    if (!(r >= 1 && r <= 5)) return Response.json({ error: "Rating must be between 1.0 and 5.0" }, { status: 400 });
    patch.reviewRating = r;
  }
  if (b.reviewCount !== undefined) {
    const c = Math.round(Number(b.reviewCount));
    if (!(c >= 0 && c < 1_000_000)) return Response.json({ error: "Invalid review count" }, { status: 400 });
    patch.reviewCount = c;
  }
  if (b.googlePlaceId !== undefined) {
    const id = String(b.googlePlaceId ?? "").trim();
    if (id && !/^[A-Za-z0-9_-]{10,300}$/.test(id)) return Response.json({ error: "That doesn't look like a Google place ID (starts with ChIJ…)" }, { status: 400 });
    patch.googlePlaceId = id;
  }
  return Response.json(updateSettings(patch));
}
