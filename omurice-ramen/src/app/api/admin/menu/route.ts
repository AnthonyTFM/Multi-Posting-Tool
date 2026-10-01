import { adminGuard, readJson } from "@/lib/admin-api";
import { createItem, getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  return Response.json(getMenu({ includeHidden: true }));
}

export async function POST(req: Request) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const b = await readJson<{ categoryId?: string; name?: string; description?: string; priceCents?: number }>(req);
  const name = String(b?.name ?? "").trim();
  const price = Math.round(Number(b?.priceCents));
  if (!b?.categoryId || !name || !Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Category, name and price are required." }, { status: 400 });
  }
  if (!getMenu({ includeHidden: true }).categories.some((c) => c.id === b.categoryId)) {
    return Response.json({ error: "Unknown category." }, { status: 400 });
  }
  return Response.json(createItem({ categoryId: b.categoryId, name, description: String(b.description ?? ""), priceCents: price }), { status: 201 });
}
