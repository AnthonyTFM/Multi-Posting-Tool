import { adminGuard } from "@/lib/admin-api";
import { listCalls } from "@/lib/calls";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  return Response.json({ calls: listCalls(100) });
}
