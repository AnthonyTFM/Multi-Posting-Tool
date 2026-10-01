# Omurice Ramen & Boba Tea: website, ordering, AI chat & AI phone

One Node.js app that runs everything:

| Piece | URL | What it does |
|---|---|---|
| Website | `/`, `/menu`, `/faq` | Modern, mobile-first site with SEO (Restaurant + FAQ schema) |
| Online ordering | `/menu` → `/checkout` → `/order/:id` | Pickup orders, ASAP or scheduled, pay at pickup, live status page, SMS updates |
| Group reservations | `/reservations` | Parties of 6–20, seat caps per 30-min slot, SMS confirmation |
| AI chat | widget on every page | Answers FAQ/menu/hours/allergen questions (Claude) |
| AI phone host | Twilio → `/api/voice/incoming` + `wss://…/voice/relay` | Takes pickup orders, books 6+ tables, answers questions, transfers to the 2nd store line on request (or press 0) |
| Kitchen & admin | `/admin` | Live order board (chime, print tickets), reservations, menu editor (sold-out, prices, POS PLUs), AI call transcripts, settings, FAQ |

Owner launch plan, costs and SOPs: **[LAUNCH.md](./LAUNCH.md)**.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000, staff dashboard at /admin (dev password: omurice)
npm test               # 19 unit/flow tests (no API keys needed)
ANTHROPIC_API_KEY=… npm run ai:check   # live AI chat + scripted phone call (in-memory DB)
```

Node 22.13+ is required (uses the built-in `node:sqlite`; no native modules).

## Deploy

Needs a host that supports **long-lived WebSockets and a persistent disk** (the phone agent and SQLite).
Railway, Render or Fly.io all work. Vercel/Netlify do **not** (no WebSockets for the phone relay).

1. Create the service from this folder (Dockerfile included), attach a volume at `/data`.
2. Set env vars from [.env.example](./.env.example). Production refuses to run admin login without `SESSION_SECRET` and `ADMIN_PASSWORD`, and rejects unsigned Twilio webhooks.
3. Point a domain at it (soft-launch on `new.omuriceramen.com` first; see LAUNCH.md).
4. Back up `/data/omurice.db` daily (one file).

### Twilio setup (AI phone)

1. Buy a local 269 number in Twilio. Under **Voice → A call comes in**: Webhook `POST https://YOUR-DOMAIN/api/voice/incoming`.
2. Enable ConversationRelay for the account (Voice → Settings) and accept the AI/ML features addendum if prompted.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `STAFF_TRANSFER_NUMBER` (2nd store line).
4. Forward the main line **(269) 719-2737** to the Twilio number (unconditional call forwarding at your phone carrier), or port it to Twilio later.
   The 2nd store line must **not** forward to Twilio, or transfers loop.
5. For texts: register A2P 10DLC in Twilio, then set `TWILIO_SMS_FROM`.

Call flow:

```
caller ─► Twilio ─► /api/voice/incoming ──(AI on)──► ConversationRelay ⇄ wss /voice/relay ⇄ Claude (tools: quote/place order, pickup times, reservations, transfer, end)
                                   └─(AI off / no key)─► <Dial> staff line
AI session ends ─► /api/voice/after ─► transfer: <Dial> staff line ─(no answer)─► /api/voice/dial-status ─► back to the AI
                                    └► AI error/drop: "Sorry about that" + <Dial> staff line   (callers are never stranded)
```

Kill switch: **/admin/settings → AI phone host OFF** makes every call ring the staff line directly.

### Honor POS (phase 2)

Honor POS has no public ordering API; its documented integration for outside order channels is **Deliverect**.
Until that's live, orders land on the `/admin` kitchen board (print tickets from there).
To connect: sign up for Deliverect (Honor POS integration), ask them to register this site as a custom
"Channel API" ordering channel, enter each item's Honor **PLU** in `/admin/menu`, test in Deliverect staging, then set
`POS_PROVIDER=deliverect` + `DELIVERECT_*`. Payload: `src/lib/pos/deliverect.ts`. Failed pushes show a red
"POS sync failed" on the order card with a Retry button. `POS_PROVIDER=webhook` POSTs signed JSON anywhere (Zapier/Make/custom bridge).

## Code map

```
server.ts                  Next.js + WebSocket server (single process)
src/lib/restaurant.ts      Address, phone, hours, reservation/ordering rules  ← edit facts here
src/lib/seed-data.ts       First-run menu + FAQ (then edited in /admin)
src/lib/{menu,orders,reservations,hours,settings,faq,calls}.ts   domain logic (SQLite)
src/lib/ai/                Claude: shared knowledge prompt, website chat, phone agent + tools
src/lib/voice/             Twilio ConversationRelay session, TwiML, signed relay tokens
src/lib/pos/               Honor POS adapters (Deliverect, webhook)
src/app/(site)/            Customer pages        src/app/admin/   Staff dashboard
src/app/api/               JSON + Twilio webhooks
tests/                     node:test suites (run offline)
```

AI notes: model defaults to `claude-opus-5-5` at low effort (set `AI_MODEL` to change); server-side refusal
fallback is enabled; the restaurant knowledge block is prompt-cached and the phone transcript is append-only and cached.
Prices are always recomputed server-side; the AI and browser can't set them.
