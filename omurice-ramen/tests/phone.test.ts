process.env.DATABASE_PATH = ":memory:";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { chatMessages } from "../src/lib/ai/chat.ts";
import { liveContext, restaurantKnowledge } from "../src/lib/ai/knowledge.ts";
import { PHONE_TOOLS, runPhoneTool, type ToolContext } from "../src/lib/ai/phone-tools.ts";
import { listCalls, startCall } from "../src/lib/calls.ts";
import { zonedToUtc } from "../src/lib/hours.ts";
import { getOrder } from "../src/lib/orders.ts";
import { validTwilioSignature } from "../src/lib/twilio.ts";
import { CallSession } from "../src/lib/voice/relay.ts";
import { makeRelayToken, verifyRelayToken } from "../src/lib/voice/token.ts";
import { relayTwiml } from "../src/lib/voice/twiml.ts";

const TUE_6PM = zonedToUtc("2026-10-06", 18 * 60);

function ctx(over: Partial<ToolContext> = {}) {
  const events: string[] = [];
  const c: ToolContext = {
    callerNumber: "+12695550142",
    now: () => TUE_6PM,
    onOrder: (id) => events.push(`order:${id}`),
    onReservation: (id) => events.push(`resv:${id}`),
    onTransfer: (r) => events.push(`transfer:${r}`),
    onEnd: () => events.push("end"),
    ...over,
  };
  return { c, events };
}

const RAMEN = { item_id: "spicy-tonkotsu", quantity: 2, options: [{ group_id: "ramen-addons", choice_ids: ["egg"] }], notes: "" };
const OMURICE = { item_id: "classic-omurice", quantity: 1, options: [{ group_id: "rice", choice_ids: ["chicken-fried"] }], notes: "" };

test("tool schemas are strict and closed", () => {
  for (const t of PHONE_TOOLS) {
    assert.equal(t.strict, true, t.name);
    assert.equal((t.input_schema as { additionalProperties?: boolean }).additionalProperties, false, t.name);
  }
});

test("quote_order prices and explains errors in plain English", () => {
  const { c } = ctx();
  const ok = runPhoneTool("quote_order", { items: [RAMEN] }, c);
  assert.equal(ok.isError, undefined);
  assert.match(ok.content, /2 x Spicy Tonkotsu Ramen \(Soft-boiled egg\) = \$42\.48/);
  assert.match(ok.content, /total \$45\.03/);
  const missing = runPhoneTool("quote_order", { items: [OMURICE] }, c);
  assert.equal(missing.isError, true);
  assert.match(missing.content, /choose sauce for Classic Omurice/);
  const bad = runPhoneTool("quote_order", { items: "nope" }, c);
  assert.equal(bad.isError, true);
});

test("place_order uses caller ID by default and supports scheduled pickup", () => {
  const { c, events } = ctx();
  const r = runPhoneTool(
    "place_order",
    { items: [RAMEN], customer_name: "Sam", customer_phone: "", pickup_time: "asap", order_notes: "peanut allergy" },
    c,
  );
  assert.equal(r.isError, undefined, r.content);
  assert.match(r.content, /Order number 100\d/);
  const orderId = events[0].split(":")[1];
  const o = getOrder(orderId)!;
  assert.equal(o.source, "phone");
  assert.equal(o.customerPhone, "+12695550142");
  assert.equal(o.notes, "peanut allergy");

  const slots = runPhoneTool("get_pickup_times", {}, c).content;
  const later = slots.split("\n").find((l) => l.startsWith("2026-10-07T12:00"));
  assert.ok(later, slots);
  const r2 = runPhoneTool(
    "place_order",
    { items: [RAMEN], customer_name: "Sam", customer_phone: "269 555 0199", pickup_time: "2026-10-07T12:00", order_notes: "" },
    c,
  );
  assert.match(r2.content, /Wednesday, October 7 at 12 PM/);
  const bad = runPhoneTool("place_order", { items: [RAMEN], customer_name: "Sam", customer_phone: "", pickup_time: "6pm", order_notes: "" }, c);
  assert.equal(bad.isError, true);
});

test("reservation tools enforce 6+ and read back a code", () => {
  const { c, events } = ctx();
  const avail = runPhoneTool("check_reservation_availability", { date: "2026-10-09", party_size: 8 }, c);
  assert.match(avail.content, /7 PM \(time value 19:00\)/);
  const small = runPhoneTool("book_reservation", { name: "Kim", phone: "", party_size: 4, date: "2026-10-09", time: "19:00", notes: "" }, c);
  assert.equal(small.isError, true);
  assert.match(small.content, /walk right in/);
  const ok = runPhoneTool("book_reservation", { name: "Kim", phone: "", party_size: 8, date: "2026-10-09", time: "19:00", notes: "birthday" }, c);
  assert.match(ok.content, /Confirmation code [0-9A-F] [0-9A-F]/);
  assert.ok(events.some((e) => e.startsWith("resv:")));
});

test("transfer and end_call fire hooks", () => {
  const { c, events } = ctx();
  runPhoneTool("transfer_to_staff", { reason: "wants a manager" }, c);
  runPhoneTool("end_call", {}, c);
  assert.deepEqual(events, ["transfer:wants a manager", "end"]);
});

test("knowledge prompt is stable; live context carries the time", () => {
  assert.equal(restaurantKnowledge(), restaurantKnowledge());
  assert.match(restaurantKnowledge(), /\[classic-tonkotsu\] Classic Tonkotsu Ramen \$16\.99/);
  assert.match(liveContext(TUE_6PM), /Tuesday, October 6, 6 PM/);
  assert.match(liveContext(TUE_6PM), /Open now/);
  const msgs = chatMessages([{ role: "user", content: "hi" }], TUE_6PM);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[1].role, "system");
});

test("relay tokens bind to the call and expire", () => {
  const t = makeRelayToken("CA123");
  assert.equal(verifyRelayToken(t, "CA123"), true);
  assert.equal(verifyRelayToken(t, "CA999"), false);
  assert.equal(verifyRelayToken("1.abc", "CA123"), false);
  assert.equal(verifyRelayToken(makeRelayToken("CA123", -5), "CA123"), false);
  const xml = relayTwiml("https://omu.example", "CA123", "+12695550142");
  assert.match(xml, /<Connect action="https:\/\/omu\.example\/api\/voice\/after">/);
  assert.match(xml, /url="wss:\/\/omu\.example\/voice\/relay\?t=/);
  assert.match(xml, /hints="[^"]*tonkotsu/);
});

test("twilio signature check", () => {
  process.env.TWILIO_AUTH_TOKEN = "12345";
  const params = { CallSid: "CA1", From: "+1269" };
  const sig = crypto.createHmac("sha1", "12345").update("https://x.test/api/voice/incomingCallSidCA1From+1269").digest("base64");
  assert.equal(validTwilioSignature("https://x.test/api/voice/incoming", params, sig), true);
  assert.equal(validTwilioSignature("https://x.test/api/voice/incoming", { ...params, From: "+1" }, sig), false);
  assert.equal(validTwilioSignature("https://x.test/api/voice/incoming", params, null), false);
  delete process.env.TWILIO_AUTH_TOKEN;
});

// A scripted stand-in for Claude so the call flow can be tested offline.
function fakeAgentFactory(script: (text: string, hooks: Parameters<ConstructorParameters<typeof CallSession>[3] & object>[1]) => string[]) {
  return (_n: string, hooks: Parameters<ConstructorParameters<typeof CallSession>[3] & object>[1]) => ({
    async *respond(text: string) {
      for (const chunk of script(text, hooks)) {
        await new Promise((r) => setTimeout(r, 5));
        yield chunk;
      }
    },
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("call session streams speech, logs transcript, and hands off on transfer", async () => {
  const sent: Record<string, unknown>[] = [];
  const callId = startCall("CA-transfer", "+12695550142");
  const s = new CallSession(callId, "+12695550142", (m) => sent.push(m as Record<string, unknown>), fakeAgentFactory((text, hooks) => {
    if (/manager/.test(text)) {
      hooks.onTransfer("caller asked for manager");
      return ["One moment, ", "connecting you."];
    }
    return ["Hi there!"];
  }));
  s.onPrompt("hello");
  await wait(60);
  s.onPrompt("can I talk to a manager");
  await wait(1800);
  const tokens = sent.filter((m) => m.type === "text").map((m) => m.token).join("");
  assert.equal(tokens, "Hi there!One moment, connecting you.");
  const end = sent.find((m) => m.type === "end");
  assert.ok(end, "should send end");
  assert.deepEqual(JSON.parse(end!.handoffData as string), { reason: "transfer", detail: "caller asked for manager" });
  const log = listCalls().find((c) => c.id === callId)!;
  assert.equal(log.outcome, "transfer");
  assert.deepEqual(log.transcript.map((t) => t.role), ["caller", "agent", "caller", "agent"]);
});

test("interrupt mutes the rest of a reply; next turn knows what was heard", async () => {
  const sent: Record<string, unknown>[] = [];
  const seen: string[] = [];
  const s = new CallSession(startCall("CA-int", ""), "", (m) => sent.push(m as Record<string, unknown>), fakeAgentFactory((text) => {
    seen.push(text);
    return seen.length === 1 ? ["Our ", "ramen ", "menu ", "has ", "eight ", "bowls."] : ["Sure."];
  }));
  s.onPrompt("what ramen do you have");
  await wait(12);
  s.onInterrupt("Our ramen");
  s.onPrompt("just the spicy one");
  await wait(150);
  const spoken = sent.filter((m) => m.type === "text").map((m) => m.token).join("");
  assert.ok(!spoken.includes("bowls"), spoken);
  assert.ok(spoken.endsWith("Sure."), spoken);
  assert.match(seen[1], /interrupted.*"Our ramen"/);
  assert.match(seen[1], /just the spicy one/);
});

test("pressing 0 transfers to staff", async () => {
  const sent: Record<string, unknown>[] = [];
  const s = new CallSession(startCall("CA-dtmf", ""), "", (m) => sent.push(m as Record<string, unknown>), fakeAgentFactory(() => []));
  s.onDtmf("0");
  await wait(1700);
  assert.ok(sent.some((m) => m.type === "end" && JSON.parse(m.handoffData as string).reason === "transfer"));
});

test("agent errors fall back to a human instead of dead air", async () => {
  const sent: Record<string, unknown>[] = [];
  const s = new CallSession(startCall("CA-err", ""), "", (m) => sent.push(m as Record<string, unknown>), () => ({
    // eslint-disable-next-line require-yield
    async *respond() {
      throw new Error("API down");
    },
  }));
  s.onPrompt("hello");
  await wait(1700);
  const spoken = sent.filter((m) => m.type === "text").map((m) => m.token).join("");
  assert.match(spoken, /connect you to our team/);
  assert.ok(sent.some((m) => m.type === "end"));
});
