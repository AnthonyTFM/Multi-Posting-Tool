import { adminGuard } from "@/lib/admin-api";
import { listOrders } from "@/lib/orders";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const s = getSettings();
  return Response.json({ orders: listOrders({ hours: 18 }), settings: { orderingPaused: s.orderingPaused, prepMinutes: s.prepMinutes } });
}
