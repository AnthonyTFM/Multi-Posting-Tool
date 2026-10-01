"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Art, formatCents, type MenuItem } from "@/lib/menu-types";
import { QtyStepper } from "./CartDrawer";
import { useCart } from "./CartProvider";
import { CloseIcon } from "./icons";
import { ItemVisual } from "./ItemArt";

export function ItemDialog({ item, art, onClose }: { item: MenuItem; art: Art; onClose: () => void }) {
  const { add, setOpen } = useCart();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(item.optionGroups.map((g) => [g.id, g.min === 1 && g.max === 1 ? [g.choices[0].id] : []])),
  );
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const unit = useMemo(() => {
    let p = item.priceCents;
    for (const g of item.optionGroups) for (const id of picked[g.id] ?? []) p += g.choices.find((c) => c.id === id)?.priceCents ?? 0;
    return p;
  }, [item, picked]);

  function toggle(groupId: string, choiceId: string, single: boolean, max: number) {
    setError("");
    setPicked((prev) => {
      const cur = prev[groupId] ?? [];
      if (single) return { ...prev, [groupId]: [choiceId] };
      if (cur.includes(choiceId)) return { ...prev, [groupId]: cur.filter((c) => c !== choiceId) };
      if (cur.length >= max) return prev;
      return { ...prev, [groupId]: [...cur, choiceId] };
    });
  }

  function submit() {
    for (const g of item.optionGroups) {
      if ((picked[g.id]?.length ?? 0) < g.min) {
        setError(`Please choose ${g.name.toLowerCase()}.`);
        return;
      }
    }
    const optionLabels = item.optionGroups.flatMap((g) =>
      (picked[g.id] ?? []).map((id) => g.choices.find((c) => c.id === id)?.name ?? id),
    );
    add({
      itemId: item.id,
      name: item.name,
      quantity: qty,
      options: picked,
      notes: notes.trim(),
      unitPriceCents: unit,
      optionLabels,
    });
    onClose();
    setOpen(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="item-dialog-title">
      <button type="button" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <div className="animate-rise relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-rice shadow-lift sm:rounded-3xl">
        <button ref={closeRef} type="button" onClick={onClose} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-rice/90 shadow-soft hover:bg-rice" aria-label="Close">
          <CloseIcon />
        </button>
        <div className="overflow-y-auto">
          <div className="aspect-[16/9] w-full">
            <ItemVisual art={art} image={item.image} name={item.name} />
          </div>
          <div className="px-5 pb-4 pt-5">
            <h2 id="item-dialog-title" className="text-2xl font-bold">{item.name}</h2>
            <p className="mt-1 font-semibold text-ketchup">{formatCents(item.priceCents)}</p>
            {item.description && <p className="mt-3 text-sm leading-6 text-ink-2">{item.description}</p>}

            {item.optionGroups.map((g) => {
              const single = g.max === 1;
              return (
                <fieldset key={g.id} className="mt-6">
                  <legend className="flex w-full items-baseline justify-between">
                    <span className="font-semibold">{g.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${g.min > 0 ? "bg-yolk-soft text-ink" : "bg-rice-2 text-ink-3"}`}>
                      {g.min > 0 ? "Required" : `Optional${g.max > 1 ? ` · up to ${g.max}` : ""}`}
                    </span>
                  </legend>
                  <div className="mt-2 grid gap-2">
                    {g.choices.map((c) => {
                      const on = (picked[g.id] ?? []).includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${on ? "border-ink bg-card" : "border-line bg-card/60 hover:border-ink-3"}`}
                        >
                          <input
                            type={single ? "radio" : "checkbox"}
                            name={g.id}
                            checked={on}
                            onChange={() => toggle(g.id, c.id, single, g.max)}
                            className="h-4 w-4 accent-[#d23a2a]"
                          />
                          <span className="flex-1">{c.name}</span>
                          {c.priceCents > 0 && <span className="text-ink-3">+{formatCents(c.priceCents)}</span>}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}

            <label className="mt-6 block">
              <span className="font-semibold">Special requests</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="e.g. no green onions"
                className="mt-2 w-full resize-none rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(30, v)))} label="quantity" />
          <button type="button" onClick={submit} className="flex h-12 flex-1 items-center justify-center rounded-full bg-ketchup text-base font-semibold text-white transition hover:bg-ketchup-2">
            Add · {formatCents(unit * qty)}
          </button>
        </div>
        {error && <p role="alert" className="bg-ketchup px-5 py-2 text-center text-sm font-medium text-white">{error}</p>}
      </div>
    </div>
  );
}
