import { db, nowIso, tx } from "./db.ts";
import { formatTimeLocal, isValidPickupTime, isOpenAt, zonedParts, formatDateTimeLocal } from "./hours.ts";
import { CartError, priceCart } from "./menu.ts";
import type { CartLineInput, OrderLine } from "./menu-types.ts";
import { pushOrderToPos } from "./pos/index.ts";
import { RESTAURANT } from "./restaurant.ts";
import { getSettings } from "./settings.ts";
import { publicBaseUrl, sendSmsQuietly } from "./twilio.ts";
import { cleanText, normalizePhone, randomId } from "./util.ts";

export type OrderStatus = "new" | "preparing" | "ready" | "picked_up" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "picked_up", "cancelled"];

export type Order = {
  id: string;
  number: number;
  source: "web" | "phone";
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  pickupAt: string;
  asap: boolean;
  notes: string;
  lines: OrderLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  posStatus: "none" | "sent" | "failed";
  posError: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  number: number;
  source: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  pickup_at: string;
  asap: number;
  notes: string;
  lines: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  pos_status: string;
  pos_error: string | null;
  created_at: string;
  updated_at: string;
};

function toOrder(r: Row): Order {
  return {
    id: r.id,
    number: r.number,
    source: r.source as Order["source"],
    status: r.status as OrderStatus,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    pickupAt: r.pickup_at,
    asap: !!r.asap,
    notes: r.notes,
    lines: JSON.parse(r.lines),
    subtotalCents: r.subtotal_cents,
    taxCents: r.tax_cents,
    totalCents: r.total_cents,
    posStatus: r.pos_status as Order["posStatus"],
    posError: r.pos_error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function taxFor(subtotalCents: number): number {
  return Math.round(subtotalCents * RESTAURANT.ordering.taxRate);
}

/** Price a cart without saving it (used for the checkout summary and the phone agent's read-back). */
export function quoteOrder(lines: CartLineInput[]) {
  const priced = priceCart(lines);
  const taxCents = taxFor(priced.subtotalCents);
  return { ...priced, taxCents, totalCents: priced.subtotalCents + taxCents };
}

export type CreateOrderInput = {
  lines: CartLineInput[];
  customerName: string;
  customerPhone: string;
  pickupAt?: string | null; // ISO; omitted/null = ASAP
  notes?: string;
  source: "web" | "phone";
  clientIp?: string;
};

export function createOrder(input: CreateOrderInput, now = new Date()): Order {
  const settings = getSettings();
  if (settings.orderingPaused) throw new CartError("Online ordering is paused right now. Please call the restaurant.");

  const name = cleanText(input.customerName, 60);
  if (name.length < 1) throw new CartError("Please add a name for the order.");
  const phone = normalizePhone(input.customerPhone);
  if (!phone) throw new CartError("Please add a valid 10-digit phone number.");

  const quote = quoteOrder(input.lines);
  if (quote.totalCents > RESTAURANT.ordering.maxUnpaidOrderCents) {
    throw new CartError(
      `Orders over $${RESTAURANT.ordering.maxUnpaidOrderCents / 100} need to be placed by phone with our staff. Please call ${RESTAURANT.phoneDisplay}.`,
    );
  }

  let pickupAt: Date;
  let asap = false;
  if (!input.pickupAt) {
    if (!isOpenAt(now, settings.closures)) {
      throw new CartError("We're closed right now. Please choose a pickup time when we're open.");
    }
    asap = true;
    pickupAt = new Date(now.getTime() + settings.prepMinutes * 60000);
  } else {
    pickupAt = new Date(input.pickupAt);
    if (Number.isNaN(pickupAt.getTime())) throw new CartError("Invalid pickup time.");
  }
  if (!isValidPickupTime(pickupAt, now, { prepMinutes: settings.prepMinutes, closures: settings.closures })) {
    throw new CartError("That pickup time isn't available. Please pick a time during open hours.");
  }

  const order = tx(() => {
    const next = db().prepare("SELECT COALESCE(MAX(number), 1000) + 1 AS n FROM orders").get() as { n: number };
    const id = randomId();
    const ts = nowIso();
    db()
      .prepare(
        `INSERT INTO orders (id, number, source, status, customer_name, customer_phone, pickup_at, asap, notes, lines,
          subtotal_cents, tax_cents, total_cents, pos_status, client_ip, created_at, updated_at)
         VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', ?, ?, ?)`,
      )
      .run(
        id,
        next.n,
        input.source,
        name,
        phone,
        pickupAt.toISOString(),
        asap ? 1 : 0,
        cleanText(input.notes, 300),
        JSON.stringify(quote.lines),
        quote.subtotalCents,
        quote.taxCents,
        quote.totalCents,
        input.clientIp ?? null,
        ts,
        ts,
      );
    return getOrder(id)!;
  });

  void pushOrderToPos(order);
  const when = isSameLocalDay(pickupAt, now) ? formatTimeLocal(pickupAt) : formatDateTimeLocal(pickupAt);
  sendSmsQuietly(
    order.customerPhone,
    `${RESTAURANT.shortName}: order #${order.number} received! Pickup ${asap ? "around " : "at "}${when}. Total $${(order.totalCents / 100).toFixed(2)}, pay at pickup. Track it: ${publicBaseUrl()}/order/${order.id}`,
  );
  return order;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return zonedParts(a).date === zonedParts(b).date;
}

/** Customer-facing view: hides POS internals and most of the phone number. */
export function publicOrder(o: Order): Order {
  return { ...o, customerPhone: `•••-${o.customerPhone.slice(-4)}`, posStatus: "none", posError: null };
}

export function getOrder(id: string): Order | null {
  const row = db().prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
  return row ? toOrder(row) : null;
}

/** Orders for the kitchen: anything active, plus everything from the last `hours`. */
export function listOrders(opts: { hours?: number } = {}): Order[] {
  const since = new Date(Date.now() - (opts.hours ?? 24) * 3600 * 1000).toISOString();
  const rows = db()
    .prepare(
      `SELECT * FROM orders
       WHERE created_at >= ? OR status IN ('new', 'preparing', 'ready')
       ORDER BY pickup_at ASC`,
    )
    .all(since) as Row[];
  return rows.map(toOrder);
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | null {
  if (!ORDER_STATUSES.includes(status)) throw new Error("bad status");
  const before = getOrder(id);
  if (!before) return null;
  db().prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  const after = getOrder(id)!;
  if (status === "ready" && before.status !== "ready") {
    sendSmsQuietly(
      after.customerPhone,
      `${RESTAURANT.shortName}: order #${after.number} is READY for pickup at ${RESTAURANT.address.line1}. Total $${(after.totalCents / 100).toFixed(2)}. See you soon!`,
    );
  }
  if (status === "cancelled" && before.status !== "cancelled") {
    sendSmsQuietly(
      after.customerPhone,
      `${RESTAURANT.shortName}: order #${after.number} was cancelled. Questions? Call ${RESTAURANT.phoneDisplay}.`,
    );
  }
  return after;
}

export function retryPos(id: string): Order | null {
  const o = getOrder(id);
  if (o) void pushOrderToPos(o);
  return o;
}

/** Recent orders from the same phone or IP, to throttle prank/unpaid spam. */
export function recentOrderCount(opts: { phone?: string; ip?: string; minutes: number }): number {
  const since = new Date(Date.now() - opts.minutes * 60000).toISOString();
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM orders WHERE created_at >= ? AND status != 'cancelled'
       AND (customer_phone = ? OR client_ip = ?)`,
    )
    .get(since, opts.phone ?? "-", opts.ip ?? "-") as { n: number };
  return row.n;
}
