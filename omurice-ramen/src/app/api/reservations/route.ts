import { formatClock, formatDateLocal } from "@/lib/hours";
import { createReservation, ReservationError } from "@/lib/reservations";
import { clientIp, rateLimit } from "@/lib/util";

export async function POST(req: Request) {
  if (!rateLimit(`resv:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many requests. Please call us to book." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const r = createReservation({
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      email: String(body.email ?? ""),
      partySize: Number(body.partySize),
      date: String(body.date ?? ""),
      time: String(body.time ?? ""),
      notes: String(body.notes ?? ""),
      source: "web",
    });
    return Response.json(
      { code: r.code, name: r.name, partySize: r.partySize, dateLabel: formatDateLocal(r.localDate), timeLabel: formatClock(r.localMinutes) },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ReservationError) return Response.json({ error: e.message }, { status: 400 });
    console.error("[reservations] create failed", e);
    return Response.json({ error: "Something went wrong. Please try again or call us." }, { status: 500 });
  }
}
