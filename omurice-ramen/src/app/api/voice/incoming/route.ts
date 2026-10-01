// Twilio "A call comes in" webhook for the AI phone number.
import { aiConfigured } from "@/lib/ai/client";
import { getSettings } from "@/lib/settings";
import { publicBaseUrl, readTwilioRequest, twiml } from "@/lib/twilio";
import { dialStaffTwiml, relayTwiml } from "@/lib/voice/twiml";

export async function POST(req: Request) {
  const { params, valid } = await readTwilioRequest(req);
  if (!valid) return new Response("Invalid signature", { status: 403 });
  const base = publicBaseUrl(req);

  // Kill switch or missing AI config: ring the staff line like a normal phone.
  if (!getSettings().aiPhoneEnabled || !aiConfigured()) {
    return twiml(dialStaffTwiml(base, ""));
  }
  return twiml(relayTwiml(base, params.CallSid ?? "", params.From ?? ""));
}
