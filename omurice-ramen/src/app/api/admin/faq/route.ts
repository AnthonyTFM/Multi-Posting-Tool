import { adminGuard, readJson } from "@/lib/admin-api";
import { deleteFaq, listFaqs, upsertFaq } from "@/lib/faq";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  return Response.json({ faqs: listFaqs({ includeHidden: true }) });
}

export async function POST(req: Request) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const b = await readJson<{ id?: number; question?: string; answer?: string; active?: boolean }>(req);
  const question = String(b?.question ?? "").trim().slice(0, 200);
  const answer = String(b?.answer ?? "").trim().slice(0, 1500);
  if (!question || !answer) return Response.json({ error: "Question and answer are required." }, { status: 400 });
  upsertFaq({ id: b?.id ? Number(b.id) : undefined, question, answer, active: b?.active });
  return Response.json({ faqs: listFaqs({ includeHidden: true }) });
}

export async function DELETE(req: Request) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const b = await readJson<{ id?: number }>(req);
  if (!b?.id) return Response.json({ error: "id required" }, { status: 400 });
  deleteFaq(Number(b.id));
  return Response.json({ faqs: listFaqs({ includeHidden: true }) });
}
