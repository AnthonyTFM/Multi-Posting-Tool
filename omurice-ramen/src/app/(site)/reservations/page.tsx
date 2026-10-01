import type { Metadata } from "next";
import { UsersIcon } from "@/components/icons";
import { zonedParts } from "@/lib/hours";
import { RESTAURANT } from "@/lib/restaurant";
import { ReservationForm } from "./ReservationForm";

export const metadata: Metadata = {
  title: "Group Reservations (6+)",
  description: "Book a table for groups of 6 to 20 at Omurice Ramen in Battle Creek. Smaller parties are always welcome to walk in.",
};

export default function ReservationsPage() {
  const today = zonedParts().date;
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ketchup">Groups of {RESTAURANT.reservations.minParty}+</p>
          <h1 className="mt-2 text-5xl font-extrabold">Bring the whole crew.</h1>
          <p className="mt-4 text-lg leading-8 text-ink-2">
            Birthdays, team lunches, family dinners. Reserve a table for {RESTAURANT.reservations.minParty} to {RESTAURANT.reservations.maxParty} guests and we&apos;ll have it ready when you arrive.
          </p>
          <div className="mt-8 space-y-3">
            <div className="flex gap-3 rounded-2xl border border-line bg-card p-4">
              <UsersIcon className="mt-0.5 shrink-0 text-ketchup" />
              <p className="text-sm leading-6">
                <strong>Party of {RESTAURANT.reservations.minParty - 1} or fewer?</strong> No reservation needed. Just walk in. Want to skip the wait? <a href="/menu" className="font-semibold text-ketchup underline">Order ahead for pickup</a>.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl border border-line bg-card p-4">
              <UsersIcon className="mt-0.5 shrink-0 text-ketchup" />
              <p className="text-sm leading-6">
                <strong>More than {RESTAURANT.reservations.maxParty}?</strong> Call <a href={`tel:${RESTAURANT.phoneE164}`} className="font-semibold text-ketchup underline">{RESTAURANT.phoneDisplay}</a> and we&apos;ll plan it together.
              </p>
            </div>
          </div>
        </div>
        <ReservationForm today={today} />
      </div>
    </div>
  );
}
