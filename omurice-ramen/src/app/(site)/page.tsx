import Link from "next/link";
import { AskButton } from "@/components/AskButton";
import { Gallery } from "@/components/Gallery";
import { HeroBackground } from "@/components/HeroBackground";
import { ArrowIcon, BagIcon, ClockIcon, PhoneIcon, PinIcon, StarIcon, UsersIcon } from "@/components/icons";
import { ItemGrid } from "@/components/MenuBrowser";
import { ReviewsCarousel, Stars } from "@/components/ReviewsCarousel";
import { InstagramIcon } from "@/components/SiteHeader";
import { listFaqs } from "@/lib/faq";
import { hoursSummary, openStatus } from "@/lib/hours";
import { siteMedia } from "@/lib/media";
import { getMenu } from "@/lib/menu";
import { getGoogleReviews } from "@/lib/reviews";
import { FULL_ADDRESS, RESTAURANT } from "@/lib/restaurant";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = getSettings();
  const google = await getGoogleReviews();
  const rating = google ? { stars: google.rating, count: google.count } : RESTAURANT.rating;
  const status = openStatus(new Date(), settings.closures);
  const { hero, gallery } = siteMedia();
  const menu = getMenu();
  const popular = menu.categories
    .flatMap((c) => c.items.filter((i) => i.popular && !i.soldOut).map((item) => ({ item, art: c.art })))
    .slice(0, 6);
  const faqs = listFaqs().slice(0, 4);
  const ig = settings.socials.instagram;

  return (
    <>
      {/* Hero: the photo/video chosen in /admin/media, else the dining-room video */}
      <section className="wood-wall relative isolate overflow-hidden text-rice">
        <HeroBackground kind={hero.kind} src={hero.url} mime={hero.mime} poster={hero.poster} webmSrc={hero.webm} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/55 to-ink/20 md:bg-gradient-to-r md:from-ink/90 md:via-ink/55 md:to-ink/10" />

        <div className={`mx-auto flex min-h-[620px] max-w-6xl flex-col justify-end px-4 pb-20 sm:px-6 md:min-h-[700px] md:justify-center md:pb-24 pt-28 md:pt-24`}>
          <div className="animate-rise max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur ${status.open ? "bg-white/10 text-neon" : "bg-white/10 text-rice/80"}`}>
                <span className={`h-2 w-2 rounded-full ${status.open ? "bg-[#7fe0a0] shadow-[0_0_10px_#7fe0a0]" : "bg-rice/50"}`} />
                {status.label}
              </span>
              <span className="eyebrow flex items-center gap-2 text-rice/70">
                <span className="hanko px-1 py-0.5 text-[0.7rem]" aria-hidden>麺</span> Battle Creek, Michigan
              </span>
            </div>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.08] sm:text-6xl md:text-[4.2rem]">
              Authentic Japanese <span className="text-yolk-2">omurice</span>, ramen &amp; boba.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-rice/80">
              Slow-simmered broths, silky omelet rice and handcrafted teas. Order ahead for pickup, or call anytime. Our AI host answers 24/7.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="inline-flex h-13 items-center gap-2 rounded-full bg-seal px-7 text-base font-semibold text-white shadow-lift transition hover:bg-seal-2">
                <BagIcon width={18} height={18} /> Order pickup
              </Link>
              <Link href="/reservations" className="inline-flex h-13 items-center gap-2 rounded-full border border-rice/50 px-6 text-base font-semibold text-rice backdrop-blur transition hover:bg-rice hover:text-ink">
                <UsersIcon width={18} height={18} /> Book for 6+
              </Link>
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-rice/75">
              <div className="flex items-center gap-1.5">
                <StarIcon width={16} height={16} className="text-yolk" />
                <dt className="sr-only">Rating</dt>
                <dd><strong className="text-rice">{rating.stars.toFixed(1)}</strong> · {rating.count.toLocaleString()}{google ? "" : "+"} Google reviews</dd>
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
        </div>
      </section>

      {/* Quick actions */}
      <section className="relative mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/menu" className="group rounded-2xl border border-line bg-card p-6 shadow-lift transition hover:-translate-y-0.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-seal text-white"><BagIcon /></span>
            <h2 className="mt-4 text-xl font-bold">Order online</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">Pick your sauce, toppings and extras. Choose ASAP or a later time. Pay when you arrive.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-seal">Start an order <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-0.5" /></span>
          </Link>
          <a href={`tel:${RESTAURANT.phoneE164}`} className="group rounded-2xl border border-line bg-card p-6 shadow-lift transition hover:-translate-y-0.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-neon"><PhoneIcon /></span>
            <h2 className="mt-4 text-xl font-bold">Call {RESTAURANT.phoneDisplay}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">Our AI host answers instantly: pickup orders, group bookings, questions. Say “team member” to reach our staff.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-seal">Tap to call <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-0.5" /></span>
          </a>
          <Link href="/reservations" className="group rounded-2xl border border-line bg-card p-6 shadow-lift transition hover:-translate-y-0.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yolk text-ink"><UsersIcon /></span>
            <h2 className="mt-4 text-xl font-bold">Coming as a group?</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">We reserve tables for parties of 6 to 20. Birthdays, team lunches, family night. Smaller groups walk right in.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-seal">Book a table <ArrowIcon width={16} height={16} className="transition group-hover:translate-x-0.5" /></span>
          </Link>
        </div>
      </section>

      {/* Google reviews, rotating */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6" aria-labelledby="reviews-heading">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
          <div>
            <p className="eyebrow text-seal">Google reviews</p>
            <h2 id="reviews-heading" className="mt-2 text-4xl font-extrabold">What guests are saying</h2>
            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-6xl font-extrabold leading-none">{rating.stars.toFixed(1)}</span>
              <span className="pb-1">
                <Stars value={rating.stars} size={22} />
                <span className="block text-sm text-ink-3">{rating.count.toLocaleString()}{google ? "" : "+"} reviews on Google</span>
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={google?.placeUrl ?? RESTAURANT.mapsUrl} target="_blank" rel="noopener" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-rice hover:bg-ink-2">
                Read all reviews
              </a>
              {google && (
                <a href={google.writeReviewUrl} target="_blank" rel="noopener" className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-line hover:ring-ink">
                  Write a review
                </a>
              )}
            </div>
            <p className="mt-5 text-xs text-[#5e5e5e]" translate="no" style={{ fontFamily: "Roboto, Arial, sans-serif" }}>
              Google Maps
            </p>
          </div>
          {google && google.reviews.length > 0 ? (
            <ReviewsCarousel reviews={google.reviews} />
          ) : (
            <a
              href={RESTAURANT.mapsUrl}
              target="_blank"
              rel="noopener"
              className="group flex min-h-[220px] flex-col justify-center rounded-3xl border border-line bg-card p-8 shadow-soft transition hover:shadow-lift"
            >
              <Stars value={rating.stars} size={26} />
              <span className="mt-4 block font-display text-3xl font-extrabold">Rated {rating.stars.toFixed(1)} by Battle Creek</span>
              <span className="mt-2 block text-ink-3">Read what {rating.count.toLocaleString()}+ guests say about our ramen, omurice and boba on Google.</span>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-seal">
                See reviews on Google <ArrowIcon width={18} height={18} className="transition group-hover:translate-x-0.5" />
              </span>
            </a>
          )}
        </div>
      </section>

      {/* Favorites */}
      {popular.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-seal">Fan favorites</p>
              <h2 className="mt-2 text-4xl font-extrabold">What Battle Creek orders most</h2>
            </div>
            <Link href="/menu" className="inline-flex items-center gap-1 font-semibold text-ink hover:text-seal">
              Full menu <ArrowIcon width={18} height={18} />
            </Link>
          </div>
          <div className="mt-8">
            <ItemGrid items={popular} orderingOpen={!settings.orderingPaused} />
          </div>
        </section>
      )}

      {/* From our kitchen (owner's photos & reels) */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        {gallery.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-seal">@{RESTAURANT.instagramHandle}</p>
                <h2 className="mt-2 text-4xl font-extrabold">From our kitchen</h2>
              </div>
              {ig && (
                <a href={ig} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-rice hover:bg-ink-2">
                  <InstagramIcon width={18} height={18} /> Follow on Instagram
                </a>
              )}
            </div>
            <div className="mt-8">
              <Gallery items={gallery} />
            </div>
          </>
        ) : (
          ig && (
            <a href={ig} target="_blank" rel="noopener" className="group flex flex-wrap items-center gap-6 rounded-[2rem] border border-line bg-card p-8 shadow-soft transition hover:shadow-lift">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white"><InstagramIcon width={30} height={30} /></span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block text-seal">@{RESTAURANT.instagramHandle}</span>
                <span className="mt-1 block font-display text-2xl font-extrabold">Broth pours, omurice folds &amp; new boba drops</span>
                <span className="block text-ink-3">Follow us on Instagram for daily specials.</span>
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-seal">Follow <ArrowIcon width={18} height={18} className="transition group-hover:translate-x-0.5" /></span>
            </a>
          )
        )}
      </section>

      {/* Direct ordering band */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-seal px-6 py-12 text-white sm:px-12">
          <p className="absolute -right-4 -top-8 font-jp text-[9rem] leading-none text-white/10" aria-hidden>ラーメン</p>
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-4xl font-extrabold sm:text-5xl">Order direct. Pay less.</h2>
              <p className="mt-4 max-w-lg text-lg leading-8 text-white/85">
                Delivery apps list our menu at higher prices and take a cut. Order pickup here and you get our in-store prices, every time. 100% of your order supports our kitchen.
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {["In-store menu prices", `Ready in about ${settings.prepMinutes} minutes`, "Text alert when it's ready", "No account, no app, no fees"].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-xl bg-black/15 px-4 py-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-seal">✓</span>
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
          <p className="eyebrow text-seal">Visit us</p>
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
            <PinIcon className="mt-0.5 shrink-0 text-seal" />
            <div>
              <p className="font-semibold">{RESTAURANT.address.line1}</p>
              <p className="text-ink-3">{RESTAURANT.address.city}, {RESTAURANT.address.state} {RESTAURANT.address.zip}</p>
              <a href={RESTAURANT.mapsUrl} target="_blank" rel="noopener" className="mt-1 inline-block text-sm font-semibold text-seal hover:underline">Get directions →</a>
            </div>
          </div>
        </div>
        <a
          href={RESTAURANT.mapsUrl}
          target="_blank"
          rel="noopener"
          className="group relative min-h-[340px] overflow-hidden rounded-[2rem] border border-line bg-ink shadow-soft"
          aria-label={`Get directions to ${FULL_ADDRESS}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/interior.jpg"
            alt="The glowing Omurice Ramen sign above our counter, with hanging plants and booth seating"
            className="absolute inset-0 h-full w-full object-cover object-[70%_45%] transition duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-6 text-rice">
            <span>
              <span className="eyebrow block text-rice/70">Look for the glowing sign</span>
              <span className="mt-1 block font-display text-2xl font-extrabold">{RESTAURANT.address.line1}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-rice px-4 py-2 text-sm font-semibold text-ink">
              <PinIcon width={16} height={16} /> Directions
            </span>
          </span>
        </a>
      </section>

      {/* FAQ teaser */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="eyebrow text-seal">Good to know</p>
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
