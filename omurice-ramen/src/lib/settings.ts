import { db } from "./db.ts";
import { RESTAURANT } from "./restaurant.ts";

export type Socials = { instagram: string; facebook: string; tiktok: string };

export type Settings = {
  prepMinutes: number;
  orderingPaused: boolean;
  reservationsPaused: boolean;
  closures: string[]; // "YYYY-MM-DD" days closed (holidays)
  announcement: string; // banner shown site-wide when non-empty
  aiPhoneEnabled: boolean; // off = every call rings the staff line directly
  heroMediaId: string | null; // home page hero photo or looping video
  galleryIds: string[]; // home page "From our kitchen" grid, in order
  socials: Socials;
  googlePlaceId: string; // looked up once from Google (or pasted in /admin/reviews), then remembered
  reviewRating: number; // shown when the Google API isn't connected
  reviewCount: number;
};

const DEFAULTS: Settings = {
  prepMinutes: RESTAURANT.ordering.defaultPrepMinutes,
  orderingPaused: false,
  reservationsPaused: false,
  closures: [],
  announcement: "",
  aiPhoneEnabled: true,
  heroMediaId: null,
  galleryIds: [],
  socials: { ...RESTAURANT.social },
  googlePlaceId: "",
  reviewRating: RESTAURANT.rating.stars,
  reviewCount: RESTAURANT.rating.count,
};

export function getSettings(): Settings {
  const rows = db().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const out: Settings = { ...DEFAULTS, socials: { ...DEFAULTS.socials } };
  for (const { key, value } of rows) {
    if (key in out) {
      try {
        (out as Record<string, unknown>)[key] = JSON.parse(value);
      } catch {
        // ignore malformed row; default stays
      }
    }
  }
  return out;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const stmt = db().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  for (const [k, v] of Object.entries(patch)) {
    if (k in DEFAULTS && v !== undefined) stmt.run(k, JSON.stringify(v));
  }
  return getSettings();
}
