import type { Metadata } from "next";
import { MenuBrowser } from "@/components/MenuBrowser";
import { openStatus } from "@/lib/hours";
import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Menu & Online Ordering",
  description: "Order ramen, omurice, appetizers and boba tea for pickup. Customize every bowl and drink, pay at pickup.",
};

export default function MenuPage() {
  const settings = getSettings();
  const status = openStatus(new Date(), settings.closures);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-seal">Pickup · pay in store</p>
          <h1 className="mt-2 text-5xl font-extrabold sm:text-6xl">Menu</h1>
        </div>
        <p className={`rounded-full px-3 py-1.5 text-sm font-medium ${status.open ? "bg-matcha/15 text-[#3f6a24]" : "bg-ink/5 text-ink-2"}`}>
          {status.label}
          {!status.open && " · schedule ahead"}
        </p>
      </header>
      <div className="mt-6">
        <MenuBrowser menu={getMenu()} orderingOpen={!settings.orderingPaused} />
      </div>
    </div>
  );
}
