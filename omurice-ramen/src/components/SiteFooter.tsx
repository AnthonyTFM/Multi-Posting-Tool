import Link from "next/link";
import { hoursSummary } from "@/lib/hours";
import { FULL_ADDRESS, RESTAURANT } from "@/lib/restaurant";
import type { Socials } from "@/lib/settings";
import { StarIcon } from "./icons";
import { InstagramIcon, Logo } from "./SiteHeader";

export function SiteFooter({ socials, rating }: { socials: Socials; rating: { stars: number; count: number } }) {
  return (
    <footer className="mt-24 bg-ink text-rice">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-rice/70">{RESTAURANT.tagline}.</p>
          <p className="mt-4 flex items-center gap-1.5 text-sm text-yolk-2">
            <StarIcon width={16} height={16} /> {rating.stars.toFixed(1)} from {rating.count.toLocaleString()} Google reviews
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {socials.instagram && (
              <a href={socials.instagram} target="_blank" rel="noopener" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">
                <InstagramIcon width={16} height={16} /> @{RESTAURANT.instagramHandle}
              </a>
            )}
            {socials.facebook && <a href={socials.facebook} target="_blank" rel="noopener" className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">Facebook</a>}
            {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noopener" className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">TikTok</a>}
          </div>
          <p className="mt-6 font-jp text-2xl text-rice/40" aria-hidden>
            オムライス・ラーメン
          </p>
        </div>

        <div>
          <h3 className="eyebrow text-rice/50">Hours</h3>
          <dl className="mt-4 space-y-2 text-sm">
            {hoursSummary().map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt className="text-rice/70">{h.days}</dt>
                <dd className="font-medium">{h.hours}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3 className="eyebrow text-rice/50">Visit</h3>
          <address className="mt-4 text-sm not-italic leading-6">
            {RESTAURANT.address.line1}
            <br />
            {RESTAURANT.address.city}, {RESTAURANT.address.state} {RESTAURANT.address.zip}
          </address>
          <a href={RESTAURANT.mapsUrl} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-semibold text-yolk-2 hover:underline" aria-label={`Get directions to ${FULL_ADDRESS}`}>
            Get directions →
          </a>
          <a href={`tel:${RESTAURANT.phoneE164}`} className="mt-4 block text-lg font-semibold hover:text-yolk-2">
            {RESTAURANT.phoneDisplay}
          </a>
          <p className="text-xs text-rice/60">Our AI host answers 24/7. Ask for a team member anytime.</p>
        </div>

        <div>
          <h3 className="eyebrow text-rice/50">Order</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/menu" className="hover:text-yolk-2">Order pickup</Link></li>
            <li><Link href="/reservations" className="hover:text-yolk-2">Book a group table (6+)</Link></li>
            <li><Link href="/faq" className="hover:text-yolk-2">FAQ</Link></li>
            <li>
              <a href={RESTAURANT.doordashUrl} target="_blank" rel="noopener" className="text-rice/70 hover:text-yolk-2">
                Delivery via DoorDash
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-rice/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-rice/50 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {RESTAURANT.name}. All rights reserved.</p>
          <p>Pay at pickup · Cash &amp; cards accepted</p>
        </div>
      </div>
    </footer>
  );
}
