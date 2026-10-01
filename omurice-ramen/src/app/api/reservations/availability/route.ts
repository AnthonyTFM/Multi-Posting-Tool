import { availability } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  return Response.json(availability(date));
}
