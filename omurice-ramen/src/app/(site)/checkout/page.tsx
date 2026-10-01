import type { Metadata } from "next";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Checkout</h1>
      <p className="mt-2 text-ink-3">Pickup only · you pay when you arrive</p>
      <CheckoutForm />
    </div>
  );
}
