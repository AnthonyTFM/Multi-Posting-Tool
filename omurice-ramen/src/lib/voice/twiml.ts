import { getMenu } from "../menu.ts";
import { RESTAURANT } from "../restaurant.ts";
import { escapeXml } from "../twilio.ts";
import { makeRelayToken } from "./token.ts";

export const GREETING = `Thanks for calling Omurice Ramen and Boba! I'm the restaurant's virtual assistant. I can take a pickup order, book a table for groups of six or more, or answer questions. Say "team member" anytime to reach our staff. What can I do for you?`;

export const RETURN_GREETING = "Sorry, our team couldn't get to the phone just now. I'm back and happy to help. What can I do for you?";

/** Speech-recognition hints: menu vocabulary that generic STT often mishears. */
function speechHints(): string {
  const words = new Set(["omurice", "tonkotsu", "shoyu", "takoyaki", "gyoza", "karaage", "omusoba", "yakult", "boba", "bao", "chashu", "katsu", "ramune", "mochi", "taro", "matcha"]);
  for (const c of getMenu().categories) for (const i of c.items) words.add(i.name.replace(/\(.*?\)/g, "").trim());
  return [...words].join(",").slice(0, 1000);
}

export function relayTwiml(baseUrl: string, callSid: string, from: string, greeting = GREETING): string {
  const wsBase = baseUrl.replace(/^http/, "ws");
  const url = `${wsBase}/voice/relay?t=${encodeURIComponent(makeRelayToken(callSid))}`;
  const attrs: Record<string, string> = {
    url,
    welcomeGreeting: greeting,
    language: "en-US",
    dtmfDetection: "true",
    hints: speechHints(),
  };
  if (process.env.VOICE_TTS_PROVIDER) attrs.ttsProvider = process.env.VOICE_TTS_PROVIDER;
  if (process.env.VOICE_NAME) attrs.voice = process.env.VOICE_NAME;
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(v)}"`)
    .join(" ");
  return `<Connect action="${escapeXml(`${baseUrl}/api/voice/after`)}"><ConversationRelay ${attrStr}><Parameter name="from" value="${escapeXml(from)}"/></ConversationRelay></Connect>`;
}

export function staffNumber(): string | null {
  return process.env.STAFF_TRANSFER_NUMBER || null;
}

/** Ring the staff line; if nobody answers, /api/voice/dial-status sends the caller back to the AI. */
export function dialStaffTwiml(baseUrl: string, intro: string): string {
  const staff = staffNumber();
  if (!staff) {
    return `<Say>Sorry, our team isn't available right now. You can order online at omurice ramen dot com, or call back in a few minutes. Goodbye!</Say><Hangup/>`;
  }
  const timeout = Number(process.env.STAFF_RING_SECONDS || 25);
  return `${intro ? `<Say>${escapeXml(intro)}</Say>` : ""}<Dial timeout="${timeout}" action="${escapeXml(`${baseUrl}/api/voice/dial-status`)}">${escapeXml(staff)}</Dial>`;
}

export const SORRY_CLOSED = `Sorry, we couldn't connect you. Please call back or visit omurice ramen dot com. Goodbye from ${RESTAURANT.shortName}!`;
