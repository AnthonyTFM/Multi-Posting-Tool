import { isAdmin } from "./auth.ts";

/**
 * Gate for /api/admin/*. Mutations must be same-origin JSON requests, which a
 * cross-site form can't forge (CSRF), on top of the signed session cookie.
 */
export async function adminGuard(req: Request, opts: { mutating?: boolean } = {}): Promise<Response | null> {
  if (!(await isAdmin())) return Response.json({ error: "Not signed in" }, { status: 401 });
  if (opts.mutating) {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: "Expected JSON" }, { status: 415 });
    }
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return Response.json({ error: "Bad origin" }, { status: 403 });
    }
  }
  return null;
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
