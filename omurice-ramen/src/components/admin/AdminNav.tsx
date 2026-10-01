"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../SiteHeader";

const TABS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/calls", label: "AI Calls" },
  { href: "/admin/settings", label: "Settings & FAQ" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 bg-ink text-rice print:hidden">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/admin" className="py-3">
          <Logo light />
        </Link>
        <nav className="no-scrollbar flex flex-1 gap-1 overflow-x-auto" aria-label="Dashboard">
          {TABS.map((t) => {
            const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-yolk text-ink" : "text-rice/75 hover:bg-white/10 hover:text-rice"}`}
                aria-current={on ? "page" : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/" target="_blank" className="hidden text-sm text-rice/60 hover:text-rice md:block">View site ↗</Link>
        <button
          type="button"
          className="text-sm text-rice/60 hover:text-rice"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
