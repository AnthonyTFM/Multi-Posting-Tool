import { adminGuard } from "@/lib/admin-api";
import { addDays, zonedParts } from "@/lib/hours";
import { listReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? addDays(zonedParts().date, -1);
  return Response.json({ reservations: listReservations(from, 30) });
}
