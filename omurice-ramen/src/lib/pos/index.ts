// Sends new orders to the restaurant's POS.
//
// Honor POS has no public ordering API. Its documented integration for outside
// order channels is Deliverect (two-way: orders in, menu sync out). Until that is
// set up, POS_PROVIDER=none keeps orders on the kitchen dashboard only.
//
//   POS_PROVIDER=none        dashboard only (default)
//   POS_PROVIDER=deliverect  Deliverect Channel API -> Honor POS
//   POS_PROVIDER=webhook     POST signed JSON to POS_WEBHOOK_URL (Zapier/Make/custom bridge)

import { db, nowIso } from "../db.ts";
import type { Order } from "../orders.ts";
import { pushToDeliverect } from "./deliverect.ts";
import { pushToWebhook } from "./webhook.ts";

export function posProvider(): "none" | "deliverect" | "webhook" {
  const p = (process.env.POS_PROVIDER ?? "none").toLowerCase();
  return p === "deliverect" || p === "webhook" ? p : "none";
}

export async function pushOrderToPos(order: Order): Promise<void> {
  const provider = posProvider();
  if (provider === "none") return;
  const set = db().prepare("UPDATE orders SET pos_status = ?, pos_error = ?, updated_at = ? WHERE id = ?");
  try {
    if (provider === "deliverect") await pushToDeliverect(order);
    else await pushToWebhook(order);
    set.run("sent", null, nowIso(), order.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pos] push failed for order #${order.number}:`, msg);
    set.run("failed", msg.slice(0, 500), nowIso(), order.id);
  }
}
