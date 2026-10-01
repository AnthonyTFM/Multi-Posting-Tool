import Anthropic from "@anthropic-ai/sdk";
import { type ChatTurn, streamChatAnswer } from "@/lib/ai/chat";
import { aiConfigured } from "@/lib/ai/client";
import { RESTAURANT } from "@/lib/restaurant";
import { clientIp, rateLimit } from "@/lib/util";

export const dynamic = "force-dynamic";

function parseHistory(body: unknown): ChatTurn[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const turns = raw.slice(-20).map((m) => ({
    role: m?.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m?.content ?? "").slice(0, 1500),
  }));
  // Must start with a user turn and end with one.
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user" || !turns[turns.length - 1].content.trim()) return null;
  return turns.filter((t) => t.content.trim());
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`chat:${ip}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "You're sending messages quickly. Please wait a minute." }, { status: 429 });
  }
  if (!aiConfigured()) {
    return Response.json({ error: "Our assistant is offline right now." }, { status: 503 });
  }
  const history = parseHistory(await req.json().catch(() => null));
  if (!history) return Response.json({ error: "Please type a question." }, { status: 400 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const text of streamChatAnswer(history)) controller.enqueue(encoder.encode(text));
      } catch (e) {
        const busy = e instanceof Anthropic.RateLimitError || (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500);
        console.error("[chat] error", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        controller.enqueue(
          encoder.encode(
            busy
              ? `\n\nSorry, I'm a bit overloaded. Please try again in a moment or call ${RESTAURANT.phoneDisplay}.`
              : `\n\nSorry, something went wrong. Please call us at ${RESTAURANT.phoneDisplay}.`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
