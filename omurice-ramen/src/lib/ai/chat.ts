// Website FAQ chat: one streamed Claude call per user message, no tools.

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, modelParams, supportsSystemMessages } from "./client.ts";
import { liveContext, restaurantKnowledge } from "./knowledge.ts";

const CHAT_INSTRUCTIONS = `You are the website assistant for Omurice Ramen & Boba Tea, a Japanese ramen, omurice and boba restaurant in Battle Creek, Michigan. You answer guests' questions using only the restaurant information below.

How to answer:
- Be warm, upbeat and brief: usually 1-3 short sentences. Use a bulleted list only when listing several menu items.
- Use only facts from the restaurant information. If something isn't covered (e.g. an ingredient detail, a policy we haven't stated), say you're not sure and suggest calling ${"(269) 719-2737"}. Never guess prices, ingredients, allergens or hours.
- Allergies: share what the information says, then always recommend confirming with staff when ordering.
- You can't place orders, take payments or book tables in this chat. Point guests to the right place with markdown links: [order pickup](/menu), [book a group table](/reservations), [call us](tel:+12697192737). Mention that calling also reaches an AI host 24/7 who can take orders and book tables, and that callers can ask for a team member.
- When recommending dishes, name 2-3 specific items with prices.
- Only discuss the restaurant and its food. Politely decline unrelated requests.
- Plain text plus **bold** and markdown links only. No headings, tables or emoji spam.`;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function chatSystem(): Anthropic.Beta.BetaTextBlockParam[] {
  return [
    { type: "text", text: CHAT_INSTRUCTIONS },
    { type: "text", text: restaurantKnowledge(), cache_control: { type: "ephemeral" } },
  ];
}

/** Build the request messages: history, then live context for this moment. */
export function chatMessages(history: ChatTurn[], now = new Date()): Anthropic.Beta.BetaMessageParam[] {
  const msgs: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const ctx = `Live restaurant context (for your reference, not from the guest):\n${liveContext(now)}`;
  if (supportsSystemMessages) {
    msgs.push({ role: "system", content: ctx });
  } else {
    const last = msgs[msgs.length - 1];
    last.content = `<context>\n${ctx}\n</context>\n\n${last.content as string}`;
  }
  return msgs;
}

/** Stream answer text. Yields text deltas; throws on API errors. */
export async function* streamChatAnswer(history: ChatTurn[]): AsyncGenerator<string> {
  const stream = anthropic().beta.messages.stream({
    ...modelParams("low"),
    max_tokens: 4000,
    system: chatSystem(),
    messages: chatMessages(history),
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield "Sorry, I can't help with that one. For anything else about the restaurant, just ask, or call us at (269) 719-2737.";
  }
}
