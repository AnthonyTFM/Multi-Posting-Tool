// Uptime/health check for the host (Render, Railway, uptime monitors).
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    db().prepare("SELECT 1").get();
    return Response.json({ ok: true, time: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
