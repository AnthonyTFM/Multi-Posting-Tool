"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { BagIcon, CloseIcon, MenuIcon, PhoneIcon } from "./icons";

const NAV = [
  { href: "/menu", label: "Menu & Order" },
  { href: "/reservations", label: "Group Reservations" },
  { href: "/faq", label: "FAQ" },
];

// The round badge is the restaurant's own logo (from Instagram). Replace
// public/brand/logo.png with the original artwork for a sharper version.
export function Logo({ light = false, size = 44 }: { light?: boolean; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="" width={size} height={size} className={`shrink-0 rounded-full bg-white ${light ? "" : "ring-1 ring-line"}`} />
      <span className="leading-none">
        <span className={`block font-display text-[1.25rem] font-extrabold ${light ? "text-rice" : "text-ink"}`}>Omurice Ramen</span>
        <span className={`mt-1 block font-[family-name:var(--font-cond)] text-[0.66rem] font-medium uppercase tracking-[0.28em] ${light ? "text-rice/60" : "text-seal"}`}>
          &amp; Boba Tea
        </span>
      </span>
    </span>
  );
}

export function InstagramIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteHeader({ phoneDisplay, phoneE164, instagramUrl }: { phoneDisplay: string; phoneE164: string; instagramUrl: string }) {
  const { count, setOpen } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-rice/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="mr-auto" aria-label="Omurice Ramen home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition hover:bg-rice-2 ${pathname.startsWith(n.href) ? "text-ink" : "text-ink-2"}`}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noopener" className="hidden h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-rice-2 hover:text-ink md:flex" aria-label="Instagram">
            <InstagramIcon />
          </a>
        )}
        <a href={`tel:${phoneE164}`} className="hidden items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink lg:flex">
          <PhoneIcon width={16} height={16} /> {phoneDisplay}
        </a>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-rice transition hover:bg-ink-2"
          aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
        >
          <BagIcon width={18} height={18} />
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-yolk px-1.5 text-xs font-bold text-ink">{count}</span>
          )}
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-rice-2 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label="Menu"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-rice px-4 pb-4 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="block border-b border-line/60 py-3.5 text-base font-semibold">
              {n.label}
            </Link>
          ))}
          <a href={`tel:${phoneE164}`} className="flex items-center gap-2 py-3.5 text-base font-semibold">
            <PhoneIcon width={18} height={18} /> Call {phoneDisplay}
          </a>
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener" className="flex items-center gap-2 py-3.5 text-base font-semibold">
              <InstagramIcon width={18} height={18} /> Instagram
            </a>
          )}
        </nav>
      )}
    </header>
  );
}
