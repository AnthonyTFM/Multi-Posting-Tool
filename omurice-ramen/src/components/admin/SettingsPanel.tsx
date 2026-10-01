"use client";

import { useCallback, useEffect, useState } from "react";
import type { Faq } from "@/lib/faq";
import type { Settings } from "@/lib/settings";
import { adminFetch } from "./api";

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink-3">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-matcha" : "bg-line"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

function FaqEditor() {
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);
  const load = useCallback(async () => setFaqs((await adminFetch<{ faqs: Faq[] }>("/api/admin/faq")).faqs), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!editing) return;
    const d = await adminFetch<{ faqs: Faq[] }>("/api/admin/faq", { method: "POST", body: editing });
    setFaqs(d.faqs);
    setEditing(null);
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">FAQ</h2>
          <p className="text-sm text-ink-3">Shown on the website and used by the AI chat and phone host to answer questions.</p>
        </div>
        <button type="button" onClick={() => setEditing({ question: "", answer: "" })} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-rice">+ Add</button>
      </div>
      {editing && (
        <div className="mt-4 space-y-2 rounded-xl bg-rice p-4">
          <input value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} placeholder="Question" className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold" />
          <textarea value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} placeholder="Answer" rows={3} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="rounded-full bg-seal px-4 py-2 text-sm font-semibold text-white">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="px-3 text-sm text-ink-3">Cancel</button>
          </div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-line">
        {(faqs ?? []).map((f) => (
          <li key={f.id} className={`flex gap-3 py-3 ${f.active ? "" : "opacity-50"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{f.question}</p>
              <p className="text-sm text-ink-2">{f.answer}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold">
              <button type="button" onClick={() => setEditing(f)} className="text-ink-2 hover:underline">Edit</button>
              <button
                type="button"
                onClick={async () => setFaqs((await adminFetch<{ faqs: Faq[] }>("/api/admin/faq", { method: "POST", body: { ...f, active: !f.active } })).faqs)}
                className="text-ink-2 hover:underline"
              >
                {f.active ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={async () => confirm("Delete this FAQ?") && setFaqs((await adminFetch<{ faqs: Faq[] }>("/api/admin/faq", { method: "DELETE", body: { id: f.id } })).faqs)}
                className="text-seal hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SettingsPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [newClosure, setNewClosure] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    adminFetch<Settings>("/api/admin/settings").then((d) => {
      setS(d);
      setAnnouncement(d.announcement);
    });
  }, []);

  async function patch(body: Partial<Settings>) {
    const d = await adminFetch<Settings>("/api/admin/settings", { method: "PATCH", body });
    setS(d);
    setSaved("Saved");
    setTimeout(() => setSaved(""), 1500);
  }

  if (!s) return <p className="mt-6 text-ink-3">Loading…</p>;

  return (
    <>
      <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Operations</h2>
          {saved && <span className="text-sm font-semibold text-matcha">{saved} ✓</span>}
        </div>
        <div className="divide-y divide-line">
          <Switch on={s.aiPhoneEnabled} onChange={(v) => patch({ aiPhoneEnabled: v })} label="AI phone host" hint="Off = every call rings your staff line directly, like a normal phone." />
          <Switch on={!s.orderingPaused} onChange={(v) => patch({ orderingPaused: !v })} label="Accept online & phone orders" hint="Turn off when the kitchen is slammed. The site shows a banner and the AI stops taking orders." />
          <Switch on={!s.reservationsPaused} onChange={(v) => patch({ reservationsPaused: !v })} label="Accept group reservations" hint="Turn off to stop new bookings online and by phone." />
          <label className="flex items-center justify-between gap-4 py-3">
            <span>
              <span className="block font-semibold">Pickup prep time</span>
              <span className="block text-sm text-ink-3">Quoted to customers for ASAP orders.</span>
            </span>
            <select value={s.prepMinutes} onChange={(e) => patch({ prepMinutes: Number(e.target.value) })} className="rounded-lg border border-line bg-rice px-3 py-2 font-semibold">
              {[10, 15, 20, 25, 30, 40, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </label>
          <div className="py-3">
            <span className="block font-semibold">Site announcement banner</span>
            <span className="block text-sm text-ink-3">e.g. &ldquo;Closed Thanksgiving Day&rdquo; or &ldquo;New: Matcha Strawberry Latte!&rdquo;. Leave empty to hide. The AI mentions it too.</span>
            <div className="mt-2 flex gap-2">
              <input value={announcement} onChange={(e) => setAnnouncement(e.target.value)} maxLength={200} className="flex-1 rounded-lg border border-line bg-rice px-3 py-2 text-sm" aria-label="Site announcement banner text" />
              <button type="button" onClick={() => patch({ announcement })} className="rounded-full bg-ink px-4 text-sm font-semibold text-rice">Save</button>
            </div>
          </div>
          <div className="py-3">
            <span className="block font-semibold">Holiday closures</span>
            <span className="block text-sm text-ink-3">Closed all day on these dates: no orders, no reservations, and the AI knows.</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.closures.map((d) => (
                <span key={d} className="flex items-center gap-1 rounded-full bg-rice-2 px-3 py-1 text-sm font-semibold">
                  {d}
                  <button type="button" onClick={() => patch({ closures: s.closures.filter((x) => x !== d) })} aria-label={`Remove ${d}`} className="text-ink-3 hover:text-seal">×</button>
                </span>
              ))}
              <input type="date" value={newClosure} onChange={(e) => setNewClosure(e.target.value)} className="rounded-lg border border-line bg-rice px-3 py-1 text-sm" aria-label="Closure date to add" />
              <button
                type="button"
                disabled={!newClosure}
                onClick={() => {
                  patch({ closures: [...s.closures, newClosure] });
                  setNewClosure("");
                }}
                className="rounded-full bg-ink px-4 text-sm font-semibold text-rice disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </section>
      <FaqEditor />
    </>
  );
}
