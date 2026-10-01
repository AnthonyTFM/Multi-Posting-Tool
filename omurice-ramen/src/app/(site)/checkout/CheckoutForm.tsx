"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { QtyStepper } from "@/components/CartDrawer";
import { formatCents } from "@/lib/menu-types";

type Slot = { iso: string; label: string; asap: boolean };
type Quote = { subtotalCents: number; taxCents: number; totalCents: number };

const input = "mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-4 text-base outline-none transition focus:border-ink";

export function CheckoutForm() {
  const { lines, setQty, clear } = useCart();
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [pickup, setPickup] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("omurice.customer") ?? "{}");
      if (saved.name) setName(saved.name);
      if (saved.phone) setPhone(saved.phone);
    } catch {
      // ignore
    }
    fetch("/api/pickup-slots")
      .then((r) => r.json())
      .then((d: { slots: Slot[] }) => {
        setSlots(d.slots);
        if (d.slots[0]) setPickup(d.slots[0].asap ? "asap" : d.slots[0].iso);
      })
      .catch(() => setSlots([]));
  }, []);

  const payload = lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, options: l.options, notes: l.notes }));
  const payloadKey = JSON.stringify(payload);

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    const ctl = new AbortController();
    fetch("/api/orders/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: payloadKey, signal: ctl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setQuote(d);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "Couldn't price your order.");
      });
    return () => ctl.abort();
  }, [payloadKey, lines.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: payload,
          customerName: name,
          customerPhone: phone,
          pickupAt: pickup === "asap" ? null : pickup,
          notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't place your order.");
      try {
        localStorage.setItem("omurice.customer", JSON.stringify({ name, phone }));
      } catch {
        // ignore
      }
      clear();
      router.push(`/order/${d.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't place your order.");
      setSubmitting(false);
    }
  }

  if (!lines.length) {
    return (
      <div className="mt-10 rounded-3xl border border-line bg-card p-10 text-center shadow-soft">
        <p className="text-lg font-semibold">Your cart is empty.</p>
        <Link href="/menu" className="mt-4 inline-flex rounded-full bg-seal px-6 py-3 font-semibold text-white hover:bg-seal-2">
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <fieldset className="rounded-3xl border border-line bg-card p-6 shadow-soft">
          <legend className="sr-only">Pickup time</legend>
          <h2 className="text-xl font-bold">1. Pickup time</h2>
          {slots === null ? (
            <p className="mt-3 text-sm text-ink-3">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="mt-3 text-sm text-seal">Online ordering isn&apos;t available right now. Please call us.</p>
          ) : (
            <label className="mt-3 block">
              <span className="text-sm font-medium text-ink-2">When would you like it?</span>
              <select value={pickup} onChange={(e) => setPickup(e.target.value)} className={input} required>
                {slots.map((s) => (
                  <option key={s.iso} value={s.asap ? "asap" : s.iso}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        <fieldset className="rounded-3xl border border-line bg-card p-6 shadow-soft">
          <legend className="sr-only">Your details</legend>
          <h2 className="text-xl font-bold">2. Your details</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink-2">Name for the order</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} autoComplete="given-name" required maxLength={60} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink-2">Mobile number</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} type="tel" inputMode="tel" autoComplete="tel" placeholder="(269) 555-0123" required />
            </label>
          </div>
          <p className="mt-2 text-xs text-ink-3">We&apos;ll text you a confirmation and when your order is ready.</p>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-ink-2">Notes for the kitchen (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} className={`${input} h-auto py-3`} placeholder="Allergies, extra napkins, utensils…" />
          </label>
        </fieldset>
      </div>

      <aside className="h-fit rounded-3xl border border-line bg-card p-6 shadow-soft lg:sticky lg:top-24">
        <h2 className="text-xl font-bold">Your order</h2>
        <ul className="mt-4 divide-y divide-line">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.name}</p>
                {l.optionLabels.length > 0 && <p className="text-xs text-ink-3">{l.optionLabels.join(" · ")}</p>}
                {l.notes && <p className="text-xs italic text-ink-3">“{l.notes}”</p>}
                <div className="mt-2">
                  <QtyStepper value={l.quantity} onChange={(v) => setQty(l.key, v)} label={l.name} />
                </div>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatCents(l.unitPriceCents * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-2">Subtotal</dt><dd className="tabular-nums">{quote ? formatCents(quote.subtotalCents) : "…"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-2">Tax</dt><dd className="tabular-nums">{quote ? formatCents(quote.taxCents) : "…"}</dd></div>
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total due at pickup</dt><dd className="tabular-nums">{quote ? formatCents(quote.totalCents) : "…"}</dd></div>
        </dl>
        {error && <p role="alert" className="mt-4 rounded-xl bg-seal/10 px-4 py-3 text-sm font-medium text-seal-2">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !quote || !slots?.length}
          className="mt-5 flex h-14 w-full items-center justify-center rounded-full bg-seal text-lg font-semibold text-white transition hover:bg-seal-2 disabled:opacity-50"
        >
          {submitting ? "Placing order…" : `Place order${quote ? ` · ${formatCents(quote.totalCents)}` : ""}`}
        </button>
        <p className="mt-3 text-center text-xs text-ink-3">No payment now. Pay with cash or card when you pick up.</p>
        <p className="mt-2 text-center text-[11px] leading-4 text-ink-3">
          By placing an order you agree to receive order-status texts at this number. Msg &amp; data rates may apply. Reply STOP to opt out.
        </p>
      </aside>
    </form>
  );
}
