import { db } from "./db.ts";

export type Faq = { id: number; question: string; answer: string; sort: number; active: boolean };

type Row = { id: number; question: string; answer: string; sort: number; active: number };

export function listFaqs(opts: { includeHidden?: boolean } = {}): Faq[] {
  const rows = db().prepare("SELECT * FROM faqs ORDER BY sort, id").all() as Row[];
  return rows.filter((r) => opts.includeHidden || r.active).map((r) => ({ ...r, active: !!r.active }));
}

export function upsertFaq(f: { id?: number; question: string; answer: string; active?: boolean; sort?: number }): void {
  if (f.id) {
    db()
      .prepare("UPDATE faqs SET question = ?, answer = ?, active = ?, sort = COALESCE(?, sort) WHERE id = ?")
      .run(f.question, f.answer, f.active === false ? 0 : 1, f.sort ?? null, f.id);
  } else {
    const max = db().prepare("SELECT COALESCE(MAX(sort), -1) AS m FROM faqs").get() as { m: number };
    db().prepare("INSERT INTO faqs (question, answer, sort, active) VALUES (?, ?, ?, 1)").run(f.question, f.answer, max.m + 1);
  }
}

export function deleteFaq(id: number): void {
  db().prepare("DELETE FROM faqs WHERE id = ?").run(id);
}

export function faqsForPrompt(): string {
  return listFaqs()
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
}
