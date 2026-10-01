import Anthropic from "@anthropic-ai/sdk";

// Override with AI_MODEL (e.g. "claude-haiku-4-5" for lower phone latency/cost).
export const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

export function aiConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const isHaiku45 = MODEL.startsWith("claude-haiku-4-5");
// Server-side refusal fallback ("default" routing) is available on these models.
const supportsFallback = /^claude-(opus-5|sonnet-5-5|fable-5-1)/.test(MODEL);
// Mid-conversation `role: "system"` messages.
export const supportsSystemMessages = /^claude-(opus-5|opus-4-8|sonnet-5-5|fable-5|mythos-5)/.test(MODEL);

/**
 * Model-dependent request params. Low effort keeps replies fast for chat and voice;
 * on Opus 5.5 thinking can't be disabled, effort is the control.
 */
export function modelParams(effort: "low" | "medium" | "high" = "low") {
  return {
    model: MODEL,
    ...(isHaiku45 ? {} : { output_config: { effort } }),
    ...(supportsFallback ? { fallbacks: "default" as const } : {}),
    betas: supportsFallback ? ["server-side-fallback-2026-07-01"] : [],
  };
}
