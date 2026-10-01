"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import { ItemVisual } from "@/components/ItemArt";
import type { Media } from "@/lib/media";
import { type Menu, type MenuItem, formatCents } from "@/lib/menu-types";

function Toggle({ on, onChange, label, danger }: { on: boolean; onChange: (v: boolean) => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${on ? (danger ? "bg-seal text-white" : "bg-ink text-rice") : "bg-rice ring-1 ring-line hover:ring-ink"}`}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}

function ItemRow({ item, art, onSaved, photos }: { item: MenuItem; art: Menu["categories"][number]["art"]; onSaved: () => void; photos: Media[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name,
    description: item.description,
    price: (item.priceCents / 100).toFixed(2),
    posPlu: item.posPlu ?? "",
    image: item.image ?? "",
    optionGroups: JSON.stringify(item.optionGroups, null, 2),
  });
  const [err, setErr] = useState("");

  async function patch(body: Record<string, unknown>) {
    setErr("");
    try {
      await adminFetch(`/api/admin/menu/${item.id}`, { method: "PATCH", body });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function save() {
    let groups;
    try {
      groups = JSON.parse(draft.optionGroups);
    } catch {
      setErr("Options JSON is invalid.");
      return;
    }
    await patch({
      name: draft.name,
      description: draft.description,
      priceCents: Math.round(parseFloat(draft.price) * 100),
      posPlu: draft.posPlu,
      image: draft.image,
      optionGroups: groups,
      verified: true,
    });
    setOpen(false);
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-rice px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <li className={`rounded-2xl border bg-card p-3 ${!item.verified ? "border-yolk ring-2 ring-yolk/40" : "border-line"} ${!item.active ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <ItemVisual art={art} image={item.image} name={item.name} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {item.name}{" "}
            {!item.verified && <span className="ml-1 rounded bg-yolk px-1.5 py-0.5 text-[10px] font-bold uppercase">Verify price &amp; details</span>}
          </p>
          <p className="text-sm text-ink-3">
            {formatCents(item.priceCents)} · {item.optionGroups.length} option group{item.optionGroups.length === 1 ? "" : "s"} · PLU {item.posPlu || <span className="text-seal">not set</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Toggle on={item.soldOut} onChange={(v) => patch({ soldOut: v })} label={item.soldOut ? "SOLD OUT" : "Sold out?"} danger />
          <Toggle on={item.popular} onChange={(v) => patch({ popular: v })} label="Popular" />
          <Toggle on={!item.active} onChange={(v) => patch({ active: !v })} label={item.active ? "Hide" : "Hidden"} />
          {!item.verified && <button type="button" onClick={() => patch({ verified: true })} className="rounded-full bg-yolk px-3 py-1.5 text-xs font-bold">✓ Looks right</button>}
          <button type="button" onClick={() => setOpen(!open)} className="rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-line hover:ring-ink">{open ? "Close" : "Edit"}</button>
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
          <label className="text-xs font-semibold">Name<input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="text-xs font-semibold">Price ($)<input className={field} inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
          <label className="text-xs font-semibold md:col-span-2">Description<textarea rows={2} className={field} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          <label className="text-xs font-semibold">Honor POS PLU (for POS sync)<input className={field} value={draft.posPlu} onChange={(e) => setDraft({ ...draft, posPlu: e.target.value })} /></label>
          <div className="text-xs font-semibold md:col-span-2">
            Photo {photos.length === 0 && <span className="font-normal text-ink-3">(upload photos in Photos &amp; Video first)</span>}
            <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, image: "" })}
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-[10px] ring-2 ${draft.image ? "ring-transparent bg-rice" : "ring-seal bg-rice"}`}
              >
                Illustration
              </button>
              {photos.map((p) => (
                <button key={p.id} type="button" onClick={() => setDraft({ ...draft, image: p.url })} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 ${draft.image === p.url ? "ring-seal" : "ring-transparent"}`} aria-label={`Use ${p.alt || "photo"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <label className="text-xs font-semibold md:col-span-2">
            Options (advanced, JSON: groups with min/max and choices with priceCents)
            <textarea rows={8} className={`${field} font-mono text-xs`} value={draft.optionGroups} onChange={(e) => setDraft({ ...draft, optionGroups: e.target.value })} />
          </label>
          {err && <p className="text-sm font-medium text-seal md:col-span-2">{err}</p>}
          <div className="flex gap-2 md:col-span-2">
            <button type="button" onClick={save} className="rounded-full bg-seal px-5 py-2 text-sm font-semibold text-white">Save &amp; mark verified</button>
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Delete ${item.name} permanently? (Use Hide to remove it temporarily.)`)) {
                  await adminFetch(`/api/admin/menu/${item.id}`, { method: "DELETE", body: {} });
                  onSaved();
                }
              }}
              className="ml-auto rounded-full px-4 py-2 text-sm font-semibold text-seal ring-1 ring-line"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {!open && err && <p className="mt-2 text-sm text-seal">{err}</p>}
    </li>
  );
}

function AddItem({ categoryId, onSaved }: { categoryId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-2 text-sm font-semibold text-seal">+ Add item</button>;
  return (
    <form
      className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-dashed border-line p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await adminFetch("/api/admin/menu", { method: "POST", body: { categoryId, name, description, priceCents: Math.round(parseFloat(price) * 100) } });
        setOpen(false);
        setName("");
        setPrice("");
        setDescription("");
        onSaved();
      }}
    >
      <input required placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-48 flex-1 rounded-lg border border-line bg-rice px-3 py-2 text-sm" />
      <input required placeholder="Price e.g. 12.99" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-32 rounded-lg border border-line bg-rice px-3 py-2 text-sm" />
      <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-w-64 flex-[2] rounded-lg border border-line bg-rice px-3 py-2 text-sm" />
      <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-rice">Add</button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-ink-3">Cancel</button>
    </form>
  );
}

export default function MenuAdmin() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [photos, setPhotos] = useState<Media[]>([]);
  const load = useCallback(async () => setMenu(await adminFetch<Menu>("/api/admin/menu")), []);
  useEffect(() => {
    adminFetch<{ media: Media[] }>("/api/admin/media")
      .then((d) => setPhotos(d.media.filter((m) => m.kind === "image")))
      .catch(() => {});
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!menu) return <p className="text-ink-3">Loading…</p>;
  const all = menu.categories.flatMap((c) => c.items);
  const unverified = all.filter((i) => !i.verified).length;
  const soldOut = all.filter((i) => i.soldOut).length;

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Menu</h1>
      <p className="mt-1 text-sm text-ink-3">Changes go live on the website, chat assistant and AI phone host immediately. Mark items sold out to stop them being ordered.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {unverified > 0 && <span className="rounded-full bg-yolk px-3 py-1 font-semibold">{unverified} items need price/detail check before launch</span>}
        {soldOut > 0 && <span className="rounded-full bg-seal px-3 py-1 font-semibold text-white">{soldOut} sold out</span>}
      </div>
      <div className="mt-6 space-y-8">
        {menu.categories.map((c) => (
          <section key={c.id}>
            <h2 className="text-xl font-bold">{c.name}</h2>
            <ul className="mt-3 space-y-2">
              {c.items.map((i) => <ItemRow key={`${i.id}:${i.priceCents}:${i.name}:${i.image}:${i.posPlu}`} item={i} art={c.art} onSaved={load} photos={photos} />)}
            </ul>
            <AddItem categoryId={c.id} onSaved={load} />
          </section>
        ))}
      </div>
    </div>
  );
}
