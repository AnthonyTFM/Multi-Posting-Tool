// Short-lived signed token that ties a WebSocket connection to the Twilio call
// whose (signature-verified) webhook created it.

import crypto from "node:crypto";

function key(): string {
  return process.env.SESSION_SECRET || process.env.TWILIO_AUTH_TOKEN || "dev-only-secret-change-me";
}

export function makeRelayToken(callSid: string, ttlSeconds = 120): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto.createHmac("sha256", key()).update(`${callSid}.${exp}`).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyRelayToken(token: string | null, callSid: string): boolean {
  if (!token || !callSid) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", key()).update(`${callSid}.${exp}`).digest("base64url");
  return sig?.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
