// <Connect action> callback: runs when the AI session ends (transfer, goodbye, or failure).
import { publicBaseUrl, readTwilioRequest, twiml } from "@/lib/twilio";
import { dialStaffTwiml } from "@/lib/voice/twiml";

export async function POST(req: Request) {
  const { params, valid } = await readTwilioRequest(req);
  if (!valid) return new Response("Invalid signature", { status: 403 });
  const base = publicBaseUrl(req);

  let handoff: { reason?: string } = {};
  try {
    handoff = JSON.parse(params.HandoffData || "{}");
  } catch {
    // ignore malformed handoff data
  }

  if (handoff.reason === "hangup") return twiml("<Hangup/>");
  if (handoff.reason === "transfer") return twiml(dialStaffTwiml(base, ""));

  // No handoff data: the AI session dropped or errored. Never strand a caller.
  if (params.CallStatus === "completed") return twiml("");
  console.warn("[voice] AI session ended without handoff", params.SessionStatus, params.CallSid);
  return twiml(dialStaffTwiml(base, "Sorry about that. Let me connect you to our team."));
}
