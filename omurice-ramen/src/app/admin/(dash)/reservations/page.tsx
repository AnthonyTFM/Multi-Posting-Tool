"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, fmtPhone } from "@/components/admin/api";
import type { Reservation, ReservationStatus } from "@/lib/reservations";

function clock(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

const BADGE: Record<ReservationStatus, string> = {
  confirmed: "bg-matcha/15 text-[#3f6a24]",
  seated: "bg-ink text-rice",
  cancelled: "bg-ketchup/10 text-ketchup-2 line-through",
  no_show: "bg-ink/10 text-ink-3",
};

export default function ReservationsAdmin() {
  const [list, setList] = useState<Reservation[] | null>(null);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    const d = await adminFetch<{ reservations: Reservation[] }>("/api/admin/reservations");
    setList(d.reservations);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(r: Reservation, status: ReservationStatus) {
    if (status === "cancelled" && !confirm(`Cancel ${r.name}'s reservation for ${r.partySize}?`)) return;
    await adminFetch(`/api/admin/reservations/${r.id}`, { method: "PATCH", body: { status } });
    await load();
  }

  if (!list) return <p className="text-ink-3">Loading…</p>;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Detroit" });
  const visible = list.filter((r) => showPast || r.localDate >= today);
  const byDay = new Map<string, Reservation[]>();
  for (const r of visible) byDay.set(r.localDate, [...(byDay.get(r.localDate) ?? []), r]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-extrabold">Group reservations</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show yesterday
        </label>
      </div>
      <p className="mt-1 text-sm text-ink-3">Parties of 6–20, booked online or by the AI phone host. Customers get a text confirmation.</p>

      {byDay.size === 0 && <p className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-ink-3">No upcoming reservations.</p>}

      <div className="mt-6 space-y-8">
        {[...byDay.entries()].map(([date, rs]) => {
          const guests = rs.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.partySize, 0);
          return (
            <section key={date}>
              <h2 className="text-lg font-bold">
                {date === today ? "Today · " : ""}
                {dayLabel(date)} <span className="text-sm font-medium text-ink-3">· {guests} guests</span>
              </h2>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card shadow-soft">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-rice text-xs uppercase tracking-wide text-ink-3">
                    <tr>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Party</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Phone</th>
                      <th className="px-4 py-2">Notes</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rs.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-base font-bold">{clock(r.localMinutes)}</td>
                        <td className="px-4 py-3 text-base font-bold">{r.partySize}</td>
                        <td className="px-4 py-3">
                          {r.name}
                          <span className="block text-xs text-ink-3">{r.code} · {r.source === "phone" ? "AI phone" : "Web"}</span>
                        </td>
                        <td className="px-4 py-3"><a className="hover:underline" href={`tel:${r.phone}`}>{fmtPhone(r.phone)}</a></td>
                        <td className="max-w-[220px] px-4 py-3 text-ink-2">{r.notes || "—"}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BADGE[r.status]}`}>{r.status.replace("_", "-")}</span></td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {r.status === "confirmed" && (
                            <>
                              <button type="button" onClick={() => setStatus(r, "seated")} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-rice">Seated</button>{" "}
                              <button type="button" onClick={() => setStatus(r, "no_show")} className="rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-line">No-show</button>{" "}
                              <button type="button" onClick={() => setStatus(r, "cancelled")} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ketchup ring-1 ring-line">Cancel</button>
                            </>
                          )}
                          {r.status !== "confirmed" && (
                            <button type="button" onClick={() => setStatus(r, "confirmed")} className="text-xs font-semibold text-ink-3 underline">Undo</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
