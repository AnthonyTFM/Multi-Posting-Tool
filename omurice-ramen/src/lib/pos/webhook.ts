import crypto from "node:crypto";
import type { Order } from "../orders.ts";

/** POST the order as JSON, signed with HMAC-SHA256 in X-Omurice-Signature. */
export async function pushToWebhook(order: Order): Promise<void> {
  const url = process.env.POS_WEBHOOK_URL;
  if (!url) throw new Error("POS_WEBHOOK_URL not set");
  const body = JSON.stringify({ type: "order.created", order });
  const sig = crypto
    .createHmac("sha256", process.env.POS_WEBHOOK_SECRET ?? "")
    .update(body)
    .digest("hex");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Omurice-Signature": sig },
    body,
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
