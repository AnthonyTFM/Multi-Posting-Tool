import { pickupSlots } from "@/lib/hours";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export function GET() {
  const s = getSettings();
  return Response.json({ slots: pickupSlots(new Date(), { prepMinutes: s.prepMinutes, closures: s.closures, paused: s.orderingPaused }) });
}
