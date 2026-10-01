"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/menu-types";
import type { Order, OrderStatus } from "@/lib/orders";
import { adminFetch, fmtPhone, fmtTime } from "./api";

type Board = { orders: Order[]; settings: { orderingPaused: boolean; prepMinutes: number } };

const COLUMNS: { status: OrderStatus; title: string; tone: string }[] = [
  { status: "new", title: "New", tone: "bg-seal text-white" },
  { status: "preparing", title: "Cooking", tone: "bg-yolk text-ink" },
  { status: "ready", title: "Ready for pickup", tone: "bg-matcha text-white" },
];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "preparing", label: "Start cooking" },
  preparing: { to: "ready", label: "Mark ready · text customer" },
  ready: { to: "picked_up", label: "Picked up" },
};

function chime() {
  try {
    const ctx = new AudioContext();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [880, 1175, 1568][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.32);
    });
  } catch {
    // audio unavailable
  }
}

function minutesUntil(iso: string, now: number) {
  return Math.round((new Date(iso).getTime() - now) / 60000);
}

function Ticket({ o }: { o: Order }) {
  return (
    <div className="print-ticket hidden print:block">
      <p style={{ fontSize: 22, fontWeight: 700 }}>#{o.number} {o.source === "phone" ? "PHONE" : "WEB"}</p>
      <p>{o.customerName} {fmtPhone(o.customerPhone)}</p>
      <p>Pickup: {o.asap ? "ASAP ~" : ""}{fmtTime(o.pickupAt)}</p>
      <hr />
      {o.lines.map((l, i) => (
        <div key={i} style={{ margin: "6px 0" }}>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{l.quantity} x {l.name}</p>
          {l.options.map((op, j) => <p key={j}>  - {op.choice}</p>)}
          {l.notes && <p>  ** {l.notes}</p>}
        </div>
      ))}
      {o.notes && <p>NOTE: {o.notes}</p>}
      <hr />
      <p>Total {formatCents(o.totalCents)} - PAY AT PICKUP</p>
    </div>
  );
}

function OrderCard({ o, now, onStatus, onPrint, onRetry, fresh }: {
  o: Order;
  now: number;
  fresh: boolean;
  onStatus: (s: OrderStatus) => void;
  onPrint: () => void;
  onRetry: () => void;
}) {
  const mins = minutesUntil(o.pickupAt, now);
  const late = mins < 0 && o.status !== "ready";
  const next = NEXT[o.status];
  return (
    <article className={`rounded-2xl border bg-card p-4 shadow-soft ${fresh ? "border-seal ring-4 ring-seal/25" : "border-line"}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-3xl font-extrabold leading-none">#{o.number}</p>
          <p className="mt-1 text-sm font-semibold">{o.customerName}</p>
          <a href={`tel:${o.customerPhone}`} className="text-xs text-ink-3 hover:underline">{fmtPhone(o.customerPhone)}</a>
        </div>
        <div className="text-right">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${o.source === "phone" ? "bg-taro/40 text-ink" : "bg-rice-2 text-ink-2"}`}>
            {o.source === "phone" ? "AI phone" : "Web"}
          </span>
          <p className="mt-1 text-lg font-bold">{o.asap ? "ASAP " : ""}{fmtTime(o.pickupAt)}</p>
          <p className={`text-xs font-semibold ${late ? "text-seal" : "text-ink-3"}`}>
            {late ? `${-mins} min late` : mins <= 0 ? "due now" : `in ${mins} min`}
          </p>
        </div>
      </header>
      <ul className="mt-3 space-y-2 border-t border-line pt-3">
        {o.lines.map((l, i) => (
          <li key={i}>
            <p className="font-semibold"><span className="mr-1 inline-block min-w-6 rounded bg-ink px-1.5 text-center text-sm text-rice">{l.quantity}</span> {l.name}</p>
            {l.options.length > 0 && <p className="ml-8 text-sm text-ink-2">{l.options.map((op) => op.choice).join(" · ")}</p>}
            {l.notes && <p className="ml-8 mt-0.5 rounded bg-yolk-soft px-2 py-0.5 text-sm font-semibold">“{l.notes}”</p>}
          </li>
        ))}
      </ul>
      {o.notes && <p className="mt-3 rounded-lg bg-yolk-soft px-3 py-2 text-sm"><strong>Note:</strong> {o.notes}</p>}
      <p className="mt-3 text-sm text-ink-2">{formatCents(o.totalCents)} · <strong>pay at pickup</strong></p>
      {o.posStatus === "failed" && (
        <p className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-seal/10 px-3 py-2 text-xs text-seal-2">
          <span title={o.posError ?? ""}>POS sync failed. Ring it in manually.</span>
          <button type="button" onClick={onRetry} className="font-bold underline">Retry</button>
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {next && (
          <button type="button" onClick={() => onStatus(next.to)} className="h-11 flex-1 rounded-xl bg-ink text-sm font-semibold text-rice hover:bg-ink-2">
            {next.label}
          </button>
        )}
        <button type="button" onClick={onPrint} className="h-11 rounded-xl px-3 text-sm font-semibold ring-1 ring-line hover:ring-ink" aria-label={`Print ticket #${o.number}`}>
          Print
        </button>
        {o.status !== "ready" && (
          <button
            type="button"
            onClick={() => confirm(`Cancel order #${o.number}? The customer gets a text.`) && onStatus("cancelled")}
            className="h-11 rounded-xl px-3 text-sm font-semibold text-seal ring-1 ring-line hover:ring-seal"
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}

export function KitchenBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [sound, setSound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [printing, setPrinting] = useState<Order | null>(null);
  const [showDone, setShowDone] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const load = useCallback(async () => {
    try {
      const b = await adminFetch<Board>("/api/admin/orders");
      const newIds = b.orders.filter((o) => o.status === "new").map((o) => o.id);
      if (seen.current) {
        const arrived = newIds.filter((id) => !seen.current!.has(id));
        if (arrived.length) {
          if (soundRef.current) chime();
          setFresh((f) => new Set([...f, ...arrived]));
        }
      }
      seen.current = new Set(b.orders.map((o) => o.id));
      setBoard(b);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection problem");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    const c = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [load]);

  const newCount = board?.orders.filter((o) => o.status === "new").length ?? 0;
  useEffect(() => {
    document.title = newCount ? `(${newCount}) New orders · Omurice` : "Orders · Omurice";
  }, [newCount]);

  async function setStatus(o: Order, status: OrderStatus) {
    setFresh((f) => {
      const n = new Set(f);
      n.delete(o.id);
      return n;
    });
    try {
      await adminFetch(`/api/admin/orders/${o.id}`, { method: "PATCH", body: { status } });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function patchSettings(body: Partial<Board["settings"]>) {
    await adminFetch("/api/admin/settings", { method: "PATCH", body });
    await load();
  }

  function print(o: Order) {
    setPrinting(o);
    setTimeout(() => window.print(), 50);
  }

  if (!board) return <p className="text-ink-3">{error || "Loading orders…"}</p>;

  const done = board.orders.filter((o) => o.status === "picked_up" || o.status === "cancelled").reverse();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="mr-auto text-3xl font-extrabold">Orders</h1>
        {error && <span className="rounded-full bg-seal px-3 py-1 text-xs font-bold text-white">Offline: {error}</span>}
        <button
          type="button"
          onClick={() => {
            if (!sound) chime();
            setSound(!sound);
          }}
          className={`h-10 rounded-full px-4 text-sm font-semibold ${sound ? "bg-matcha text-white" : "bg-seal text-white animate-pulse"}`}
        >
          {sound ? "🔔 Sound on" : "🔕 Tap to enable sound"}
        </button>
        <label className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line">
          Prep time
          <select
            value={board.settings.prepMinutes}
            onChange={(e) => patchSettings({ prepMinutes: Number(e.target.value) })}
            className="bg-transparent font-bold outline-none"
          >
            {[10, 15, 20, 25, 30, 40, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => patchSettings({ orderingPaused: !board.settings.orderingPaused })}
          className={`h-10 rounded-full px-4 text-sm font-semibold ${board.settings.orderingPaused ? "bg-seal text-white" : "bg-card ring-1 ring-line hover:ring-ink"}`}
        >
          {board.settings.orderingPaused ? "⏸ Ordering PAUSED · resume" : "Pause online + phone orders"}
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3 print:hidden">
        {COLUMNS.map((col) => {
          const list = board.orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span className={`rounded-full px-2.5 py-0.5 text-sm ${col.tone}`}>{list.length}</span> {col.title}
              </h2>
              <div className="mt-3 space-y-3">
                {list.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">Nothing here</p>}
                {list.map((o) => (
                  <OrderCard
                    key={o.id}
                    o={o}
                    now={now}
                    fresh={fresh.has(o.id)}
                    onStatus={(s) => setStatus(o, s)}
                    onPrint={() => print(o)}
                    onRetry={() => adminFetch(`/api/admin/orders/${o.id}`, { method: "PATCH", body: { action: "retry_pos" } }).then(load)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-8 print:hidden">
        <button type="button" onClick={() => setShowDone(!showDone)} className="text-sm font-semibold text-ink-2 hover:text-ink">
          {showDone ? "▾" : "▸"} Completed &amp; cancelled today ({done.length})
        </button>
        {showDone && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {done.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-bold">#{o.number}</td>
                    <td className="px-4 py-2">{o.customerName}</td>
                    <td className="px-4 py-2">{o.lines.reduce((s, l) => s + l.quantity, 0)} items</td>
                    <td className="px-4 py-2">{formatCents(o.totalCents)}</td>
                    <td className="px-4 py-2">{fmtTime(o.pickupAt)}</td>
                    <td className="px-4 py-2">{o.status === "cancelled" ? <span className="text-seal">Cancelled</span> : "Picked up"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {printing && <Ticket o={printing} />}
    </div>
  );
}
