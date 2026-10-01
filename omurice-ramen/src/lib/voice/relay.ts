// Twilio ConversationRelay WebSocket handler.
// Twilio does speech-to-text and text-to-speech; we exchange text with it:
//   in:  setup | prompt {voicePrompt, last} | interrupt {utteranceUntilInterrupt} | dtmf {digit} | error
//   out: text {token, last} | end {handoffData}
// https://www.twilio.com/docs/voice/conversationrelay/websocket-messages

import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { type AgentHooks, PhoneAgent } from "../ai/phone-agent.ts";
import { appendTranscript, startCall, updateCall } from "../calls.ts";
import { verifyRelayToken } from "./token.ts";

type Inbound =
  | { type: "setup"; callSid: string; from?: string; to?: string; customParameters?: Record<string, string> }
  | { type: "prompt"; voicePrompt: string; last?: boolean }
  | { type: "interrupt"; utteranceUntilInterrupt?: string }
  | { type: "dtmf"; digit: string }
  | { type: "error"; description?: string };

export type Handoff = { reason: "transfer" | "hangup"; detail?: string };

type Agent = { respond(text: string): AsyncGenerator<string> };
type AgentFactory = (callerNumber: string, hooks: AgentHooks) => Agent;

export class CallSession {
  private readonly agent: Agent;
  private readonly queue: string[] = [];
  private busy = false;
  private muted = false;
  private interruptedAt: string | null = null;
  private transferReason: string | null = null;
  private hangupRequested = false;
  private ended = false;

  constructor(
    private readonly callId: string,
    callerNumber: string,
    private readonly send: (msg: object) => void,
    makeAgent: AgentFactory = (n, h) => new PhoneAgent(n, h),
  ) {
    this.agent = makeAgent(callerNumber, {
      onOrder: (orderId) => updateCall(callId, { outcome: "order", orderId }),
      onReservation: (reservationId) => updateCall(callId, { outcome: "reservation", reservationId }),
      onTransfer: (reason) => {
        this.transferReason = reason;
        updateCall(callId, { outcome: "transfer", summary: `Transferred: ${reason}` });
      },
      onEnd: () => {
        this.hangupRequested = true;
      },
    });
  }

  onPrompt(text: string) {
    const t = text.trim();
    if (!t || this.ended) return;
    appendTranscript(this.callId, "caller", t);
    this.queue.push(t);
    void this.pump();
  }

  onInterrupt(heard: string | undefined) {
    if (!this.busy) return;
    this.muted = true; // stop speaking the rest of this reply; the turn still completes
    this.interruptedAt = heard ?? "";
  }

  onDtmf(digit: string) {
    if (digit === "0") {
      this.transferReason = "Caller pressed 0";
      updateCall(this.callId, { outcome: "transfer", summary: "Caller pressed 0 for staff" });
      this.speak("Connecting you to our team now.");
      this.finishSoon();
    }
  }

  private speak(text: string) {
    this.send({ type: "text", token: text, last: true });
  }

  private async pump() {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.queue.length && !this.ended && !this.transferReason) {
        let text = this.queue.splice(0).join(" ");
        if (this.interruptedAt !== null) {
          text = `[The caller interrupted your last reply; they heard only: "${this.interruptedAt}"]\n${text}`;
          this.interruptedAt = null;
        }
        this.muted = false;
        let said = "";
        try {
          for await (const chunk of this.agent.respond(text)) {
            said += chunk;
            if (!this.muted && !this.ended) this.send({ type: "text", token: chunk, last: false });
          }
        } catch (e) {
          console.error("[voice] agent error", e);
          updateCall(this.callId, { outcome: "error", summary: "AI error, transferred to staff" });
          this.transferReason = "AI error";
          const sorry = " Sorry, I'm having trouble on my end. Let me connect you to our team.";
          said += sorry;
          this.send({ type: "text", token: sorry, last: false });
        }
        this.send({ type: "text", token: "", last: true });
        if (said.trim()) appendTranscript(this.callId, "agent", said.trim());
      }
    } finally {
      this.busy = false;
    }
    if (this.transferReason || this.hangupRequested) this.finishSoon();
    else if (this.queue.length) void this.pump();
  }

  /** Let the last sentence play, then hand the call back to Twilio (<Connect action>). */
  private finishSoon() {
    if (this.ended) return;
    this.ended = true;
    const handoff: Handoff = this.transferReason
      ? { reason: "transfer", detail: this.transferReason }
      : { reason: "hangup" };
    if (handoff.reason === "hangup") updateCall(this.callId, { outcome: "info" });
    setTimeout(() => this.send({ type: "end", handoffData: JSON.stringify(handoff) }), handoff.reason === "transfer" ? 1500 : 2500);
  }

  close() {
    this.ended = true;
    updateCall(this.callId, { outcome: "hangup", ended: true });
  }
}

export function handleRelayConnection(ws: WebSocket, req: IncomingMessage) {
  const token = new URL(req.url ?? "/", "http://localhost").searchParams.get("t");
  let session: CallSession | null = null;
  const send = (msg: object) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  ws.on("message", (raw) => {
    let msg: Inbound;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "setup") {
      if (!verifyRelayToken(token, msg.callSid)) {
        console.warn("[voice] rejected relay connection with bad token");
        ws.close(1008, "unauthorized");
        return;
      }
      const from = msg.customParameters?.from || msg.from || "";
      const callId = startCall(msg.callSid, from);
      session = new CallSession(callId, from, send);
      return;
    }
    if (!session) return;
    switch (msg.type) {
      case "prompt":
        if (msg.last !== false) session.onPrompt(msg.voicePrompt);
        break;
      case "interrupt":
        session.onInterrupt(msg.utteranceUntilInterrupt);
        break;
      case "dtmf":
        session.onDtmf(msg.digit);
        break;
      case "error":
        console.error("[voice] relay error:", msg.description);
        break;
    }
  });

  ws.on("close", () => session?.close());
  ws.on("error", (e) => console.error("[voice] ws error", e));
}
