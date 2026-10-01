// Live check of the AI chat + phone agent against the real Claude API.
// Usage: ANTHROPIC_API_KEY=... npm run ai:check
// Uses a throwaway in-memory database, so no real orders are created.

process.env.DATABASE_PATH = ":memory:";

const { streamChatAnswer } = await import("../src/lib/ai/chat.ts");
const { aiConfigured, MODEL } = await import("../src/lib/ai/client.ts");
const { PhoneAgent } = await import("../src/lib/ai/phone-agent.ts");

if (!aiConfigured()) {
  console.error("Set ANTHROPIC_API_KEY first.");
  process.exit(1);
}
console.log(`Model: ${MODEL}\n\n=== Website chat ===`);
let answer = "";
for await (const t of streamChatAnswer([{ role: "user", content: "What's popular, and do you have anything vegetarian?" }])) answer += t;
console.log(`Guest: What's popular, and do you have anything vegetarian?\nAI: ${answer}\n`);

console.log("=== Phone call (scripted caller) ===");
const events: string[] = [];
const agent = new PhoneAgent("+12695550142", {
  onOrder: (id) => events.push(`ORDER PLACED ${id}`),
  onReservation: (id) => events.push(`RESERVATION ${id}`),
  onTransfer: (r) => events.push(`TRANSFER: ${r}`),
  onEnd: () => events.push("END CALL"),
});
const caller = [
  "Hi, what time do you close on Saturday?",
  "Cool. Can I get two orders of popcorn chicken for pickup?",
  "That's it. Yes, that's correct.",
  "My name is Taylor, and yes the number I'm calling from is fine.",
  "As soon as possible please.",
  "Nope, that's everything. Thanks, bye!",
];
for (const line of caller) {
  const start = Date.now();
  let reply = "";
  let firstTokenMs = 0;
  for await (const t of agent.respond(line)) {
    if (!firstTokenMs) firstTokenMs = Date.now() - start;
    reply += t;
  }
  console.log(`Caller: ${line}\nAI (${firstTokenMs}ms to first word): ${reply.trim()}`);
  if (events.length) console.log(`   [${events.splice(0).join(", ")}]`);
}

export {};
