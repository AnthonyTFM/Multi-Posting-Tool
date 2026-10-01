"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { formatCents } from "@/lib/menu-types";
import type { Order } from "@/lib/orders";
import { RESTAURANT } from "@/lib/restaurant";

const STEPS: { key: Order["status"]; label: string; blurb: string }[] = [
  { key: "new", label: "Received", blurb: "The kitchen has your order." },
  { key: "preparing", label: "Cooking", blurb: "Your food is being made fresh." },
  { key: "ready", label: "Ready", blurb: "Come on in! It's waiting at the counter." },
  { key: "picked_up", label: "Picked up", blurb: "Enjoy! Thanks for ordering direct." },
];

function pickupHeadline(iso: string, asap: boolean) {
  const d = new Date(iso);
  const tz = RESTAURANT.timezone;
  const day = d.toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" });
  const today = new Date().toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  if (day !== today) return `Pickup ${day} at ${time}`;
  return asap ? `Ready around ${time}` : `Pickup today at ${time}`;
}

export function OrderStatusView({ initial, isNew }: { initial: Order; isNew: boolean }) {
  const [order, setOrder] = useState(initial);

  useEffect(() => {
    if (order.status === "picked_up" || order.status === "cancelled") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (r.ok) setOrder(await r.json());
      } catch {
        // offline; try again next tick
      }
    }, 15000);
    return () => clearInterval(t);
  }, [order.id, order.status]);

  const stepIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="animate-rise">
      {isNew && (
        <div className="mb-6 rounded-2xl bg-matcha/15 px-5 py-4 text-[#3f6a24]">
          <p className="font-semibold">Order placed! 🎉</p>
          <p className="text-sm">We texted a confirmation to your phone. Keep this page open to follow along.</p>
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ketchup">Order #{order.number}</p>
      <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
        {order.status === "cancelled"
          ? "Order cancelled"
          : order.status === "ready"
            ? "Your order is ready!"
            : order.status === "picked_up"
              ? "Enjoy your meal!"
              : pickupHeadline(order.pickupAt, order.asap)}
      </h1>

      {order.status !== "cancelled" ? (
        <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Order progress">
          {STEPS.map((s, i) => {
            const done = i <= stepIdx;
            return (
              <li key={s.key} className="flex flex-col gap-2" aria-current={i === stepIdx ? "step" : undefined}>
                <span className={`h-2 rounded-full ${done ? (s.key === "ready" || i < stepIdx ? "bg-matcha" : "bg-yolk") : "bg-line"}`} />
                <span className={`flex items-center gap-1 text-xs font-semibold sm:text-sm ${done ? "text-ink" : "text-ink-3"}`}>
                  {i < stepIdx && <CheckIcon width={14} height={14} className="text-matcha" />}
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-ink-2">Questions? Call us at {RESTAURANT.phoneDisplay}.</p>
      )}
      {stepIdx >= 0 && <p className="mt-3 text-ink-2">{STEPS[stepIdx].blurb}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href={RESTAURANT.mapsUrl} target="_blank" rel="noopener" className="flex items-start gap-3 rounded-2xl border border-line bg-card p-5 shadow-soft hover:border-ink">
          <PinIcon className="mt-0.5 shrink-0 text-ketchup" />
          <span>
            <span className="block font-semibold">{RESTAURANT.address.line1}</span>
            <span className="block text-sm text-ink-3">{RESTAURANT.address.city}, {RESTAURANT.address.state} · Directions →</span>
          </span>
        </a>
        <a href={`tel:${RESTAURANT.phoneE164}`} className="flex items-start gap-3 rounded-2xl border border-line bg-card p-5 shadow-soft hover:border-ink">
          <PhoneIcon className="mt-0.5 shrink-0 text-ketchup" />
          <span>
            <span className="block font-semibold">{RESTAURANT.phoneDisplay}</span>
            <span className="block text-sm text-ink-3">Need to change something? Call us.</span>
          </span>
        </a>
      </div>

      <section className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-soft">
        <h2 className="text-xl font-bold">Order for {order.customerName}</h2>
        <p className="text-sm text-ink-3">{order.source === "phone" ? "Phone order" : "Online order"} · pay at pickup</p>
        <ul className="mt-4 divide-y divide-line">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-4 py-3">
              <div>
                <p className="font-semibold">{l.quantity}× {l.name}</p>
                {l.options.length > 0 && <p className="text-xs text-ink-3">{l.options.map((o) => o.choice).join(" · ")}</p>}
                {l.notes && <p className="text-xs italic text-ink-3">“{l.notes}”</p>}
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatCents(l.unitPriceCents * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd>{formatCents(order.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">Tax</dt><dd>{formatCents(order.taxCents)}</dd></div>
          <div className="flex justify-between pt-1 text-base font-bold"><dt>Due at pickup</dt><dd>{formatCents(order.totalCents)}</dd></div>
        </dl>
      </section>

      <p className="mt-8 text-center">
        <Link href="/menu" className="font-semibold text-ketchup hover:underline">Order something else →</Link>
      </p>
    </div>
  );
}
