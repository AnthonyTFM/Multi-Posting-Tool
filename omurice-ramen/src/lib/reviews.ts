// Reviews for the home page carousel, from two sources:
//  1. Reviews staff paste in at /admin/reviews, copied word-for-word from the
//     public Google listing. No Google account or API needed.
//  2. Optional: live Google reviews via the Places API (New), fetched
//     server-side so the key never reaches the browser (up to 5 "most relevant").
//
// Setup: GOOGLE_MAPS_API_KEY (restricted to "Places API (New)"). GOOGLE_PLACE_ID
// is optional; it's looked up once by name + address and remembered (Google
// allows storing place IDs indefinitely).
//
// Display rules we follow: show the author's name/photo linked to their profile,
// link each review to Google, show the "Google Maps" attribution, never edit
// review text, and always show the true overall rating and count.

import { db, nowIso } from "./db.ts";
import { RESTAURANT } from "./restaurant.ts";
import { getSettings, updateSettings } from "./settings.ts";

export const REVIEW_SOURCES = ["Google", "Yelp", "Facebook", "Other"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export type Review = {
  id: string;
  source: ReviewSource;
  author: string;
  authorUrl: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string; // "2 weeks ago" (Google) or what staff typed
  publishTime: string | null;
  reviewUrl: string | null;
};

export type ReviewsData = {
  rating: number;
  count: number;
  reviews: Review[];
  placeUrl: string;
  writeReviewUrl: string;
  fetchedAt: number;
};

const API = () => (process.env.GOOGLE_PLACES_API_BASE ?? "https://places.googleapis.com").replace(/\/$/, "");
const TTL_MS = () => Number(process.env.GOOGLE_REVIEWS_TTL_MIN ?? 60) * 60_000;
const MIN_RATING = () => Number(process.env.GOOGLE_REVIEWS_MIN_RATING ?? 4);

export function reviewsConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

type ApiReview = {
  name?: string;
  rating?: number;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  googleMapsUri?: string;
};

type ApiPlace = {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: ApiReview[];
};

/** Turn a Places API response into what the site shows. Pure; exported for tests. */
export function normalizePlace(place: ApiPlace, placeId: string, minRating = MIN_RATING()): ReviewsData {
  const reviews = (place.reviews ?? [])
    .map((r, i): Review => ({
      id: r.name ?? `review-${i}`,
      source: "Google",
      author: r.authorAttribution?.displayName?.trim() || "Google user",
      authorUrl: r.authorAttribution?.uri ?? null,
      authorPhoto: r.authorAttribution?.photoUri ?? null,
      rating: Math.max(0, Math.min(5, Math.round(r.rating ?? 0))),
      text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
      relativeTime: r.relativePublishTimeDescription ?? "",
      publishTime: r.publishTime ?? null,
      reviewUrl: r.googleMapsUri ?? null,
    }))
    .filter((r) => r.text && r.rating >= minRating);
  return {
    rating: place.rating ?? RESTAURANT.rating.stars,
    count: place.userRatingCount ?? RESTAURANT.rating.count,
    reviews,
    placeUrl: place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    writeReviewUrl: writeReviewUrlFor(placeId),
    fetchedAt: Date.now(),
  };
}

async function googleFetch(path: string, init: RequestInit & { fieldMask: string }): Promise<unknown> {
  const res = await fetch(`${API()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY ?? "",
      "X-Goog-FieldMask": init.fieldMask,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Place ID from env, then saved settings, then a one-time text search. */
export async function resolvePlaceId(): Promise<string> {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  const saved = getSettings().googlePlaceId;
  if (saved) return saved;
  const a = RESTAURANT.address;
  const body = (await googleFetch("/v1/places:searchText", {
    method: "POST",
    fieldMask: "places.id,places.formattedAddress",
    body: JSON.stringify({ textQuery: `${RESTAURANT.shortName}, ${a.line1}, ${a.city}, ${a.state} ${a.zip}`, pageSize: 1 }),
  })) as { places?: { id: string }[] };
  const id = body.places?.[0]?.id;
  if (!id) throw new Error("Google couldn't find the restaurant; set GOOGLE_PLACE_ID");
  updateSettings({ googlePlaceId: id });
  return id;
}

async function fetchFromGoogle(): Promise<ReviewsData> {
  const placeId = await resolvePlaceId();
  const place = (await googleFetch(`/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    method: "GET",
    fieldMask: "id,rating,userRatingCount,googleMapsUri,reviews",
  })) as ApiPlace;
  return normalizePlace(place, placeId);
}

// Short in-memory cache (stale-while-revalidate) so page loads stay fast and
// API usage stays inside Google's free monthly allowance.
const g = globalThis as unknown as { __omuReviews?: { data: ReviewsData | null; refreshing: Promise<void> | null } };
const state = (g.__omuReviews ??= { data: null, refreshing: null });

function refresh(): Promise<void> {
  state.refreshing ??= fetchFromGoogle()
    .then((d) => {
      state.data = d;
    })
    .catch((e) => console.error("[reviews]", e instanceof Error ? e.message : e))
    .finally(() => {
      state.refreshing = null;
    });
  return state.refreshing;
}

/** Latest Google reviews, or null if not configured / never fetched successfully. */
export async function getGoogleReviews(): Promise<ReviewsData | null> {
  if (!reviewsConfigured()) return null;
  if (!state.data) await refresh(); // first load waits (max ~8s timeout)
  else if (Date.now() - state.data.fetchedAt > TTL_MS()) void refresh(); // serve stale, refresh in background
  return state.data;
}

/** Overall rating for the header/footer: live from Google, else what staff entered. */
export async function ratingSummary(): Promise<{ stars: number; count: number }> {
  const d = await homepageReviews();
  return { stars: d.rating, count: d.count };
}

// ---------- Staff-entered reviews ----------

export type ManualReview = {
  id: number;
  author: string;
  rating: number;
  text: string;
  source: ReviewSource;
  url: string;
  when: string;
  active: boolean;
  sort: number;
};

type ManualRow = { id: number; author: string; rating: number; text: string; source: string; url: string; when_label: string; active: number; sort: number };

export class ReviewInputError extends Error {}

export function listManualReviews(opts: { includeHidden?: boolean } = {}): ManualReview[] {
  const rows = db().prepare("SELECT * FROM reviews ORDER BY sort, id").all() as ManualRow[];
  return rows
    .filter((r) => opts.includeHidden || r.active)
    .map((r) => ({ id: r.id, author: r.author, rating: r.rating, text: r.text, source: r.source as ReviewSource, url: r.url, when: r.when_label, active: !!r.active, sort: r.sort }));
}

export function saveManualReview(input: { id?: number; author: string; rating: number; text: string; source: string; url?: string; when?: string; active?: boolean }): void {
  const author = String(input.author ?? "").trim().slice(0, 60);
  const text = String(input.text ?? "").trim().slice(0, 2000);
  const rating = Math.round(Number(input.rating));
  const source = REVIEW_SOURCES.includes(input.source as ReviewSource) ? input.source : "Google";
  const url = String(input.url ?? "").trim();
  const when = String(input.when ?? "").trim().slice(0, 40);
  if (!author) throw new ReviewInputError("Add the reviewer's name as it appears on Google.");
  if (!text) throw new ReviewInputError("Paste the review text.");
  if (!(rating >= 1 && rating <= 5)) throw new ReviewInputError("Stars must be 1 to 5.");
  if (url && !/^https:\/\/[^\s"<>]+$/.test(url)) throw new ReviewInputError("The link must start with https://");
  if (input.id) {
    db()
      .prepare("UPDATE reviews SET author = ?, rating = ?, text = ?, source = ?, url = ?, when_label = ?, active = ? WHERE id = ?")
      .run(author, rating, text, source, url, when, input.active === false ? 0 : 1, input.id);
  } else {
    const max = db().prepare("SELECT COALESCE(MAX(sort), -1) AS m FROM reviews").get() as { m: number };
    db()
      .prepare("INSERT INTO reviews (author, rating, text, source, url, when_label, active, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)")
      .run(author, rating, text, source, url, when, max.m + 1, nowIso());
  }
}

export function deleteManualReview(id: number): void {
  db().prepare("DELETE FROM reviews WHERE id = ?").run(id);
}

function manualToReview(m: ManualReview): Review {
  return {
    id: `manual-${m.id}`,
    source: m.source,
    author: m.author,
    authorUrl: null,
    authorPhoto: null,
    rating: m.rating,
    text: m.text,
    relativeTime: m.when,
    publishTime: null,
    reviewUrl: m.url || null,
  };
}

const sameReview = (a: Review, b: Review) => a.author.toLowerCase() === b.author.toLowerCase() && a.text.slice(0, 60) === b.text.slice(0, 60);

export type HomeReviews = {
  rating: number;
  count: number;
  live: boolean; // true when the numbers/reviews come straight from Google's API
  reviews: Review[];
  placeUrl: string;
  writeReviewUrl: string | null;
};

export function writeReviewUrlFor(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Everything the home page needs: live Google data when configured, plus staff-entered reviews. */
export async function homepageReviews(): Promise<HomeReviews> {
  const live = await getGoogleReviews();
  const s = getSettings();
  const manual = listManualReviews().map(manualToReview);
  const liveReviews = live?.reviews ?? [];
  const placeId = process.env.GOOGLE_PLACE_ID || s.googlePlaceId;
  return {
    rating: live?.rating ?? s.reviewRating,
    count: live?.count ?? s.reviewCount,
    live: !!live,
    reviews: [...liveReviews, ...manual.filter((m) => !liveReviews.some((r) => sameReview(r, m)))],
    placeUrl: live?.placeUrl ?? (placeId ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}` : RESTAURANT.mapsUrl),
    writeReviewUrl: live?.writeReviewUrl ?? (placeId ? writeReviewUrlFor(placeId) : null),
  };
}

/** For tests. */
export function _resetReviewsCache() {
  state.data = null;
  state.refreshing = null;
}
