import { DAY_NAMES, RESTAURANT, WEEKLY_HOURS, type DayHours } from "./restaurant.ts";

const TZ = RESTAURANT.timezone;

export type ZonedParts = { date: string; minutes: number; dow: number };

/** Wall-clock parts of `d` in the restaurant's timezone. */
export function zonedParts(d: Date = new Date()): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dow,
  };
}

function offsetMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** Convert a restaurant-local date ("YYYY-MM-DD") + minutes-after-midnight to a UTC Date. */
export function zonedToUtc(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const first = offsetMinutes(new Date(guess));
  let result = guess - first * 60000;
  const second = offsetMinutes(new Date(result));
  if (second !== first) result = guess - second * 60000;
  return new Date(result);
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function dowOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Hours for a local date, honoring one-off closures (e.g. holidays). */
export function hoursFor(date: string, closures: string[] = []): DayHours {
  if (closures.includes(date)) return null;
  return WEEKLY_HOURS[dowOf(date)];
}

export function isOpenAt(d: Date, closures: string[] = []): boolean {
  const z = zonedParts(d);
  const h = hoursFor(z.date, closures);
  if (!h) return false;
  return z.minutes >= toMinutes(h.open) && z.minutes < toMinutes(h.close);
}

export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeLocal(d: Date): string {
  return formatClock(zonedParts(d).minutes);
}

export function formatDateLocal(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTimeLocal(d: Date): string {
  const z = zonedParts(d);
  return `${formatDateLocal(z.date)} at ${formatClock(z.minutes)}`;
}

/** Human-readable weekly hours, grouping identical consecutive days. */
export function hoursSummary(): { days: string; hours: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: number[]; label: string }[] = [];
  for (const dow of order) {
    const h = WEEKLY_HOURS[dow];
    const label = h ? `${formatClock(toMinutes(h.open))} – ${formatClock(toMinutes(h.close))}` : "Closed";
    const last = rows[rows.length - 1];
    if (last && last.label === label) last.days.push(dow);
    else rows.push({ days: [dow], label });
  }
  return rows.map((r) => ({
    days:
      r.days.length === 1
        ? DAY_NAMES[r.days[0]]
        : `${DAY_NAMES[r.days[0]].slice(0, 3)} – ${DAY_NAMES[r.days[r.days.length - 1]].slice(0, 3)}`,
    hours: r.label,
  }));
}

export type OpenStatus = {
  open: boolean;
  label: string; // "Open now · until 9:30 PM" / "Closed · opens 11 AM Tuesday"
};

export function openStatus(now: Date = new Date(), closures: string[] = []): OpenStatus {
  const z = zonedParts(now);
  const today = hoursFor(z.date, closures);
  if (today && z.minutes >= toMinutes(today.open) && z.minutes < toMinutes(today.close)) {
    return { open: true, label: `Open now · until ${formatClock(toMinutes(today.close))}` };
  }
  if (today && z.minutes < toMinutes(today.open)) {
    return { open: false, label: `Closed · opens ${formatClock(toMinutes(today.open))} today` };
  }
  for (let i = 1; i <= 7; i++) {
    const date = addDays(z.date, i);
    const h = hoursFor(date, closures);
    if (h) {
      const when = i === 1 ? "tomorrow" : DAY_NAMES[dowOf(date)];
      return { open: false, label: `Closed · opens ${formatClock(toMinutes(h.open))} ${when}` };
    }
  }
  return { open: false, label: "Closed" };
}

export type PickupSlot = { iso: string; label: string; asap: boolean };

/**
 * Pickup times customers can choose. ASAP is offered while open; scheduled
 * slots cover the rest of today and the next open day.
 */
export function pickupSlots(
  now: Date = new Date(),
  opts: { prepMinutes: number; closures?: string[]; paused?: boolean },
): PickupSlot[] {
  if (opts.paused) return [];
  const closures = opts.closures ?? [];
  const { slotMinutes, lastOrderBeforeCloseMin } = RESTAURANT.ordering;
  const slots: PickupSlot[] = [];
  const z = zonedParts(now);
  const earliestUtc = now.getTime() + opts.prepMinutes * 60000;

  if (isOpenAt(now, closures)) {
    const h = hoursFor(z.date, closures)!;
    if (z.minutes < toMinutes(h.close) - lastOrderBeforeCloseMin) {
      slots.push({ iso: new Date(earliestUtc).toISOString(), label: `ASAP (~${opts.prepMinutes} min)`, asap: true });
    }
  }

  let daysWithSlots = 0;
  for (let i = 0; i < 7 && daysWithSlots < 2; i++) {
    const date = addDays(z.date, i);
    const h = hoursFor(date, closures);
    if (!h) continue;
    const start = toMinutes(h.open) + opts.prepMinutes;
    const end = toMinutes(h.close) - lastOrderBeforeCloseMin;
    let added = false;
    for (let m = Math.ceil(start / slotMinutes) * slotMinutes; m <= end; m += slotMinutes) {
      const at = zonedToUtc(date, m);
      if (at.getTime() < earliestUtc + 5 * 60000) continue;
      const dayLabel = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAY_NAMES[dowOf(date)];
      slots.push({ iso: at.toISOString(), label: `${dayLabel} ${formatClock(m)}`, asap: false });
      added = true;
    }
    if (added) daysWithSlots++;
  }
  return slots;
}

/** True if `at` is a valid pickup time given hours and prep time. */
export function isValidPickupTime(
  at: Date,
  now: Date,
  opts: { prepMinutes: number; closures?: string[] },
): boolean {
  const closures = opts.closures ?? [];
  if (at.getTime() < now.getTime() + (opts.prepMinutes - 2) * 60000) return false;
  if (at.getTime() > now.getTime() + 8 * 24 * 3600 * 1000) return false;
  const z = zonedParts(at);
  const h = hoursFor(z.date, closures);
  if (!h) return false;
  // An ASAP order placed right before last call can be ready shortly after close.
  const latest = toMinutes(h.close) - RESTAURANT.ordering.lastOrderBeforeCloseMin + opts.prepMinutes;
  return z.minutes >= toMinutes(h.open) && z.minutes <= latest;
}
