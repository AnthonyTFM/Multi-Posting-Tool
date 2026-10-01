"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { RESTAURANT } from "@/lib/restaurant";

type Slot = { minutes: number; label: string; remaining: number };
type Done = { code: string; partySize: number; dateLabel: string; timeLabel: string; name: string };

const R = RESTAURANT.reservations;
const field = "mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-4 text-base outline-none transition focus:border-ink";

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function ReservationForm({ today }: { today: string }) {
  const [party, setParty] = useState<number>(R.minParty);
  const [date, setDate] = useState(addDays(today, 1));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [reason, setReason] = useState("");
  const [time, setTime] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    setSlots(null);
    setTime(null);
    const ctl = new AbortController();
    fetch(`/api/reservations/availability?date=${date}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d: { slots: Slot[]; reason?: string }) => {
        setSlots(d.slots ?? []);
        setReason(d.reason ?? "");
      })
      .catch((e) => e.name !== "AbortError" && setSlots([]));
    return () => ctl.abort();
  }, [date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (time === null) {
      setError("Please pick a time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, partySize: party, date, time: hhmm(time), notes }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't book that table.");
      setDone({ code: d.code, partySize: d.partySize, dateLabel: d.dateLabel, timeLabel: d.timeLabel, name: d.name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't book that table.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="animate-rise h-fit rounded-3xl border border-line bg-card p-8 text-center shadow-lift">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-matcha text-white"><CheckIcon width={28} height={28} /></span>
        <h2 className="mt-4 text-3xl font-extrabold">You&apos;re booked, {done.name.split(" ")[0]}!</h2>
        <p className="mt-2 text-lg text-ink-2">
          Table for <strong>{done.partySize}</strong> on <strong>{done.dateLabel}</strong> at <strong>{done.timeLabel}</strong>.
        </p>
        <p className="mt-4 inline-block rounded-xl bg-yolk-soft px-4 py-2 font-mono text-lg font-bold tracking-widest">{done.code}</p>
        <p className="mt-4 text-sm text-ink-3">We texted your confirmation. Need to change or cancel? Call {RESTAURANT.phoneDisplay}.</p>
      </div>
    );
  }

  const usable = (slots ?? []).filter((s) => s.remaining >= party);

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-card p-6 shadow-soft sm:p-8">
      <fieldset>
        <legend className="font-semibold">Party size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: R.maxParty - R.minParty + 1 }, (_, i) => R.minParty + i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setParty(n)}
              className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition ${party === n ? "bg-ink text-rice" : "bg-rice ring-1 ring-line hover:ring-ink"}`}
              aria-pressed={party === n}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="font-semibold">Date</span>
        <input type="date" value={date} min={today} max={addDays(today, R.maxDaysAhead)} onChange={(e) => e.target.value && setDate(e.target.value)} className={field} required />
      </label>

      <fieldset className="mt-6">
        <legend className="font-semibold">Time</legend>
        {slots === null ? (
          <p className="mt-2 text-sm text-ink-3">Checking availability…</p>
        ) : slots.length === 0 ? (
          <p className="mt-2 text-sm text-ketchup">{reason || "No times available that day."}</p>
        ) : usable.length === 0 ? (
          <p className="mt-2 text-sm text-ketchup">We&apos;re full for a group of {party} that day. Try another date or call us.</p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const ok = s.remaining >= party;
              return (
                <button
                  key={s.minutes}
                  type="button"
                  disabled={!ok}
                  onClick={() => setTime(s.minutes)}
                  className={`h-11 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${time === s.minutes ? "bg-ketchup text-white" : "bg-rice ring-1 ring-line hover:ring-ink"}`}
                  aria-pressed={time === s.minutes}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-semibold">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoComplete="name" required maxLength={60} />
        </label>
        <label className="block">
          <span className="font-semibold">Mobile number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} type="tel" inputMode="tel" autoComplete="tel" required />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="font-semibold">Email <span className="font-normal text-ink-3">(optional)</span></span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} type="email" autoComplete="email" />
      </label>
      <label className="mt-4 block">
        <span className="font-semibold">Occasion or notes <span className="font-normal text-ink-3">(optional)</span></span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} className={`${field} h-auto py-3`} placeholder="Birthday, high chair, allergies…" />
      </label>

      {error && <p role="alert" className="mt-4 rounded-xl bg-ketchup/10 px-4 py-3 text-sm font-medium text-ketchup-2">{error}</p>}
      <button type="submit" disabled={busy || time === null} className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-ketchup text-lg font-semibold text-white transition hover:bg-ketchup-2 disabled:opacity-50">
        {busy ? "Booking…" : time === null ? "Pick a time" : `Book table for ${party}`}
      </button>
      <p className="mt-2 text-center text-[11px] leading-4 text-ink-3">
        You&apos;ll get a confirmation text at this number. Msg &amp; data rates may apply. Reply STOP to opt out.
      </p>
    </form>
  );
}
