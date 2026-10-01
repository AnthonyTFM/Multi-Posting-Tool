process.env.DATABASE_PATH = ":memory:";

import assert from "node:assert/strict";
import { test } from "node:test";
import { isOpenAt, openStatus, pickupSlots, zonedParts, zonedToUtc } from "../src/lib/hours.ts";
import { CartError, menuForPrompt, priceCart, updateItem } from "../src/lib/menu.ts";
import { createOrder, getOrder, quoteOrder, updateOrderStatus } from "../src/lib/orders.ts";
import { availability, createReservation, ReservationError } from "../src/lib/reservations.ts";
import { updateSettings } from "../src/lib/settings.ts";

// Tue Oct 6 2026, 6:00 PM Detroit (EDT, UTC-4)
const TUE_6PM = zonedToUtc("2026-10-06", 18 * 60);

test("timezone conversion round-trips", () => {
  assert.equal(TUE_6PM.toISOString(), "2026-10-06T22:00:00.000Z");
  const z = zonedParts(TUE_6PM);
  assert.deepEqual(z, { date: "2026-10-06", minutes: 1080, dow: 2 });
  // Winter (EST, UTC-5)
  assert.equal(zonedToUtc("2026-12-01", 12 * 60).toISOString(), "2026-12-01T17:00:00.000Z");
});

test("open hours", () => {
  assert.equal(isOpenAt(TUE_6PM), true);
  assert.equal(isOpenAt(zonedToUtc("2026-10-06", 10 * 60 + 59)), false);
  assert.equal(isOpenAt(zonedToUtc("2026-10-06", 21 * 60 + 30)), false); // Tue closes 9:30
  assert.equal(isOpenAt(zonedToUtc("2026-10-09", 22 * 60)), true); // Fri till 10:30
  assert.equal(isOpenAt(zonedToUtc("2026-10-04", 11 * 60 + 30)), false); // Sun opens noon
  assert.match(openStatus(TUE_6PM).label, /until 9:30 PM/);
  assert.equal(isOpenAt(TUE_6PM, ["2026-10-06"]), false); // holiday closure
});

test("pickup slots offer ASAP while open and scheduled slots", () => {
  const slots = pickupSlots(TUE_6PM, { prepMinutes: 20 });
  assert.equal(slots[0].asap, true);
  assert.ok(slots.some((s) => s.label.startsWith("Today 6:30")));
  assert.ok(slots.some((s) => s.label.startsWith("Tomorrow")));
  const late = pickupSlots(zonedToUtc("2026-10-06", 21 * 60 + 20), { prepMinutes: 20 });
  assert.equal(late.some((s) => s.asap), false); // past last call
  assert.equal(pickupSlots(TUE_6PM, { prepMinutes: 20, paused: true }).length, 0);
});

test("cart pricing validates options server-side", () => {
  const q = priceCart([
    { itemId: "classic-tonkotsu", quantity: 2, options: { "ramen-addons": ["egg", "chashu"] } },
    { itemId: "classic-milk-tea", quantity: 1, options: { sugar: ["50"], ice: ["less"], toppings: ["tapioca"] } },
  ]);
  assert.equal(q.lines[0].unitPriceCents, 1699 + 150 + 300);
  assert.equal(q.subtotalCents, (1699 + 450) * 2 + 599 + 75);
  assert.throws(() => priceCart([{ itemId: "classic-milk-tea", quantity: 1 }]), CartError); // sugar required
  assert.throws(() => priceCart([{ itemId: "nope", quantity: 1 }]), CartError);
  assert.throws(
    () => priceCart([{ itemId: "classic-tonkotsu", quantity: 1, options: { "ramen-addons": ["gold-flakes"] } }]),
    CartError,
  );
  const total = quoteOrder([{ itemId: "popcorn-chicken", quantity: 1 }]);
  assert.equal(total.taxCents, Math.round(849 * 0.06));
});

test("sold-out items are rejected and flagged for the AI", () => {
  updateItem("takoyaki", { soldOut: true });
  assert.throws(() => priceCart([{ itemId: "takoyaki", quantity: 1 }]), /sold out/);
  assert.match(menuForPrompt(), /\[takoyaki\].*SOLD OUT/);
  updateItem("takoyaki", { soldOut: false });
});

test("orders: ASAP while open, rejected while closed, status flow", () => {
  const o = createOrder(
    { lines: [{ itemId: "popcorn-chicken", quantity: 2 }], customerName: "Ana", customerPhone: "269-555-0100", source: "web" },
    TUE_6PM,
  );
  assert.equal(o.number, 1001);
  assert.equal(o.asap, true);
  assert.equal(o.customerPhone, "+12695550100");
  assert.equal(o.totalCents, 1698 + Math.round(1698 * 0.06));
  assert.equal(updateOrderStatus(o.id, "ready")?.status, "ready");
  assert.equal(getOrder(o.id)?.status, "ready");

  const closed = zonedToUtc("2026-10-06", 23 * 60);
  assert.throws(
    () => createOrder({ lines: [{ itemId: "popcorn-chicken", quantity: 1 }], customerName: "B", customerPhone: "2695550101", source: "web" }, closed),
    /closed/,
  );
  // Scheduled for tomorrow noon works while closed
  const sched = createOrder(
    {
      lines: [{ itemId: "popcorn-chicken", quantity: 1 }],
      customerName: "B",
      customerPhone: "2695550101",
      source: "phone",
      pickupAt: zonedToUtc("2026-10-07", 12 * 60).toISOString(),
    },
    closed,
  );
  assert.equal(sched.asap, false);
  assert.throws(
    () => createOrder({ lines: [{ itemId: "popcorn-chicken", quantity: 1 }], customerName: "", customerPhone: "2695550101", source: "web" }, TUE_6PM),
    /name/,
  );
  updateSettings({ orderingPaused: true });
  assert.throws(
    () => createOrder({ lines: [{ itemId: "popcorn-chicken", quantity: 1 }], customerName: "C", customerPhone: "2695550102", source: "web" }, TUE_6PM),
    /paused/,
  );
  updateSettings({ orderingPaused: false });
});

test("reservations: 6+ only, capacity per slot", () => {
  const base = { name: "Lee", phone: "2695550199", date: "2026-10-08", time: "18:00", source: "web" as const };
  assert.throws(() => createReservation({ ...base, partySize: 4 }, TUE_6PM), /6 or more/);
  assert.throws(() => createReservation({ ...base, partySize: 25 }, TUE_6PM), /call us/);
  const r = createReservation({ ...base, partySize: 12 }, TUE_6PM);
  assert.equal(r.status, "confirmed");
  assert.equal(r.localMinutes, 18 * 60);
  createReservation({ ...base, partySize: 8 }, TUE_6PM);
  assert.throws(() => createReservation({ ...base, partySize: 6 }, TUE_6PM), (e: unknown) => {
    assert.ok(e instanceof ReservationError);
    assert.match((e as Error).message, /full/);
    return true;
  });
  const a = availability("2026-10-08", TUE_6PM);
  assert.equal(a.slots.find((s) => s.minutes === 18 * 60)?.remaining, 0);
  assert.equal(a.slots.at(-1)?.label, "8:30 PM"); // Thu close 9:30, last seating 1h before
  assert.equal(availability("2026-10-06", TUE_6PM).slots[0].label, "8 PM"); // 2h lead time
});
