# Omurice Ramen: launch playbook

**Bottom line:** the website, online ordering, 6+ reservations, AI chat, AI phone host and kitchen dashboard are built and tested.
To go live you need about 5 accounts/inputs (below), roughly 2 weeks of setup, and about $150–$300/month in run costs (estimate).

---

## 1. What I need from you

| # | Item | Why | Format | Blocks launch? |
|---|---|---|---|---|
| 1 | **Menu check**: confirm prices/descriptions of the 25 items flagged "Verify" in `/admin/menu`, plus anything missing (Ramen Combos, desserts, sodas) | Only ~8 prices were confirmable from public sources. The rest are estimates or placeholders | Photo of the printed menu or Honor POS item export | **Yes** |
| 2 | **Food photos** (top 10 sellers first) | Photos lift online conversion; illustrations are placeholders | JPG, 1200×900+, natural light, ramen top-down, omurice at 45° | No (illustrations work meanwhile) |
| 3 | **2nd store line number** for "speak to a human" transfers | Transfer destination | 10-digit number. Must NOT be forwarded | **Yes** (for phone) |
| 4 | **Twilio account** (you own it; add card) | Phone number, AI voice, texts | Account SID + Auth Token | **Yes** (for phone/texts) |
| 5 | **Anthropic API key** (console.anthropic.com) | Powers chat + phone AI | `sk-ant-…` key | **Yes** (for AI) |
| 6 | **Hosting account** (Railway or Render) | Runs the site 24/7 | Invite me or share deploy access | **Yes** |
| 7 | Domain/DNS login for omuriceramen.com | Point domain at the new site | Registrar login or DNS access | Yes (for cutover) |
| 8 | **Deliverect** account (phase 2) | Push web/phone orders into Honor POS | Ask Honor POS support to enable the Deliverect integration | No (phase 2) |
| 9 | Policy answers: allergens/broth bases (is any broth vegetarian?), parking, gift cards, catering minimums | The AI only answers from facts you approve | Edit `/admin/settings` FAQ | Before launch |

---

## 2. Launch timeline

| When | Task | Owner | Done when |
|---|---|---|---|
| Day 1 | Verify menu + FAQ in `/admin`; send photos | You | Zero "Verify" badges |
| Day 1 | Create Twilio + Anthropic + Railway/Render accounts | You | Keys in hand |
| Day 2 | Deploy to `new.omuriceramen.com`, set env vars, run `npm run ai:check` | Dev | Site loads; AI check passes |
| Day 2 | Buy Twilio 269 number, point webhook, set transfer line | Dev | Test call: order placed, transfer rings 2nd line |
| Day 3 | Start A2P 10DLC registration (texts) | You + Dev | Submitted (approval ~1–3 weeks) |
| Day 3–7 | **Soft launch**: staff + friends place 20 web orders and 20 phone calls (orders, reservations, transfers, weird requests) | You + staff | ≥18/20 phone calls handled correctly; fixes logged |
| Day 7 | Forward (269) 719-2737 to the Twilio number during open hours only | You | AI answers live calls |
| Day 8–10 | Watch `/admin/calls` daily; add missed questions to FAQ | You | Transfer rate trending down |
| Day 10 | Forward 24/7; switch domain DNS to new site | Dev | omuriceramen.com = new site |
| Day 14 | Update Google Business Profile order link, Instagram bio, DoorDash bag inserts | You | All links point direct |
| Week 3+ | Deliverect → Honor POS sync (phase 2) | Dev + Deliverect | Web/phone orders print from Honor automatically |

**Domain cutover warning:** omuriceramen.com runs Honor's online ordering today, and those orders flow into Honor POS automatically.
After cutover, new-site orders show on the `/admin` kitchen board (tablet + printed tickets) but **not in Honor POS** until Deliverect is live.
Until then, either ring them into Honor at pickup or keep Honor's ordering link as a backup.

---

## 3. Monthly cost estimate (assumptions, verify current pricing)

Assumes 600 calls/month at 3 minutes average, 25% transferred, 1,000 texts, 300 web orders.

| Item | Est. / month | Notes |
|---|---|---|
| Hosting (Railway/Render + 1 GB disk) | $7–$20 | |
| Twilio number | ~$1.15 | |
| Twilio voice + ConversationRelay (speech in/out) | ~$100–$160 | ≈ $0.06–0.09/min all-in, 1,800 min |
| Transfer legs to staff line | ~$5 | |
| Texts + 10DLC fees | ~$15–$25 | One-time ~$20 registration |
| Claude AI (phone + chat) | ~$30–$90 | ≈ $0.05–$0.15/call on Opus 5.5 with caching; switching `AI_MODEL=claude-haiku-4-5` cuts this roughly 4× (your call) |
| **Total** | **≈ $160–$300** | vs. ~30 staff-hours/month on the phone (~$450 at $15/hr) + every missed call captured |
| Deliverect (phase 2) | ~$60–$150 | Quote from Deliverect |

---

## 4. KPIs: targets and how to track

| KPI | Definition | Target (Day 30) | Where | Cadence |
|---|---|---|---|---|
| AI containment | Calls fully handled by AI ÷ all calls | ≥ 70% | `/admin/calls` stats | Daily wk 1, then weekly |
| Transfer rate | Transferred ÷ calls | ≤ 30% | `/admin/calls` | Weekly |
| Phone order conversion | Calls with "Order placed" ÷ calls asking to order | ≥ 80% | `/admin/calls` | Weekly |
| Missed calls | Calls nobody answered | 0 | Twilio call log | Weekly |
| Direct order share | Web+phone orders ÷ (web+phone+DoorDash) | +15 pts in 60 days | Dashboard + DoorDash report | Monthly |
| No-show rate (pay at pickup) | Cancelled-unpicked ÷ orders | ≤ 3% | `/admin` completed list | Weekly |
| Ticket accuracy | Orders remade due to AI/web error | ≤ 1% | Staff log | Weekly |

**Failure checks**
- Transfer rate > 40% by Day 10 → read 10 transferred transcripts, add the missing answers to FAQ/menu, re-test.
- Phone callers complain about lag (> 2 s pauses) by Day 7 → set `AI_MODEL=claude-haiku-4-5` and compare.
- No-show rate > 5% by Day 21 → lower the unpaid-order cap ($250 → $100) in `src/lib/restaurant.ts`, call back large phone orders.
- A2P 10DLC not approved by Day 14 → launch without texts (status page still works), keep the registration moving.
- Kitchen misses new orders → enable dashboard sound at open, mount tablet at the pass, add a USB thermal printer.

---

## 5. Staff SOP: kitchen dashboard

**Opening (2 min)**
1. Tablet at the pass → `omuriceramen.com/admin` → tap **Enable sound** (required once per session).
2. Check **Prep time** (20 min default; raise it at rush).
3. `/admin/menu`: mark anything 86'd as **Sold out** (the website, chat and phone AI stop selling it instantly).
4. `/admin/reservations`: check today's group tables.

**Each order:** `Start cooking` → `Mark ready · text customer` (customer gets a text) → `Picked up` when paid. Use **Print** for a ticket.
AI phone orders are tagged **AI phone**; web orders **Web**. Every order is **pay at pickup**.

**Slammed?** Tap **Pause online + phone orders**. The site shows a banner and the AI stops taking orders (it offers to transfer instead). Unpause when caught up.

**Closing:** clear the Ready column; confirm tomorrow's reservations.

**AI misbehaving?** `/admin/settings` → **AI phone host OFF**. All calls ring the staff line like before.

---

## 6. Ready-to-use assets

**Google Business Profile post**
> Skip the line and the delivery-app markup! 🍜 Order Omurice Ramen pickup direct at omuriceramen.com, or just call (269) 719-2737 anytime and our AI host takes your order 24/7. Groups of 6+? Book your table online. Pay when you pick up.
> CTA button: **Order online** → https://omuriceramen.com/menu

**Instagram caption**
> New website just dropped 🍳🍜🧋 Order ahead, pick your spice level, sweetness and toppings, and we'll text you when it's ready. Calling? Our AI host answers 24/7 (say "team member" anytime to reach us). Link in bio. #BattleCreekEats #omurice #ramen #boba

**Counter sign / bag insert**
> **Order direct. Pay less.** Scan to order pickup → [QR to /menu]
> Or call (269) 719-2737, anytime. Groups of 6+: book a table online.

**Staff script when a transferred call rings the 2nd line**
> "Omurice Ramen, this is ___. I see our assistant sent you over. How can I help?"

---

## 7. Risks & compliance

| Risk | Mitigation built in | Your action |
|---|---|---|
| AI says something wrong about allergens | AI answers only from your FAQ, always recommends confirming with staff, transfers detailed allergy questions | Approve allergen FAQ wording |
| Bot disclosure | Greeting says "I'm the restaurant's virtual assistant" | Keep that line |
| Prank / unpaid orders | Max $250 unpaid, 3 open orders per phone/IP per 30 min, rate limits | Call back suspicious big orders |
| Texts without consent (TCPA/10DLC) | Opt-in language at checkout + reservations; texts are transactional only | Don't send marketing texts from this number |
| "Pay less" claim | Copy says delivery apps list higher prices (true today: $16.99 direct vs $20.39 on DoorDash for Classic Tonkotsu) | Re-check if DoorDash prices change |
| Call transcripts stored | Kept in your database only; no audio recorded | Add a privacy-policy line if you want |
| AI outage | Any AI error transfers the caller to staff; kill switch in settings | None |

---

## QA checklist (before cutover)
- [ ] Zero "Verify" items in `/admin/menu`; FAQ reviewed
- [ ] 20 test web orders: options, notes, scheduled times, status texts
- [ ] 20 test calls: order, reservation (6+ and <6), transfer ("team member" and pressing 0), closed-hours order, sold-out item
- [ ] Transfer rings the 2nd line; no-answer returns caller to the AI
- [ ] `ADMIN_PASSWORD`, `SESSION_SECRET`, `PUBLIC_BASE_URL` set; daily DB backup on
- [ ] Google Business Profile + Instagram links updated
