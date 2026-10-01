// Deliverect "Channel API" adapter: our website/phone agent acts as a custom
// ordering channel, Deliverect forwards orders into Honor POS.
//
// Deliverect provisions the channel name, channel link id and OAuth client during
// onboarding and gives a staging environment. Confirm the payload below against
// their Channel API docs in staging before switching POS_PROVIDER=deliverect.
// Item PLUs must match the PLUs in Honor POS (set them in /admin/menu).

import type { Order } from "../orders.ts";

let cached: { token: string; expiresAt: number } | null = null;

function base(): string {
  return (process.env.DELIVERECT_API_BASE ?? "https://api.deliverect.com").replace(/\/$/, "");
}

async function token(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${base()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.DELIVERECT_CLIENT_ID,
      client_secret: process.env.DELIVERECT_CLIENT_SECRET,
      audience: base(),
      grant_type: "token",
    }),
  });
  if (!res.ok) throw new Error(`Deliverect auth ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_at?: number; expires_in?: number };
  const expiresAt = body.expires_at ? body.expires_at * 1000 : Date.now() + (body.expires_in ?? 3600) * 1000;
  cached = { token: body.access_token, expiresAt };
  return body.access_token;
}

export function deliverectPayload(order: Order) {
  const missing = order.lines.filter((l) => !l.posPlu).map((l) => l.name);
  if (missing.length) throw new Error(`Missing POS PLU for: ${missing.join(", ")}`);
  return {
    channelOrderId: order.id,
    channelOrderDisplayId: String(order.number),
    orderType: 1, // pickup
    decimalDigits: 2,
    pickupTime: order.pickupAt,
    estimatedPickupTime: order.pickupAt,
    orderIsAlreadyPaid: false,
    payment: { amount: order.totalCents, type: Number(process.env.DELIVERECT_PAYMENT_TYPE ?? 1) },
    customer: { name: order.customerName, phoneNumber: order.customerPhone },
    note: [order.source === "phone" ? "AI PHONE ORDER" : "WEB ORDER", "PAY AT PICKUP", order.notes].filter(Boolean).join(" · "),
    items: order.lines.map((l) => ({
      plu: l.posPlu,
      name: l.name,
      price: l.unitPriceCents - l.options.reduce((s, o) => s + o.priceCents, 0),
      quantity: l.quantity,
      remark: l.notes,
      subItems: l.options.map((o) => ({
        plu: `${l.posPlu}-${o.groupId}-${o.choiceId}`,
        name: `${o.group}: ${o.choice}`,
        price: o.priceCents,
        quantity: 1,
      })),
    })),
    taxes: [{ taxClassId: 0, name: "Sales tax", total: order.taxCents }],
  };
}

export async function pushToDeliverect(order: Order): Promise<void> {
  const channel = process.env.DELIVERECT_CHANNEL_NAME;
  const link = process.env.DELIVERECT_CHANNEL_LINK_ID;
  if (!channel || !link) throw new Error("DELIVERECT_CHANNEL_NAME / DELIVERECT_CHANNEL_LINK_ID not set");
  const res = await fetch(`${base()}/${channel}/order/${link}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(deliverectPayload(order)),
  });
  if (!res.ok) throw new Error(`Deliverect order ${res.status}: ${await res.text()}`);
}
