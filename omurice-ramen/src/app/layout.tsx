import type { Metadata, Viewport } from "next";
import { FULL_ADDRESS, RESTAURANT } from "@/lib/restaurant";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";
import "@fontsource/shippori-mincho-b1/700.css";
import "@fontsource/shippori-mincho-b1/800.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL || "https://omuriceramen.com"),
  title: {
    default: `${RESTAURANT.name} | Ramen, Omurice & Boba in Battle Creek, MI`,
    template: `%s | ${RESTAURANT.shortName}`,
  },
  description: `Handcrafted ramen, fluffy Japanese omurice and fresh boba tea at ${FULL_ADDRESS}. Order pickup online, book a table for groups of 6+, or call ${RESTAURANT.phoneDisplay}.`,
  openGraph: {
    type: "website",
    siteName: RESTAURANT.name,
    locale: "en_US",
  },
  icons: { icon: "/brand/logo.png", apple: "/brand/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#121110",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
