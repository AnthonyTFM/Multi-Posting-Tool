import { adminGuard, readJson } from "@/lib/admin-api";
import { ORDER_STATUSES, type OrderStatus, retryPos, updateOrderStatus } from "@/lib/orders";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const { id } = await params;
  const body = await readJson<{ status?: string; action?: string }>(req);
  if (body?.action === "retry_pos") {
    const o = retryPos(id);
    return o ? Response.json(o) : Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!body?.status || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }
  const o = updateOrderStatus(id, body.status as OrderStatus);
  return o ? Response.json(o) : Response.json({ error: "Not found" }, { status: 404 });
}
