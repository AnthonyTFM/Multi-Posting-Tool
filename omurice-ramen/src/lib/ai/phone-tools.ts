// Tools the phone agent can call. Every input is re-validated server-side;
// errors come back as plain sentences the agent can read to the caller.

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { formatClock, formatDateLocal, formatDateTimeLocal, formatTimeLocal, pickupSlots, toMinutes, zonedParts, zonedToUtc } from "../hours.ts";
import { CartError } from "../menu.ts";
import type { CartLineInput } from "../menu-types.ts";
import { createOrder, quoteOrder } from "../orders.ts";
import { availability, createReservation, ReservationError } from "../reservations.ts";
import { getSettings } from "../settings.ts";

const itemsSchema = {
  type: "array",
  description: "Every item in the order, using ids from the menu.",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["item_id", "quantity", "options", "notes"],
    properties: {
      item_id: { type: "string", description: "Menu item id from the brackets, e.g. classic-tonkotsu" },
      quantity: { type: "integer" },
      options: {
        type: "array",
        description: "Chosen options per option group. Include every required group. Empty array if none.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["group_id", "choice_ids"],
          properties: {
            group_id: { type: "string" },
            choice_ids: { type: "array", items: { type: "string" } },
          },
        },
      },
      notes: { type: "string", description: "Special request for this item, or empty string" },
    },
  },
} as const;

export const PHONE_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "quote_order",
    description:
      "Validate and price the caller's order without placing it. Use before reading back the order and total. Returns line prices, subtotal, tax and total, or an error to fix (e.g. a missing required option or sold-out item).",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["items"],
      properties: { items: itemsSchema },
    },
  },
  {
    name: "get_pickup_times",
    description: "List available pickup times (ASAP if open, plus scheduled slots). Use when the caller wants a specific or later time.",
    strict: true,
    input_schema: { type: "object", additionalProperties: false, required: [], properties: {} },
  },
  {
    name: "place_order",
    description:
      "Place the pickup order in the kitchen system. Only call after the caller confirmed the items, total, name and pickup time out loud. Payment is at pickup.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["items", "customer_name", "customer_phone", "pickup_time", "order_notes"],
      properties: {
        items: itemsSchema,
        customer_name: { type: "string" },
        customer_phone: {
          type: "string",
          description: "10-digit callback number. Empty string to use the number they're calling from.",
        },
        pickup_time: {
          type: "string",
          description: 'Either "asap" or a value returned by get_pickup_times (format YYYY-MM-DDTHH:MM, restaurant local time).',
        },
        order_notes: { type: "string", description: "Order-level note (e.g. allergy), or empty string" },
      },
    },
  },
  {
    name: "check_reservation_availability",
    description: "Check open reservation times for a group of 6-20 on a date.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["date", "party_size"],
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        party_size: { type: "integer" },
      },
    },
  },
  {
    name: "book_reservation",
    description: "Book a table for a group of 6-20. Only call after confirming date, time, party size and name with the caller.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["name", "phone", "party_size", "date", "time", "notes"],
      properties: {
        name: { type: "string" },
        phone: { type: "string", description: "10-digit number, or empty string to use the caller's number" },
        party_size: { type: "integer" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:MM 24-hour local time, e.g. 18:30" },
        notes: { type: "string", description: "Occasion/notes, or empty string" },
      },
    },
  },
  {
    name: "transfer_to_staff",
    description:
      "Transfer the call to a team member at the restaurant. Use when the caller asks for a person/manager, has a complaint or refund question, a catering or very large order, a detailed allergy question, or anything you cannot handle.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["reason"],
      properties: { reason: { type: "string", description: "Short reason, shown to staff" } },
    },
  },
  {
    name: "end_call",
    description: "Hang up after you've said goodbye and the caller has nothing else.",
    strict: true,
    input_schema: { type: "object", additionalProperties: false, required: [], properties: {} },
  },
];

const ItemsInput = z.array(
  z.object({
    item_id: z.string(),
    quantity: z.number().int(),
    options: z.array(z.object({ group_id: z.string(), choice_ids: z.array(z.string()) })),
    notes: z.string(),
  }),
);

function toCart(items: z.infer<typeof ItemsInput>): CartLineInput[] {
  return items.map((i) => ({
    itemId: i.item_id,
    quantity: i.quantity,
    options: Object.fromEntries(i.options.map((o) => [o.group_id, o.choice_ids])),
    notes: i.notes,
  }));
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

function describeQuote(q: ReturnType<typeof quoteOrder>): string {
  const lines = q.lines.map(
    (l) => `${l.quantity} x ${l.name}${l.options.length ? ` (${l.options.map((o) => o.choice).join(", ")})` : ""}${l.notes ? ` [note: ${l.notes}]` : ""} = ${money(l.unitPriceCents * l.quantity)}`,
  );
  return `${lines.join("\n")}\nSubtotal ${money(q.subtotalCents)}, tax ${money(q.taxCents)}, total ${money(q.totalCents)} (pay at pickup).`;
}

export type ToolContext = {
  callerNumber: string;
  onOrder: (orderId: string) => void;
  onReservation: (id: string) => void;
  onTransfer: (reason: string) => void;
  onEnd: () => void;
  now?: () => Date;
};

export type ToolResult = { content: string; isError?: boolean };

export function runPhoneTool(name: string, rawInput: unknown, ctx: ToolContext): ToolResult {
  const now = ctx.now?.() ?? new Date();
  try {
    switch (name) {
      case "quote_order": {
        const { items } = z.object({ items: ItemsInput }).parse(rawInput);
        return { content: describeQuote(quoteOrder(toCart(items))) };
      }
      case "get_pickup_times": {
        const s = getSettings();
        const slots = pickupSlots(now, { prepMinutes: s.prepMinutes, closures: s.closures, paused: s.orderingPaused });
        if (!slots.length) return { content: "No pickup times are available (ordering is paused or we're closed for the next days)." };
        const list = slots.slice(0, 24).map((sl) => {
          if (sl.asap) return `asap -> ${sl.label}`;
          const z2 = zonedParts(new Date(sl.iso));
          const value = `${z2.date}T${String(Math.floor(z2.minutes / 60)).padStart(2, "0")}:${String(z2.minutes % 60).padStart(2, "0")}`;
          return `${value} -> ${sl.label}`;
        });
        return { content: `Available pickup times (value -> spoken label):\n${list.join("\n")}${slots.length > 24 ? "\n(more later times exist; ask if needed)" : ""}` };
      }
      case "place_order": {
        const input = z
          .object({ items: ItemsInput, customer_name: z.string(), customer_phone: z.string(), pickup_time: z.string(), order_notes: z.string() })
          .parse(rawInput);
        let pickupAt: string | null = null;
        if (input.pickup_time.toLowerCase() !== "asap") {
          const m = input.pickup_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
          if (!m) return { content: 'pickup_time must be "asap" or YYYY-MM-DDTHH:MM from get_pickup_times.', isError: true };
          pickupAt = zonedToUtc(m[1], toMinutes(m[2])).toISOString();
        }
        const order = createOrder(
          {
            lines: toCart(input.items),
            customerName: input.customer_name,
            customerPhone: input.customer_phone.trim() || ctx.callerNumber,
            pickupAt,
            notes: input.order_notes,
            source: "phone",
          },
          now,
        );
        ctx.onOrder(order.id);
        const when = order.asap ? `about ${formatTimeLocal(new Date(order.pickupAt))}` : formatDateTimeLocal(new Date(order.pickupAt));
        return {
          content: `Order placed. Order number ${order.number}. Pickup ${when}. Total ${money(order.totalCents)}, paid at pickup. A text confirmation was sent to the customer's phone.`,
        };
      }
      case "check_reservation_availability": {
        const { date, party_size } = z.object({ date: z.string(), party_size: z.number().int() }).parse(rawInput);
        const a = availability(date, now);
        if (!a.open) return { content: a.reason ?? "Not available that day." };
        const fits = a.slots.filter((s) => s.remaining >= party_size);
        if (!fits.length) return { content: `No open times for ${party_size} on ${formatDateLocal(date)}.` };
        return {
          content: `Open times for ${party_size} on ${formatDateLocal(date)}: ${fits.map((s) => `${s.label} (time value ${String(Math.floor(s.minutes / 60)).padStart(2, "0")}:${String(s.minutes % 60).padStart(2, "0")})`).join(", ")}.`,
        };
      }
      case "book_reservation": {
        const input = z
          .object({ name: z.string(), phone: z.string(), party_size: z.number().int(), date: z.string(), time: z.string(), notes: z.string() })
          .parse(rawInput);
        const r = createReservation(
          {
            name: input.name,
            phone: input.phone.trim() || ctx.callerNumber,
            partySize: input.party_size,
            date: input.date,
            time: input.time,
            notes: input.notes,
            source: "phone",
          },
          now,
        );
        ctx.onReservation(r.id);
        return {
          content: `Booked: table for ${r.partySize} on ${formatDateLocal(r.localDate)} at ${formatClock(r.localMinutes)}. Confirmation code ${r.code.split("").join(" ")}. A text confirmation was sent.`,
        };
      }
      case "transfer_to_staff": {
        const { reason } = z.object({ reason: z.string() }).parse(rawInput);
        ctx.onTransfer(reason);
        return { content: "Transfer is queued. Say one short sentence such as 'One moment, I'm connecting you to our team.' and nothing else." };
      }
      case "end_call": {
        ctx.onEnd();
        return { content: "Call will end after your goodbye. If you haven't said goodbye yet, say a short one now." };
      }
      default:
        return { content: `Unknown tool ${name}`, isError: true };
    }
  } catch (e) {
    if (e instanceof CartError || e instanceof ReservationError) return { content: e.message, isError: true };
    if (e instanceof z.ZodError) return { content: `Invalid input: ${e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, isError: true };
    console.error(`[phone-tool] ${name} failed`, e);
    return { content: "That didn't work because of a system error. Offer to transfer the caller to a team member.", isError: true };
  }
}
