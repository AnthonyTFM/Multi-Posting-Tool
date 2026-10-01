import { CartDrawer } from "@/components/CartDrawer";
import { CartProvider } from "@/components/CartProvider";
import { ChatWidget } from "@/components/ChatWidget";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { RESTAURANT } from "@/lib/restaurant";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  const banner = settings.orderingPaused
    ? `Online ordering is paused right now. Call ${RESTAURANT.phoneDisplay} and we'll take care of you.`
    : settings.announcement;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: RESTAURANT.name,
    servesCuisine: ["Japanese", "Ramen", "Bubble Tea"],
    telephone: RESTAURANT.phoneE164,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: RESTAURANT.address.line1,
      addressLocality: RESTAURANT.address.city,
      addressRegion: RESTAURANT.address.state,
      postalCode: RESTAURANT.address.zip,
      addressCountry: "US",
    },
    acceptsReservations: "True",
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "11:00", closes: "21:30" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Friday", "Saturday"], opens: "11:00", closes: "22:30" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "12:00", closes: "21:30" },
    ],
    sameAs: Object.values(settings.socials).filter(Boolean),
    aggregateRating: { "@type": "AggregateRating", ratingValue: RESTAURANT.rating.stars, reviewCount: RESTAURANT.rating.count },
  };

  return (
    <CartProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {banner && (
        <div className="bg-seal px-4 py-2 text-center text-sm font-medium text-white" role="status">
          {banner}
        </div>
      )}
      <SiteHeader phoneDisplay={RESTAURANT.phoneDisplay} phoneE164={RESTAURANT.phoneE164} instagramUrl={settings.socials.instagram} />
      <main>{children}</main>
      <SiteFooter socials={settings.socials} />
      <CartDrawer />
      <ChatWidget />
    </CartProvider>
  );
}
