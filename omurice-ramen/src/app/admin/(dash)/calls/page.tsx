"use client";

import { useEffect, useState } from "react";
import { adminFetch, fmtDay, fmtPhone, fmtTime } from "@/components/admin/api";
import type { CallLog } from "@/lib/calls";

const OUTCOME: Record<CallLog["outcome"], { label: string; cls: string }> = {
  in_progress: { label: "Live", cls: "bg-matcha text-white animate-pulse" },
  order: { label: "Order placed", cls: "bg-matcha/15 text-[#3f6a24]" },
  reservation: { label: "Reservation", cls: "bg-taro/40 text-ink" },
  transfer: { label: "Transferred", cls: "bg-yolk text-ink" },
  info: { label: "Question answered", cls: "bg-rice-2 text-ink-2" },
  hangup: { label: "Hung up", cls: "bg-rice-2 text-ink-3" },
  error: { label: "Error", cls: "bg-ketchup text-white" },
};

export default function CallsAdmin() {
  const [calls, setCalls] = useState<CallLog[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const load = () => adminFetch<{ calls: CallLog[] }>("/api/admin/calls").then((d) => setCalls(d.calls)).catch(() => {});
    void load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (!calls) return <p className="text-ink-3">Loading…</p>;
  const today = calls.filter((c) => fmtDay(c.startedAt) === fmtDay(new Date().toISOString()));
  const stat = (o: CallLog["outcome"]) => today.filter((c) => c.outcome === o).length;

  return (
    <div>
      <h1 className="text-3xl font-extrabold">AI phone calls</h1>
      <p className="mt-1 text-sm text-ink-3">Every call the AI host answered, with transcripts. Use these to spot questions to add to the FAQ.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Calls today", today.length],
          ["Orders", stat("order")],
          ["Reservations", stat("reservation")],
          ["Transferred", stat("transfer")],
          ["Answered by AI", stat("info") + stat("hangup")],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-card p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{k}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>
      {calls.length === 0 && <p className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-ink-3">No calls yet. Once Twilio is connected, calls show up here live.</p>}
      <ul className="mt-6 space-y-2">
        {calls.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line bg-card shadow-soft">
            <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${OUTCOME[c.outcome].cls}`}>{OUTCOME[c.outcome].label}</span>
              <span className="font-semibold">{c.fromNumber ? fmtPhone(c.fromNumber) : "Unknown caller"}</span>
              <span className="text-sm text-ink-3">{fmtDay(c.startedAt)} {fmtTime(c.startedAt)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{c.summary}</span>
              <span className="text-sm text-ink-3">{c.transcript.length} turns {open === c.id ? "▾" : "▸"}</span>
            </button>
            {open === c.id && (
              <div className="space-y-2 border-t border-line px-4 py-4">
                {c.orderId && <a href={`/order/${c.orderId}`} target="_blank" className="text-sm font-semibold text-ketchup underline">View order →</a>}
                {c.transcript.map((t, i) => (
                  <p key={i} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${t.role === "caller" ? "bg-rice-2" : "ml-auto bg-ink text-rice"}`}>
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide opacity-60">{t.role === "caller" ? "Caller" : "AI host"}</span>
                    {t.text}
                  </p>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
