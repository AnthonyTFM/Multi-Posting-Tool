"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatCents } from "@/lib/menu-types";
import { useCart } from "./CartProvider";
import { BagIcon, CloseIcon, MinusIcon, PlusIcon } from "./icons";

export function QtyStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-card">
      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-rice-2" onClick={() => onChange(value - 1)} aria-label={`Decrease ${label}`}>
        <MinusIcon width={14} height={14} />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-rice-2" onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
        <PlusIcon width={14} height={14} />
      </button>
    </div>
  );
}

export function CartDrawer() {
  const { lines, open, setOpen, setQty, subtotalCents, count } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your cart">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label="Close cart" tabIndex={-1} />
      <aside className="animate-rise absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-rice shadow-lift sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-xl font-bold">Your order</h2>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-rice-2" aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-yolk-soft text-ketchup">
              <BagIcon width={26} height={26} />
            </span>
            <p className="font-semibold">Your cart is empty</p>
            <p className="text-sm text-ink-3">Add a bowl of ramen or a fluffy omurice to get started.</p>
            <Link href="/menu" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-ketchup px-5 py-2.5 text-sm font-semibold text-white hover:bg-ketchup-2">
              Browse the menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{l.name}</p>
                    {l.optionLabels.length > 0 && <p className="mt-0.5 text-xs leading-5 text-ink-3">{l.optionLabels.join(" · ")}</p>}
                    {l.notes && <p className="mt-0.5 text-xs italic text-ink-3">“{l.notes}”</p>}
                    <div className="mt-2">
                      <QtyStepper value={l.quantity} onChange={(v) => setQty(l.key, v)} label={l.name} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatCents(l.unitPriceCents * l.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">Subtotal ({count} item{count === 1 ? "" : "s"})</span>
                <span className="font-semibold tabular-nums">{formatCents(subtotalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-ink-3">Tax calculated at checkout. Pay when you pick up.</p>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-ketchup text-base font-semibold text-white transition hover:bg-ketchup-2"
              >
                Checkout · {formatCents(subtotalCents)}
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
