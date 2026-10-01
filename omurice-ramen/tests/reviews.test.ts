process.env.DATABASE_PATH = ":memory:";

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { _resetReviewsCache, getGoogleReviews, normalizePlace, ratingSummary } from "../src/lib/reviews.ts";
import { getSettings } from "../src/lib/settings.ts";

// Synthetic API payload for tests only; the site never shows made-up reviews.
const PLACE = {
  id: "ChIJtest",
  rating: 4.8,
  userRatingCount: 471,
  googleMapsUri: "https://maps.google.com/?cid=123",
  reviews: [
    { name: "places/ChIJtest/reviews/a", rating: 5, relativePublishTimeDescription: "a week ago", text: { text: "Test review A" }, authorAttribution: { displayName: "Tester A", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/a" }, googleMapsUri: "https://www.google.com/maps/reviews/a" },
    { name: "places/ChIJtest/reviews/b", rating: 3, text: { text: "Test review B" }, authorAttribution: { displayName: "Tester B" } },
    { name: "places/ChIJtest/reviews/c", rating: 5, text: { text: "" }, authorAttribution: { displayName: "Tester C" } },
    { name: "places/ChIJtest/reviews/d", rating: 4, originalText: { text: "Test review D" }, authorAttribution: {} },
  ],
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_REVIEWS_TTL_MIN;
  _resetReviewsCache();
});

test("normalizes Google's payload: 4★+ with text only, attribution kept, true average kept", () => {
  const d = normalizePlace(PLACE, "ChIJtest", 4);
  assert.equal(d.rating, 4.8);
  assert.equal(d.count, 471);
  assert.deepEqual(d.reviews.map((r) => r.author), ["Tester A", "Google user"]);
  assert.equal(d.reviews[0].authorUrl, "https://www.google.com/maps/contrib/1");
  assert.equal(d.reviews[0].reviewUrl, "https://www.google.com/maps/reviews/a");
  assert.equal(d.reviews[1].text, "Test review D");
  assert.equal(d.writeReviewUrl, "https://search.google.com/local/writereview?placeid=ChIJtest");
});

test("no API key: no reviews, rating falls back to the site default", async () => {
  assert.equal(await getGoogleReviews(), null);
  assert.deepEqual(await ratingSummary(), { stars: 4.8, count: 466 });
});

test("looks up the place once, caches reviews, serves stale data if Google fails", async () => {
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
  const calls: { url: string; init: RequestInit }[] = [];
  let fail = false;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    if (fail) return new Response("boom", { status: 500 });
    if (String(url).endsWith("places:searchText")) return Response.json({ places: [{ id: "ChIJtest" }] });
    return Response.json(PLACE);
  }) as typeof fetch;

  const d = await getGoogleReviews();
  assert.equal(d?.reviews.length, 2);
  assert.equal(calls.length, 2);
  assert.match(String(calls[0].init.body), /5420 Beckley Rd/);
  assert.equal((calls[1].init.headers as Record<string, string>)["X-Goog-Api-Key"], "test-key");
  assert.match((calls[1].init.headers as Record<string, string>)["X-Goog-FieldMask"], /reviews/);
  assert.equal(getSettings().googlePlaceId, "ChIJtest"); // remembered

  await getGoogleReviews();
  assert.equal(calls.length, 2); // served from cache

  process.env.GOOGLE_REVIEWS_TTL_MIN = "0";
  fail = true;
  const stale = await getGoogleReviews(); // stale served immediately, refresh fails in background
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(stale?.count, 471);
  assert.equal((await getGoogleReviews())?.count, 471);
  assert.ok(calls.length > 2 && !calls.slice(2).some((c) => c.url.endsWith("searchText"))); // place ID not looked up again
});
