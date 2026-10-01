import type { Metadata } from "next";
import { AskButton } from "@/components/AskButton";
import { listFaqs } from "@/lib/faq";
import { hoursSummary } from "@/lib/hours";
import { RESTAURANT } from "@/lib/restaurant";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Hours, reservations, payment, allergens, parking and more at Omurice Ramen & Boba Tea in Battle Creek.",
};

export default function FaqPage() {
  const faqs = listFaqs();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="eyebrow text-seal">Help</p>
      <h1 className="mt-2 text-5xl font-extrabold">Frequently asked</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-yolk-soft p-5">
        <p className="flex-1 text-sm leading-6">
          <strong>Can&apos;t find it?</strong> Our AI assistant knows the menu, hours and policies, and answers instantly.
        </p>
        <AskButton />
      </div>

      <div className="mt-8 space-y-3">
        <details className="group rounded-2xl border border-line bg-card px-5 py-4 shadow-soft" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
            What are your hours?
            <span className="text-xl text-ink-3 transition group-open:rotate-45">+</span>
          </summary>
          <dl className="mt-3 space-y-1 text-sm">
            {hoursSummary().map((h) => (
              <div key={h.days} className="flex justify-between"><dt className="text-ink-2">{h.days}</dt><dd className="font-semibold">{h.hours}</dd></div>
            ))}
          </dl>
        </details>
        {faqs.map((f) => (
          <details key={f.id} className="group rounded-2xl border border-line bg-card px-5 py-4 shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
              {f.question}
              <span className="text-xl text-ink-3 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-7 text-ink-2">{f.answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-center text-ink-3">
        Still stuck? Call <a href={`tel:${RESTAURANT.phoneE164}`} className="font-semibold text-seal">{RESTAURANT.phoneDisplay}</a>.
      </p>
    </div>
  );
}
