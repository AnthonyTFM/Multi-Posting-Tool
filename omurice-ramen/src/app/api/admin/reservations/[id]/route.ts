import { adminGuard, readJson } from "@/lib/admin-api";
import { RESERVATION_STATUSES, type ReservationStatus, updateReservationStatus } from "@/lib/reservations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const { id } = await params;
  const body = await readJson<{ status?: string }>(req);
  if (!body?.status || !RESERVATION_STATUSES.includes(body.status as ReservationStatus)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }
  const r = updateReservationStatus(id, body.status as ReservationStatus);
  return r ? Response.json(r) : Response.json({ error: "Not found" }, { status: 404 });
}
