import type { Metadata, Viewport } from "next";
import { FULL_ADDRESS, RESTAURANT } from "@/lib/restaurant";
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
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Zen+Maru+Gothic:wght@700&display=swap"
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
