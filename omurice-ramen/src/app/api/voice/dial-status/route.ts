// <Dial action> callback: if staff didn't pick up, send the caller back to the AI host.
import { aiConfigured } from "@/lib/ai/client";
import { getSettings } from "@/lib/settings";
import { publicBaseUrl, readTwilioRequest, twiml } from "@/lib/twilio";
import { RETURN_GREETING, relayTwiml, SORRY_CLOSED } from "@/lib/voice/twiml";

export async function POST(req: Request) {
  const { params, valid } = await readTwilioRequest(req);
  if (!valid) return new Response("Invalid signature", { status: 403 });
  if (params.DialCallStatus === "completed") return twiml("<Hangup/>");
  if (!getSettings().aiPhoneEnabled || !aiConfigured()) return twiml(`<Say>${SORRY_CLOSED}</Say><Hangup/>`);
  return twiml(relayTwiml(publicBaseUrl(req), params.CallSid ?? "", params.From ?? "", RETURN_GREETING));
}
