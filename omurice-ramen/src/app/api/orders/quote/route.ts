import { CartError } from "@/lib/menu";
import { quoteOrder } from "@/lib/orders";

export async function POST(req: Request) {
  try {
    const lines = await req.json();
    const q = quoteOrder(Array.isArray(lines) ? lines : []);
    return Response.json({ subtotalCents: q.subtotalCents, taxCents: q.taxCents, totalCents: q.totalCents });
  } catch (e) {
    if (e instanceof CartError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: "Couldn't price your order." }, { status: 400 });
  }
}
