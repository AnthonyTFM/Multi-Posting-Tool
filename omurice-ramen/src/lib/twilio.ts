import crypto from "node:crypto";

const SID = () => process.env.TWILIO_ACCOUNT_SID ?? "";
const TOKEN = () => process.env.TWILIO_AUTH_TOKEN ?? "";

export function smsEnabled(): boolean {
  return !!(SID() && TOKEN() && process.env.TWILIO_SMS_FROM);
}

/** Send a text. No-ops (logs) when Twilio isn't configured so local dev just works. */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!smsEnabled()) {
    console.log(`[sms:disabled] to=${to} ${body}`);
    return;
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID()}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${SID()}:${TOKEN()}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_SMS_FROM!, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio SMS ${res.status}: ${await res.text()}`);
}

export function sendSmsQuietly(to: string, body: string): void {
  sendSms(to, body).catch((e) => console.error("[sms] failed:", e));
}

/**
 * Verify X-Twilio-Signature (HMAC-SHA1 of the full URL + sorted POST params).
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!TOKEN()) return process.env.NODE_ENV !== "production"; // allow local testing without creds
  if (!signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const expected = crypto.createHmac("sha1", TOKEN()).update(Buffer.from(data, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Public base URL as Twilio sees it (needed for signature checks behind proxies). */
export function publicBaseUrl(req?: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (!req) return "http://localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch]!);
}

export function twiml(inner: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

/** Parse a Twilio webhook (form-encoded) and verify its signature. */
export async function readTwilioRequest(req: Request): Promise<{ params: Record<string, string>; valid: boolean }> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    params[k] = String(v);
  });
  const url = publicBaseUrl(req) + new URL(req.url).pathname + new URL(req.url).search;
  return { params, valid: validTwilioSignature(url, params, req.headers.get("x-twilio-signature")) };
}
