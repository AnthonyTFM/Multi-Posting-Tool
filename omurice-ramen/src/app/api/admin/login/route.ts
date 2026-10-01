import { checkPassword, makeSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/util";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!checkPassword(String(body.password ?? ""))) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  (await cookies()).set(SESSION_COOKIE, makeSessionToken(), sessionCookieOptions);
  return Response.json({ ok: true });
}
