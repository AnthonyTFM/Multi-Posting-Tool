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

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <circle cx="20" cy="20" r="20" fill="#f6b91a" />
        <path d="M8 24 C8 13, 32 13, 32 24 Q20 27 8 24 Z" fill="#ffd96a" />
        <path d="M12 20 l3 -3 l3 3 l3 -3 l3 3 l3 -3" stroke="#d23a2a" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 27 h24" stroke="#1d1a16" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className={`block font-display text-[1.35rem] font-extrabold tracking-tight ${light ? "text-rice" : "text-ink"}`}>
          omurice
        </span>
        <span className={`block text-[0.62rem] font-semibold uppercase tracking-[0.22em] ${light ? "text-yolk-2" : "text-ketchup"}`}>
          Ramen &amp; Boba
        </span>
      </span>
    </span>
  );
}

export function SiteHeader({ phoneDisplay, phoneE164 }: { phoneDisplay: string; phoneE164: string }) {
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
        </nav>
      )}
    </header>
  );
}
