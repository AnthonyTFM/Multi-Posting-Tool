import Link from "next/link";
import { AskButton } from "@/components/AskButton";
import { ArrowIcon, BagIcon, ClockIcon, PhoneIcon, PinIcon, StarIcon, UsersIcon } from "@/components/icons";
import { ItemArt } from "@/components/ItemArt";
import { ItemGrid } from "@/components/MenuBrowser";
import { listFaqs } from "@/lib/faq";
import { hoursSummary, openStatus } from "@/lib/hours";
import { getMenu } from "@/lib/menu";
import { FULL_ADDRESS, RESTAURANT } from "@/lib/restaurant";
import { getSettings } from "@/lib/settings";

export default function HomePage() {
  const settings = getSettings();
  const status = openStatus(new Date(), settings.closures);
  const menu = getMenu();
  const popular = menu.categories
    .flatMap((c) => c.items.filter((i) => i.popular && !i.soldOut).map((item) => ({ item, art: c.art })))
    .slice(0, 6);
  const faqs = listFaqs().slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-16">
          <div className="animate-rise">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${status.open ? "bg-matcha/15 text-[#3f6a24]" : "bg-ink/5 text-ink-2"}`}
            >
              <span className={`h-2 w-2 rounded-full ${status.open ? "bg-matcha" : "bg-ink-3"}`} />
              {status.label}
            </span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl md:text-[4.1rem]">
              Ramen, <span className="text-ketchup">omurice</span> &amp; boba, made fresh in Battle Creek.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-2">
              Rich tonkotsu, fluffy Japanese omelet rice and handcrafted milk teas. Order ahead for pickup, or just call. Our AI host takes your order 24/7.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="inline-flex h-13 items-center gap-2 rounded-full bg-ketchup px-7 text-base font-semibold text-white shadow-soft transition hover:bg-ketchup-2">
                <BagIcon width={18} height={18} /> Order pickup
              </Link>
              <Link href="/reservations" className="inline-flex h-13 items-center gap-2 rounded-full border-2 border-ink px-6 text-base font-semibold transition hover:bg-ink hover:text-rice">
                <UsersIcon width={18} height={18} /> Book for 6+
              </Link>
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
              <div className="flex items-center gap-1.5">
                <StarIcon width={16} height={16} className="text-yolk" />
                <dt className="sr-only">Rating</dt>
                <dd><strong className="text-ink">{RESTAURANT.rating.stars}</strong> · {RESTAURANT.rating.count}+ reviews</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon width={16} height={16} />
                <dt className="sr-only">Pickup time</dt>
                <dd>Ready in ~{settings.prepMinutes} min</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <BagIcon width={16} height={16} />
                <dt className="sr-only">Payment</dt>
                <dd>Pay at pickup</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
            <div className="absolute inset-[6%] rounded-full bg-ketchup" />
            <div className="absolute inset-[14%] rounded-full bg-[#e2513f]" />
            <p className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-jp text-5xl text-ink/10 sm:text-6xl">オムライス</p>
            <ItemArt art="omurice" className="absolute left-[8%] top-[16%] w-[72%] drop-shadow-xl" />
            <div className="absolute bottom-[4%] right-[2%] w-[44%] rotate-6 rounded-[2rem] bg-[#fde6c8] p-3 shadow-lift">
              <ItemArt art="ramen" className="w-full" />
            </div>
            <div className="absolute bottom-[10%] left-[0%] w-[30%] -rotate-6 rounded-[1.6rem] bg-[#efe6fb] p-2 shadow-lift">
              <ItemArt art="boba" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mx-auto -mt-6 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/menu" className="group rounded-2xl border border-line bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ketchup text-white"><BagIcon /></span>
            <h2 className="mt-4 text-xl font-bold">Order online</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">Customize spice, toppings and sweetness. Pick ASAP or a later time. Pay when you arrive.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ketchup">Start an order <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-0.5" /></span>
          </Link>
          <a href={`tel:${RESTAURANT.phoneE164}`} className="group rounded-2xl border border-line bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-yolk"><PhoneIcon /></span>
            <h2 className="mt-4 text-xl font-bold">Call {RESTAURANT.phoneDisplay}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">Our AI host answers instantly: pickup orders, group bookings, questions. Say “team member” to reach our staff.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ketchup">Tap to call <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-0.5" /></span>
          </a>
          <Link href="/reservations" className="group rounded-2xl border border-line bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yolk text-ink"><UsersIcon /></span>
            <h2 className="mt-4 text-xl font-bold">Coming as a group?</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">We reserve tables for parties of 6 to 20. Birthdays, team lunches, family night. Smaller groups walk right in.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ketchup">Book a table <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-0.5" /></span>
          </Link>
        </div>
      </section>

      {/* Favorites */}
      {popular.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ketchup">Fan favorites</p>
              <h2 className="mt-2 text-4xl font-extrabold">What Battle Creek orders most</h2>
            </div>
            <Link href="/menu" className="inline-flex items-center gap-1 font-semibold text-ink hover:text-ketchup">
              Full menu <ArrowIcon width={18} height={18} />
            </Link>
          </div>
          <div className="mt-8">
            <ItemGrid items={popular} orderingOpen={!settings.orderingPaused} />
          </div>
        </section>
      )}

      {/* Direct ordering band */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-rice sm:px-12">
          <p className="absolute -right-6 -top-6 font-jp text-[9rem] leading-none text-white/5" aria-hidden>ラーメン</p>
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-4xl font-extrabold sm:text-5xl">Order direct. <span className="text-yolk">Pay less.</span></h2>
              <p className="mt-4 max-w-lg text-lg leading-8 text-rice/75">
                Delivery apps list our menu at higher prices and take a cut. Order pickup here and you get our in-store prices, every time. 100% of your order supports our kitchen.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {["In-store menu prices", "Ready in about " + settings.prepMinutes + " minutes", "Text alert when it's ready", "No account, no app, no fees"].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yolk text-xs font-bold text-ink">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Hours & location */}
      <section className="mx-auto mt-20 grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2">
        <div className="rounded-[2rem] border border-line bg-card p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ketchup">Visit us</p>
          <h2 className="mt-2 text-3xl font-extrabold">Hours &amp; location</h2>
          <dl className="mt-6 divide-y divide-line">
            {hoursSummary().map((h) => (
              <div key={h.days} className="flex justify-between py-3">
                <dt className="text-ink-2">{h.days}</dt>
                <dd className="font-semibold">{h.hours}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex items-start gap-3">
            <PinIcon className="mt-0.5 shrink-0 text-ketchup" />
            <div>
              <p className="font-semibold">{RESTAURANT.address.line1}</p>
              <p className="text-ink-3">{RESTAURANT.address.city}, {RESTAURANT.address.state} {RESTAURANT.address.zip}</p>
              <a href={RESTAURANT.mapsUrl} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-ketchup hover:underline">Get directions →</a>
            </div>
          </div>
        </div>
        <div className="min-h-[320px] overflow-hidden rounded-[2rem] border border-line bg-rice-2 shadow-soft">
          <iframe
            title={`Map to ${FULL_ADDRESS}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(FULL_ADDRESS)}&output=embed`}
            className="h-full min-h-[320px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ketchup">Good to know</p>
            <h2 className="mt-2 text-4xl font-extrabold">Questions? We&apos;ve got answers.</h2>
            <p className="mt-3 text-ink-2">Ask our AI assistant anything about the menu, allergens, parking or groups. It answers in seconds.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AskButton />
              <Link href="/faq" className="inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold ring-1 ring-line hover:ring-ink">All FAQs</Link>
            </div>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.id} className="group rounded-2xl border border-line bg-card px-5 py-4 shadow-soft open:shadow-lift">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.question}
                  <span className="text-xl text-ink-3 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-ink-2">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
