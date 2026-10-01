"use client";

import { useEffect, useState } from "react";
import { type Art, formatCents, type Menu, type MenuItem } from "@/lib/menu-types";
import { useCart } from "./CartProvider";
import { PlusIcon } from "./icons";
import { ItemDialog } from "./ItemDialog";
import { ItemVisual } from "./ItemArt";

type Selected = { item: MenuItem; art: Art } | null;

const DIET_BADGES = [
  { tag: "vegan", label: "Vegan" },
  { tag: "vegetarian", label: "Vegetarian" },
  { tag: "gluten-free-friendly", label: "GF friendly" },
  { tag: "caffeine-free", label: "Caffeine-free" },
];

export function ItemCard({ item, art, onSelect, orderingOpen }: { item: MenuItem; art: Art; onSelect: () => void; orderingOpen: boolean }) {
  const disabled = item.soldOut || !orderingOpen;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="group flex w-full gap-4 rounded-2xl border border-line bg-card p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-soft sm:p-3.5"
      aria-label={`${item.name}, ${formatCents(item.priceCents)}${item.soldOut ? ", sold out" : ""}`}
    >
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-[1.05rem] font-bold leading-snug">{item.name}</h3>
          {item.popular && !item.soldOut && (
            <span className="rounded-full bg-yolk-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Popular</span>
          )}
          {item.tags.includes("spicy") && <span className="text-xs" title="Spicy" aria-label="Spicy">🌶️</span>}
          {DIET_BADGES.filter((b) => item.tags.includes(b.tag)).map((b) => (
            <span key={b.tag} className="rounded-full bg-matcha/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3f6a24]">{b.label}</span>
          ))}
          {item.soldOut && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rice">Sold out</span>}
        </div>
        {item.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-3">{item.description}</p>}
        <p className="mt-2 font-semibold text-ink">{formatCents(item.priceCents)}</p>
      </div>
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-32">
        <ItemVisual art={art} image={item.image} name={item.name} className="transition duration-300 group-hover:scale-105" />
        {!disabled && (
          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink shadow-soft transition group-hover:bg-seal group-hover:text-white">
            <PlusIcon width={16} height={16} />
          </span>
        )}
      </div>
    </button>
  );
}

/** A plain grid of items with the add-to-cart dialog (used on the home page). */
export function ItemGrid({ items, orderingOpen }: { items: { item: MenuItem; art: Art }[]; orderingOpen: boolean }) {
  const [selected, setSelected] = useState<Selected>(null);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ item, art }) => (
          <ItemCard key={item.id} item={item} art={art} orderingOpen={orderingOpen} onSelect={() => setSelected({ item, art })} />
        ))}
      </div>
      {selected && <ItemDialog item={selected.item} art={selected.art} onClose={() => setSelected(null)} />}
    </>
  );
}

export function MenuBrowser({ menu, orderingOpen }: { menu: Menu; orderingOpen: boolean }) {
  const [selected, setSelected] = useState<Selected>(null);
  const [active, setActive] = useState(menu.categories[0]?.id ?? "");
  const { count, subtotalCents, setOpen } = useCart();

  // Scroll-spy: highlight the category in view.
  useEffect(() => {
    const els = menu.categories.map((c) => document.getElementById(`cat-${c.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace("cat-", ""));
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [menu]);

  useEffect(() => {
    document.getElementById(`chip-${active}`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 border-b border-line/70 bg-rice/90 backdrop-blur-md sm:-mx-6">
        <nav className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6" aria-label="Menu categories">
          {menu.categories.map((c) => (
            <a
              key={c.id}
              id={`chip-${c.id}`}
              href={`#cat-${c.id}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active === c.id ? "bg-ink text-rice" : "bg-card text-ink-2 ring-1 ring-line hover:ring-ink-3"}`}
            >
              {c.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-6 space-y-14">
        {menu.categories.map((c) =>
          c.items.length ? (
            <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-36" aria-labelledby={`h-${c.id}`}>
              <h2 id={`h-${c.id}`} className="text-3xl font-extrabold sm:text-4xl">{c.name}</h2>
              {c.description && <p className="mt-1.5 text-ink-3">{c.description}</p>}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {c.items.map((item) => (
                  <ItemCard key={item.id} item={item} art={c.art} orderingOpen={orderingOpen} onSelect={() => setSelected({ item, art: c.art })} />
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-14 w-full items-center justify-between rounded-full bg-seal px-6 text-white shadow-lift"
          >
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/20 px-2 text-sm font-bold">{count}</span>
            <span className="font-semibold">View order</span>
            <span className="font-semibold tabular-nums">{formatCents(subtotalCents)}</span>
          </button>
        </div>
      )}

      {selected && <ItemDialog item={selected.item} art={selected.art} onClose={() => setSelected(null)} />}
    </>
  );
}
