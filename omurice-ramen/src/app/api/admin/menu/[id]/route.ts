import { adminGuard, readJson } from "@/lib/admin-api";
import { deleteItem, getItem, updateItem } from "@/lib/menu";
import type { MenuItem, OptionGroup } from "@/lib/menu-types";

function validGroups(v: unknown): v is OptionGroup[] {
  return (
    Array.isArray(v) &&
    v.every(
      (g) =>
        g && typeof g.id === "string" && typeof g.name === "string" && Number.isInteger(g.min) && Number.isInteger(g.max) &&
        g.min >= 0 && g.max >= Math.max(1, g.min) && Array.isArray(g.choices) && g.choices.length > 0 &&
        g.choices.every((c: unknown) => {
          const ch = c as { id?: unknown; name?: unknown; priceCents?: unknown };
          return typeof ch.id === "string" && typeof ch.name === "string" && Number.isInteger(ch.priceCents) && (ch.priceCents as number) >= 0;
        }),
    )
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const { id } = await params;
  if (!getItem(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const b = (await readJson<Record<string, unknown>>(req)) ?? {};
  const patch: Partial<MenuItem> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim().slice(0, 80);
  if (typeof b.description === "string") patch.description = b.description.slice(0, 400);
  if (b.priceCents !== undefined) {
    const p = Math.round(Number(b.priceCents));
    if (!Number.isFinite(p) || p < 0 || p > 100000) return Response.json({ error: "Invalid price" }, { status: 400 });
    patch.priceCents = p;
  }
  for (const k of ["soldOut", "active", "popular", "verified"] as const) if (typeof b[k] === "boolean") patch[k] = b[k] as boolean;
  if (b.posPlu !== undefined) patch.posPlu = String(b.posPlu ?? "").trim().slice(0, 40) || null;
  if (b.image !== undefined) {
    const img = String(b.image ?? "").trim();
    if (img && !/^(https:\/\/|\/images\/|\/media\/)[^\s"<>]*$/.test(img)) {
      return Response.json({ error: "Image must be from the photo library, an https:// URL or /images/… path" }, { status: 400 });
    }
    patch.image = img || null;
  }
  if (b.optionGroups !== undefined) {
    if (!validGroups(b.optionGroups)) return Response.json({ error: "Invalid option groups" }, { status: 400 });
    patch.optionGroups = b.optionGroups;
  }
  return Response.json(updateItem(id, patch));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(req, { mutating: true });
  if (denied) return denied;
  const { id } = await params;
  deleteItem(id);
  return Response.json({ ok: true });
}
