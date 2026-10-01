"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import { Stars } from "@/components/ReviewsCarousel";
import type { ManualReview } from "@/lib/reviews";

type Data = { reviews: ManualReview[]; rating: number; count: number; placeId: string; apiConnected: boolean };
type Draft = { id?: number; author: string; rating: number; text: string; source: string; when: string; url: string; active?: boolean };

const EMPTY: Draft = { author: "", rating: 5, text: "", source: "Google", when: "", url: "" };
const field = "mt-1 w-full rounded-lg border border-line bg-rice px-3 py-2 text-sm outline-none focus:border-ink";

function ReviewForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => Promise<void>; onCancel?: () => void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          await onSave(d);
          if (!initial.id) setD(EMPTY);
        } catch (x) {
          setErr(x instanceof Error ? x.message : "Couldn't save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="text-xs font-semibold">
        Reviewer name (as shown on Google)
        <input className={field} value={d.author} onChange={(e) => setD({ ...d, author: e.target.value })} placeholder="e.g. Jordan M." required maxLength={60} />
      </label>
      <div className="text-xs font-semibold">
        Stars
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setD({ ...d, rating: n })}
              className={`h-9 w-9 rounded-lg text-lg ${n <= d.rating ? "bg-yolk text-ink" : "bg-rice text-ink-3 ring-1 ring-line"}`}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={n === d.rating}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <label className="text-xs font-semibold md:col-span-2">
        Review text (paste it exactly; don&apos;t change the wording)
        <textarea className={field} rows={4} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} required maxLength={2000} />
      </label>
      <label className="text-xs font-semibold">
        Where it was posted
        <select className={field} value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })}>
          {["Google", "Yelp", "Facebook", "Other"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold">
        When (optional)
        <input className={field} value={d.when} onChange={(e) => setD({ ...d, when: e.target.value })} placeholder="e.g. September 2026 or 2 weeks ago" maxLength={40} />
      </label>
      <label className="text-xs font-semibold md:col-span-2">
        Link to the review (optional; in Google Maps: review → Share → Copy link)
        <input className={field} value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
      </label>
      {err && <p className="text-sm font-medium text-seal md:col-span-2">{err}</p>}
      <div className="flex gap-2 md:col-span-2">
        <button disabled={busy} className="rounded-full bg-seal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{initial.id ? "Save changes" : "Add review"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-3 text-sm text-ink-3">Cancel</button>}
      </div>
    </form>
  );
}

export default function ReviewsAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [summary, setSummary] = useState({ rating: "", count: "", placeId: "" });
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const d = await adminFetch<Data>("/api/admin/reviews");
    setData(d);
    setSummary({ rating: d.rating.toFixed(1), count: String(d.count), placeId: d.placeId });
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (d: Draft) => setData(await adminFetch<Data>("/api/admin/reviews", { method: "POST", body: d }));

  if (!data) return <p className="text-ink-3">Loading…</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-extrabold">Reviews</h1>
      <p className="mt-1 text-sm text-ink-3">These rotate on the home page in a shuffled carousel. No Google account or setup needed.</p>

      <details className="mt-5 rounded-2xl border border-line bg-card px-5 py-4 text-sm" open={data.reviews.length === 0}>
        <summary className="cursor-pointer font-semibold">How to copy a review from Google (30 seconds)</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-2">
          <li>On your phone, open <strong>Google Maps</strong>, search <strong>Omurice Ramen Battle Creek</strong>, tap <strong>Reviews</strong>. No sign-in needed.</li>
          <li>Pick a review. Tap <strong>More</strong> to expand it, then press and hold the text → <strong>Copy</strong>.</li>
          <li>Paste it below with the reviewer&apos;s name and stars exactly as shown. For the link: tap the review&apos;s ⋮ or Share → <strong>Copy link</strong>.</li>
        </ol>
        <p className="mt-3 rounded-lg bg-yolk-soft px-3 py-2 text-ink-2">
          <strong>Rules that keep you safe:</strong> only real customer reviews, copied word-for-word. Don&apos;t edit wording, write reviews yourself, or post ones from staff or family. That&apos;s what the FTC&apos;s fake-review rule penalizes.
        </p>
      </details>

      <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Your Google rating</h2>
          {saved && <span className="text-sm font-semibold text-matcha">{saved} ✓</span>}
        </div>
        {data.apiConnected ? (
          <p className="mt-1 text-sm text-ink-3">Updated automatically from Google (API connected).</p>
        ) : (
          <p className="mt-1 text-sm text-ink-3">Copy the star average and review count from your Google listing so they stay accurate.</p>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold">
            Average (e.g. 4.8)
            <input className={field} inputMode="decimal" value={summary.rating} onChange={(e) => setSummary({ ...summary, rating: e.target.value })} disabled={data.apiConnected} />
          </label>
          <label className="text-xs font-semibold">
            Number of reviews
            <input className={field} inputMode="numeric" value={summary.count} onChange={(e) => setSummary({ ...summary, count: e.target.value })} disabled={data.apiConnected} />
          </label>
          <label className="text-xs font-semibold">
            Google place ID (optional)
            <input className={field} value={summary.placeId} onChange={(e) => setSummary({ ...summary, placeId: e.target.value })} placeholder="ChIJ…" />
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-3">
          The place ID adds a <strong>Write a review</strong> button that opens your Google review form. Find it free, no sign-in, with{" "}
          <a className="font-semibold text-seal underline" href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener">Google&apos;s Place ID Finder</a>{" "}
          (search &ldquo;Omurice Ramen Battle Creek&rdquo;).
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await adminFetch("/api/admin/settings", {
                method: "PATCH",
                body: {
                  ...(data.apiConnected ? {} : { reviewRating: Number(summary.rating), reviewCount: Number(summary.count) }),
                  googlePlaceId: summary.placeId,
                },
              });
              await load();
              setSaved("Saved");
              setTimeout(() => setSaved(""), 1500);
            } catch (e) {
              alert(e instanceof Error ? e.message : "Couldn't save");
            }
          }}
          className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-rice"
        >
          Save
        </button>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-soft">
        <h2 className="text-lg font-bold">Add a review</h2>
        <div className="mt-3">
          <ReviewForm initial={EMPTY} onSave={save} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">On the home page <span className="text-sm font-medium text-ink-3">({data.reviews.filter((r) => r.active).length} showing)</span></h2>
        {data.reviews.length === 0 && <p className="mt-2 text-sm text-ink-3">No reviews yet. Add 5–10 of your favorites above.</p>}
        <ul className="mt-3 space-y-3">
          {data.reviews.map((r) => (
            <li key={r.id} className={`rounded-2xl border border-line bg-card p-4 shadow-soft ${r.active ? "" : "opacity-50"}`}>
              {editing === r.id ? (
                <ReviewForm
                  initial={{ id: r.id, author: r.author, rating: r.rating, text: r.text, source: r.source, when: r.when, url: r.url, active: r.active }}
                  onSave={async (d) => {
                    await save(d);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} size={16} />
                      <span className="font-semibold">{r.author}</span>
                      <span className="text-xs text-ink-3">{r.source}{r.when ? ` · ${r.when}` : ""}</span>
                      {!r.active && <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-rice">HIDDEN</span>}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-ink-2">{r.text}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold">
                    <button type="button" onClick={() => setEditing(r.id)} className="hover:underline">Edit</button>
                    <button type="button" onClick={() => save({ ...r, url: r.url, when: r.when, active: !r.active })} className="hover:underline">{r.active ? "Hide" : "Show"}</button>
                    <button
                      type="button"
                      onClick={async () => confirm("Delete this review from the site?") && setData(await adminFetch<Data>("/api/admin/reviews", { method: "DELETE", body: { id: r.id } }))}
                      className="text-seal hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
