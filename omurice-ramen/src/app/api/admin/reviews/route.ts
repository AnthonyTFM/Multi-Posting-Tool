import { adminGuard, readJson } from "@/lib/admin-api";
import { deleteManualReview, listManualReviews, ReviewInputError, reviewsConfigured, saveManualReview } from "@/lib/reviews";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function payload() {
  const s = getSettings();
  return {
    reviews: listManualReviews({ includeHidden: true }),
    rating: s.reviewRating,
    count: s.reviewCount,
    placeId: process.env.GOOGLE_PLACE_ID || s.googlePlaceId,
    apiConnected: reviewsConfigured(),
  };
}

export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  return Response.json(payload());
}

export async function POST(req: Request) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const b = await readJson<{ id?: number; author?: string; rating?: number; text?: string; source?: string; url?: string; when?: string; active?: boolean }>(req);
  try {
    saveManualReview({
      id: b?.id ? Number(b.id) : undefined,
      author: String(b?.author ?? ""),
      rating: Number(b?.rating),
      text: String(b?.text ?? ""),
      source: String(b?.source ?? "Google"),
      url: String(b?.url ?? ""),
      when: String(b?.when ?? ""),
      active: b?.active,
    });
  } catch (e) {
    if (e instanceof ReviewInputError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
  return Response.json(payload());
}

export async function DELETE(req: Request) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const b = await readJson<{ id?: number }>(req);
  if (!b?.id) return Response.json({ error: "id required" }, { status: 400 });
  deleteManualReview(Number(b.id));
  return Response.json(payload());
}
