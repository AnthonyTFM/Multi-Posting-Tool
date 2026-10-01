import { adminGuard, readJson } from "@/lib/admin-api";
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
  return Response.json(updateSettings(patch));
}
