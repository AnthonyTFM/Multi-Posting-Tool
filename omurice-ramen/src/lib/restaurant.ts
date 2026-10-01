// Static facts about the restaurant. Anything owners change often (menu, FAQ,
// prep time, pause ordering) lives in the database and is edited in /admin.

export const RESTAURANT = {
  name: "Omurice Ramen & Boba Tea",
  shortName: "Omurice Ramen",
  tagline: "Authentic Japanese omurice, ramen & boba tea in Battle Creek",
  address: {
    line1: "5420 Beckley Rd, Suite G",
    city: "Battle Creek",
    state: "MI",
    zip: "49015",
  },
  phoneDisplay: "(269) 719-2737",
  phoneE164: "+12697192737",
  timezone: "America/Detroit",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Omurice+Ramen+5420+Beckley+Rd+Suite+G+Battle+Creek+MI+49015",
  doordashUrl: "https://www.doordash.com/store/omurice-ramen-&-boba-tea-battle-creek-41175476/",
  rating: { stars: 4.8, count: 466 },
  // Defaults; editable in /admin/media.
  social: {
    instagram: "https://www.instagram.com/omurice_ramen_boba/",
    facebook: "",
    tiktok: "",
  },
  instagramHandle: "omurice_ramen_boba",
  // Reservations are only for large groups; smaller parties walk in.
  reservations: {
    minParty: 6,
    maxParty: 20,
    slotMinutes: 30,
    // Max large-party guests seated per 30-min slot.
    maxGuestsPerSlot: 20,
    // Don't book within this many minutes of closing.
    lastSeatingBeforeCloseMin: 60,
    maxDaysAhead: 30,
    minLeadMinutes: 120,
  },
  ordering: {
    defaultPrepMinutes: 20,
    slotMinutes: 15,
    // Stop taking orders this many minutes before close.
    lastOrderBeforeCloseMin: 15,
    // Pay-at-pickup orders above this need a phone call (anti-prank guard).
    maxUnpaidOrderCents: 25000,
    taxRate: 0.06, // Michigan sales tax on prepared food
  },
} as const;

export const FULL_ADDRESS = `${RESTAURANT.address.line1}, ${RESTAURANT.address.city}, ${RESTAURANT.address.state} ${RESTAURANT.address.zip}`;

// Weekly hours, 24h "HH:MM". Day 0 = Sunday.
export type DayHours = { open: string; close: string } | null;
export const WEEKLY_HOURS: DayHours[] = [
  { open: "12:00", close: "21:30" }, // Sun
  { open: "11:00", close: "21:30" }, // Mon
  { open: "11:00", close: "21:30" }, // Tue
  { open: "11:00", close: "21:30" }, // Wed
  { open: "11:00", close: "21:30" }, // Thu
  { open: "11:00", close: "22:30" }, // Fri
  { open: "11:00", close: "22:30" }, // Sat
];

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
