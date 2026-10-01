import { adminGuard, readJson } from "@/lib/admin-api";
import { deleteMedia, getMedia, updateMediaAlt } from "@/lib/media";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const { id } = await params;
  const b = await readJson<{ alt?: string }>(req);
  if (!getMedia(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updateMediaAlt(id, String(b?.alt ?? "")));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const { id } = await params;
  deleteMedia(id);
  return Response.json({ ok: true });
}
