// The restaurant knowledge both AI agents share. Kept byte-stable between requests
// (no timestamps) so it stays in the prompt cache; live context goes in `liveContext()`.

import { faqsForPrompt } from "../faq.ts";
import { formatDateLocal, hoursSummary, openStatus, pickupSlots, zonedParts, formatClock } from "../hours.ts";
import { menuForPrompt } from "../menu.ts";
import { FULL_ADDRESS, RESTAURANT } from "../restaurant.ts";
import { getSettings } from "../settings.ts";

export function restaurantKnowledge(): string {
  const R = RESTAURANT;
  return `# ${R.name}
Address: ${FULL_ADDRESS}. Free parking in the lot in front.
Phone: ${R.phoneDisplay}. Website: omuriceramen.com
Cuisine: Japanese comfort food. Ramen, omurice (omelet over fried rice), appetizers, boba milk tea and fruit tea.
Rating: ${R.rating.stars} stars from ${R.rating.count}+ reviews.

## Hours (America/Detroit)
${hoursSummary()
  .map((h) => `- ${h.days}: ${h.hours}`)
  .join("\n")}
Online/phone orders close ${R.ordering.lastOrderBeforeCloseMin} minutes before closing.

## Ordering policies
- Pickup only. Customers order on the website (/menu) or by phone. Orders can be placed ASAP while open or scheduled for a later time today or the next open day.
- Payment: pay at pickup in the restaurant (cash or card). We cannot take card numbers over the phone or in chat.
- Delivery: we don't deliver ourselves; customers can use DoorDash, but ordering pickup direct is cheaper.
- Orders over $${R.ordering.maxUnpaidOrderCents / 100} or catering must be arranged with staff.
- Michigan sales tax of ${(R.ordering.taxRate * 100).toFixed(0)}% is added.
- Customers get a text confirmation and a text when the order is ready.

## Reservations
- Only for groups of ${R.reservations.minParty} to ${R.reservations.maxParty} guests. Groups of ${R.reservations.minParty - 1} or fewer just walk in (no reservation needed).
- Groups over ${R.reservations.maxParty}: must talk to staff.
- Book up to ${R.reservations.maxDaysAhead} days ahead, at least ${R.reservations.minLeadMinutes / 60} hours in advance, last seating ${R.reservations.lastSeatingBeforeCloseMin} minutes before closing.
- Website booking page: /reservations

## Menu (item ids in brackets; prices before tax)
${menuForPrompt()}

## FAQ
${faqsForPrompt()}`;
}

/** Live facts (time, open status, pauses). Changes every request, so it goes last. */
export function liveContext(now = new Date()): string {
  const s = getSettings();
  const z = zonedParts(now);
  const status = openStatus(now, s.closures);
  const slots = pickupSlots(now, { prepMinutes: s.prepMinutes, closures: s.closures, paused: s.orderingPaused });
  const upcomingClosures = s.closures.filter((d) => d >= z.date).slice(0, 5);
  return [
    `Current local time: ${formatDateLocal(z.date)}, ${formatClock(z.minutes)} (date ${z.date}).`,
    `Restaurant status: ${status.label}.`,
    `Current prep time for pickup orders: about ${s.prepMinutes} minutes.`,
    s.orderingPaused ? "ONLINE/PHONE ORDERING IS PAUSED right now. Do not take orders; offer to connect to staff." : "",
    s.reservationsPaused ? "RESERVATIONS ARE PAUSED right now; offer to connect to staff." : "",
    !s.orderingPaused && slots.length ? `Earliest pickup option: ${slots[0].label}.` : "",
    upcomingClosures.length ? `Special closures (closed all day): ${upcomingClosures.map(formatDateLocal).join(", ")}.` : "",
    s.announcement ? `Current announcement: ${s.announcement}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
