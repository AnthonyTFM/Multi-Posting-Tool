import { CartError } from "@/lib/menu";
import { createOrder, recentOrderCount } from "@/lib/orders";
import { RESTAURANT } from "@/lib/restaurant";
import { clientIp, normalizePhone, rateLimit } from "@/lib/util";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`order:${ip}`, 5, 10 * 60 * 1000)) {
    return Response.json({ error: `Too many orders from this device. Please call ${RESTAURANT.phoneDisplay}.` }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const phone = normalizePhone(String(body.customerPhone ?? ""));
  // Pay-at-pickup guard: cap open orders per phone/IP in a short window.
  if (phone && recentOrderCount({ phone, ip, minutes: 30 }) >= 3) {
    return Response.json({ error: `You have several open orders already. Please call ${RESTAURANT.phoneDisplay} to add more.` }, { status: 429 });
  }
  try {
    const order = createOrder({
      lines: Array.isArray(body.lines) ? body.lines : [],
      customerName: String(body.customerName ?? ""),
      customerPhone: String(body.customerPhone ?? ""),
      pickupAt: typeof body.pickupAt === "string" ? body.pickupAt : null,
      notes: String(body.notes ?? ""),
      source: "web",
      clientIp: ip,
    });
    return Response.json({ id: order.id, number: order.number }, { status: 201 });
  } catch (e) {
    if (e instanceof CartError) return Response.json({ error: e.message }, { status: 400 });
    console.error("[orders] create failed", e);
    return Response.json({ error: "Something went wrong placing your order. Please try again or call us." }, { status: 500 });
  }
}
