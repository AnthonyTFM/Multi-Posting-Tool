// Live Google reviews via the Places API (New), fetched server-side so the API
// key never reaches the browser. Google returns up to 5 "most relevant" reviews
// plus the overall rating and count.
//
// Setup: GOOGLE_MAPS_API_KEY (restricted to "Places API (New)"). GOOGLE_PLACE_ID
// is optional; it's looked up once by name + address and remembered (Google
// allows storing place IDs indefinitely).
//
// Display rules we follow: show the author's name/photo linked to their profile,
// link each review to Google, show the "Google Maps" attribution, never edit
// review text, and always show the true overall rating and count.

import { RESTAURANT } from "./restaurant.ts";
import { getSettings, updateSettings } from "./settings.ts";

export type GoogleReview = {
  id: string;
  author: string;
  authorUrl: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string; // "2 weeks ago", localized by Google
  publishTime: string | null;
  reviewUrl: string | null;
};

export type ReviewsData = {
  rating: number;
  count: number;
  reviews: GoogleReview[];
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
    .map((r, i): GoogleReview => ({
      id: r.name ?? `review-${i}`,
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
    writeReviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
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

/** Overall rating for the header/footer: live from Google when available. */
export async function ratingSummary(): Promise<{ stars: number; count: number }> {
  const d = await getGoogleReviews();
  return d ? { stars: d.rating, count: d.count } : { stars: RESTAURANT.rating.stars, count: RESTAURANT.rating.count };
}

/** For tests. */
export function _resetReviewsCache() {
  state.data = null;
  state.refreshing = null;
}
