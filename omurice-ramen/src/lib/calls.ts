import { db, nowIso } from "./db.ts";
import { randomId } from "./util.ts";

export type CallOutcome = "in_progress" | "order" | "reservation" | "transfer" | "info" | "hangup" | "error";

export type CallLog = {
  id: string;
  callSid: string;
  fromNumber: string;
  startedAt: string;
  endedAt: string | null;
  outcome: CallOutcome;
  summary: string;
  transcript: { role: "caller" | "agent"; text: string; at: string }[];
  orderId: string | null;
  reservationId: string | null;
};

type Row = {
  id: string;
  call_sid: string;
  from_number: string;
  started_at: string;
  ended_at: string | null;
  outcome: string;
  summary: string;
  transcript: string;
  order_id: string | null;
  reservation_id: string | null;
};

const toCall = (r: Row): CallLog => ({
  id: r.id,
  callSid: r.call_sid,
  fromNumber: r.from_number,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  outcome: r.outcome as CallOutcome,
  summary: r.summary,
  transcript: JSON.parse(r.transcript),
  orderId: r.order_id,
  reservationId: r.reservation_id,
});

export function startCall(callSid: string, from: string): string {
  const existing = db().prepare("SELECT id FROM calls WHERE call_sid = ?").get(callSid) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomId();
  db().prepare("INSERT INTO calls (id, call_sid, from_number, started_at) VALUES (?, ?, ?, ?)").run(id, callSid, from, nowIso());
  return id;
}

export function appendTranscript(id: string, role: "caller" | "agent", text: string): void {
  const row = db().prepare("SELECT transcript FROM calls WHERE id = ?").get(id) as { transcript: string } | undefined;
  if (!row) return;
  const t = JSON.parse(row.transcript) as CallLog["transcript"];
  t.push({ role, text, at: nowIso() });
  db().prepare("UPDATE calls SET transcript = ? WHERE id = ?").run(JSON.stringify(t), id);
}

export function updateCall(
  id: string,
  patch: Partial<{ outcome: CallOutcome; summary: string; orderId: string; reservationId: string; ended: boolean }>,
): void {
  const c = db().prepare("SELECT * FROM calls WHERE id = ?").get(id) as Row | undefined;
  if (!c) return;
  // Don't let a later "info"/"hangup" overwrite a more meaningful outcome.
  const rank: Record<string, number> = { in_progress: 0, info: 1, hangup: 1, error: 2, transfer: 3, reservation: 4, order: 5 };
  const outcome = patch.outcome && (rank[patch.outcome] ?? 0) >= (rank[c.outcome] ?? 0) ? patch.outcome : c.outcome;
  db()
    .prepare("UPDATE calls SET outcome = ?, summary = ?, order_id = ?, reservation_id = ?, ended_at = ? WHERE id = ?")
    .run(
      outcome,
      patch.summary ?? c.summary,
      patch.orderId ?? c.order_id,
      patch.reservationId ?? c.reservation_id,
      patch.ended ? nowIso() : c.ended_at,
      id,
    );
}

export function listCalls(limit = 50): CallLog[] {
  return (db().prepare("SELECT * FROM calls ORDER BY started_at DESC LIMIT ?").all(limit) as Row[]).map(toCall);
}
