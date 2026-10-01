import crypto from "node:crypto";
import { db, nowIso, tx } from "./db.ts";
import { addDays, formatClock, formatDateLocal, hoursFor, toMinutes, zonedParts, zonedToUtc } from "./hours.ts";
import { RESTAURANT } from "./restaurant.ts";
import { getSettings } from "./settings.ts";
import { sendSmsQuietly } from "./twilio.ts";
import { cleanText, normalizePhone, randomId } from "./util.ts";

export type ReservationStatus = "confirmed" | "seated" | "cancelled" | "no_show";
export const RESERVATION_STATUSES: ReservationStatus[] = ["confirmed", "seated", "cancelled", "no_show"];

export type Reservation = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  partySize: number;
  startsAt: string;
  localDate: string;
  localMinutes: number;
  notes: string;
  status: ReservationStatus;
  source: "web" | "phone";
  createdAt: string;
};

type Row = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  party_size: number;
  starts_at: string;
  local_date: string;
  local_minutes: number;
  notes: string;
  status: string;
  source: string;
  created_at: string;
};

function toRes(r: Row): Reservation {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    phone: r.phone,
    email: r.email,
    partySize: r.party_size,
    startsAt: r.starts_at,
    localDate: r.local_date,
    localMinutes: r.local_minutes,
    notes: r.notes,
    status: r.status as ReservationStatus,
    source: r.source as Reservation["source"],
    createdAt: r.created_at,
  };
}

export class ReservationError extends Error {}

const R = RESTAURANT.reservations;

export type Slot = { minutes: number; label: string; remaining: number };

function bookedGuests(date: string): Map<number, number> {
  const rows = db()
    .prepare("SELECT local_minutes AS m, SUM(party_size) AS g FROM reservations WHERE local_date = ? AND status IN ('confirmed','seated') GROUP BY local_minutes")
    .all(date) as { m: number; g: number }[];
  return new Map(rows.map((r) => [r.m, r.g]));
}

/** Bookable 30-min slots for a local date, with remaining large-party capacity. */
export function availability(date: string, now = new Date()): { date: string; open: boolean; slots: Slot[]; reason?: string } {
  const settings = getSettings();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { date, open: false, slots: [], reason: "Invalid date." };
  if (settings.reservationsPaused) return { date, open: false, slots: [], reason: "Online reservations are paused. Please call us." };
  const today = zonedParts(now).date;
  if (date < today) return { date, open: false, slots: [], reason: "That date has passed." };
  if (date > addDays(today, R.maxDaysAhead)) {
    return { date, open: false, slots: [], reason: `We book up to ${R.maxDaysAhead} days ahead.` };
  }
  const h = hoursFor(date, settings.closures);
  if (!h) return { date, open: false, slots: [], reason: "We're closed that day." };
  const booked = bookedGuests(date);
  const slots: Slot[] = [];
  const last = toMinutes(h.close) - R.lastSeatingBeforeCloseMin;
  for (let m = Math.ceil(toMinutes(h.open) / R.slotMinutes) * R.slotMinutes; m <= last; m += R.slotMinutes) {
    if (zonedToUtc(date, m).getTime() < now.getTime() + R.minLeadMinutes * 60000) continue;
    slots.push({ minutes: m, label: formatClock(m), remaining: Math.max(0, R.maxGuestsPerSlot - (booked.get(m) ?? 0)) });
  }
  return { date, open: true, slots };
}

export type CreateReservationInput = {
  name: string;
  phone: string;
  email?: string;
  partySize: number;
  date: string; // YYYY-MM-DD local
  time: string; // HH:MM local, 24h
  notes?: string;
  source: "web" | "phone";
};

export function createReservation(input: CreateReservationInput, now = new Date()): Reservation {
  const size = Math.floor(Number(input.partySize));
  if (!Number.isFinite(size) || size < 1) throw new ReservationError("Please tell us how many guests.");
  if (size < R.minParty) {
    throw new ReservationError(`We only take reservations for groups of ${R.minParty} or more. Smaller groups can walk right in!`);
  }
  if (size > R.maxParty) {
    throw new ReservationError(`For groups larger than ${R.maxParty}, please call us at ${RESTAURANT.phoneDisplay} so we can plan your visit.`);
  }
  const name = cleanText(input.name, 60);
  if (!name) throw new ReservationError("Please add a name for the reservation.");
  const phone = normalizePhone(input.phone);
  if (!phone) throw new ReservationError("Please add a valid 10-digit phone number.");
  if (!/^\d{2}:\d{2}$/.test(input.time ?? "")) throw new ReservationError("Please choose a time.");
  const minutes = toMinutes(input.time);

  return tx(() => {
    const avail = availability(input.date, now);
    if (!avail.open) throw new ReservationError(avail.reason ?? "That date isn't available.");
    const slot = avail.slots.find((s) => s.minutes === minutes);
    if (!slot) throw new ReservationError("That time isn't available. Please choose another time.");
    if (slot.remaining < size) {
      const alts = avail.slots.filter((s) => s.remaining >= size).slice(0, 3).map((s) => s.label);
      throw new ReservationError(
        alts.length
          ? `${slot.label} is full for a group of ${size}. Open times that day: ${alts.join(", ")}.`
          : `We're fully booked for groups of ${size} that day. Please try another date.`,
      );
    }
    const id = randomId();
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const ts = nowIso();
    db()
      .prepare(
        `INSERT INTO reservations (id, code, name, phone, email, party_size, starts_at, local_date, local_minutes, notes, status, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
      )
      .run(
        id,
        code,
        name,
        phone,
        cleanText(input.email, 120),
        size,
        zonedToUtc(input.date, minutes).toISOString(),
        input.date,
        minutes,
        cleanText(input.notes, 300),
        input.source,
        ts,
        ts,
      );
    const res = getReservation(id)!;
    sendSmsQuietly(
      res.phone,
      `${RESTAURANT.shortName}: you're confirmed for ${size} on ${formatDateLocal(res.localDate)} at ${formatClock(minutes)}. Confirmation ${code}. Need to change it? Call ${RESTAURANT.phoneDisplay}.`,
    );
    return res;
  });
}

export function getReservation(id: string): Reservation | null {
  const row = db().prepare("SELECT * FROM reservations WHERE id = ?").get(id) as Row | undefined;
  return row ? toRes(row) : null;
}

export function listReservations(fromDate: string, days = 14): Reservation[] {
  const rows = db()
    .prepare("SELECT * FROM reservations WHERE local_date >= ? AND local_date <= ? ORDER BY local_date, local_minutes")
    .all(fromDate, addDays(fromDate, days)) as Row[];
  return rows.map(toRes);
}

export function updateReservationStatus(id: string, status: ReservationStatus): Reservation | null {
  if (!RESERVATION_STATUSES.includes(status)) throw new Error("bad status");
  db().prepare("UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  return getReservation(id);
}
