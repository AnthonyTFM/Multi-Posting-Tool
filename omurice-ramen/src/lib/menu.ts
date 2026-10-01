import { db } from "./db.ts";
import type { Art, CartLineInput, Menu, MenuCategory, MenuItem, OptionGroup, OrderLine } from "./menu-types.ts";

type ItemRow = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  image: string | null;
  tags: string;
  option_groups: string;
  sold_out: number;
  active: number;
  popular: number;
  pos_plu: string | null;
  verified: number;
  sort: number;
};

type CategoryRow = { id: string; name: string; description: string; art: string; sort: number; active: number };

function toItem(r: ItemRow): MenuItem {
  return {
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    priceCents: r.price_cents,
    image: r.image,
    tags: JSON.parse(r.tags),
    optionGroups: JSON.parse(r.option_groups),
    soldOut: !!r.sold_out,
    active: !!r.active,
    popular: !!r.popular,
    posPlu: r.pos_plu,
    verified: !!r.verified,
    sort: r.sort,
  };
}

function toCategory(r: CategoryRow): MenuCategory {
  return { id: r.id, name: r.name, description: r.description, art: r.art as Art, sort: r.sort, active: !!r.active };
}

/** Full menu. `includeHidden` is for the admin editor. */
export function getMenu(opts: { includeHidden?: boolean } = {}): Menu {
  const cats = (db().prepare("SELECT * FROM categories ORDER BY sort, name").all() as CategoryRow[]).map(toCategory);
  const items = (db().prepare("SELECT * FROM items ORDER BY sort, name").all() as ItemRow[]).map(toItem);
  return {
    categories: cats
      .filter((c) => opts.includeHidden || c.active)
      .map((c) => ({
        ...c,
        items: items.filter((i) => i.categoryId === c.id && (opts.includeHidden || i.active)),
      })),
  };
}

export function getItem(id: string): MenuItem | null {
  const row = db().prepare("SELECT * FROM items WHERE id = ?").get(id) as ItemRow | undefined;
  return row ? toItem(row) : null;
}

export function updateItem(
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "description" | "priceCents" | "soldOut" | "active" | "popular" | "posPlu" | "verified" | "image" | "optionGroups" | "categoryId" | "sort">>,
): MenuItem | null {
  const cols: Record<string, unknown> = {
    name: patch.name,
    description: patch.description,
    price_cents: patch.priceCents,
    sold_out: patch.soldOut === undefined ? undefined : patch.soldOut ? 1 : 0,
    active: patch.active === undefined ? undefined : patch.active ? 1 : 0,
    popular: patch.popular === undefined ? undefined : patch.popular ? 1 : 0,
    verified: patch.verified === undefined ? undefined : patch.verified ? 1 : 0,
    pos_plu: patch.posPlu,
    image: patch.image,
    option_groups: patch.optionGroups === undefined ? undefined : JSON.stringify(patch.optionGroups),
    category_id: patch.categoryId,
    sort: patch.sort,
  };
  const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
  if (entries.length) {
    db()
      .prepare(`UPDATE items SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
      .run(...(entries.map(([, v]) => v) as (string | number | null)[]), id);
  }
  return getItem(id);
}

export function createItem(input: {
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
}): MenuItem {
  const base = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "item";
  let id = base;
  for (let n = 2; getItem(id); n++) id = `${base}-${n}`;
  const max = db().prepare("SELECT COALESCE(MAX(sort), -1) AS m FROM items WHERE category_id = ?").get(input.categoryId) as { m: number };
  db()
    .prepare(
      "INSERT INTO items (id, category_id, name, description, price_cents, verified, sort) VALUES (?, ?, ?, ?, ?, 1, ?)",
    )
    .run(id, input.categoryId, input.name, input.description, input.priceCents, max.m + 1);
  return getItem(id)!;
}

export function deleteItem(id: string): void {
  db().prepare("DELETE FROM items WHERE id = ?").run(id);
}

export class CartError extends Error {}

/**
 * Validate a cart against the live menu and price it. Throws CartError with a
 * customer-readable message (the phone agent reads these out loud).
 */
export function priceCart(lines: CartLineInput[]): { lines: OrderLine[]; subtotalCents: number } {
  if (!Array.isArray(lines) || lines.length === 0) throw new CartError("The order is empty.");
  if (lines.length > 50) throw new CartError("That's a very large order. Please call the restaurant to place it.");
  const out: OrderLine[] = [];
  let subtotal = 0;
  for (const line of lines) {
    const item = getItem(String(line.itemId));
    if (!item || !item.active) throw new CartError(`"${line.itemId}" isn't on our menu.`);
    if (item.soldOut) throw new CartError(`Sorry, ${item.name} is sold out right now.`);
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 30) throw new CartError(`Invalid quantity for ${item.name}.`);

    const picked = line.options ?? {};
    const options: OrderLine["options"] = [];
    for (const group of item.optionGroups as OptionGroup[]) {
      const ids = Array.isArray(picked[group.id]) ? [...new Set(picked[group.id].map(String))] : [];
      if (ids.length < group.min) throw new CartError(`Please choose ${group.name.toLowerCase()} for ${item.name}.`);
      if (ids.length > group.max) throw new CartError(`Too many choices for ${group.name.toLowerCase()} on ${item.name}.`);
      for (const cid of ids) {
        const choice = group.choices.find((c) => c.id === cid);
        if (!choice) throw new CartError(`"${cid}" isn't an option for ${item.name}.`);
        options.push({ groupId: group.id, group: group.name, choiceId: choice.id, choice: choice.name, priceCents: choice.priceCents });
      }
    }
    for (const gid of Object.keys(picked)) {
      if (!item.optionGroups.some((g) => g.id === gid) && picked[gid]?.length) {
        throw new CartError(`${item.name} doesn't have "${gid}" options.`);
      }
    }
    const unit = item.priceCents + options.reduce((s, o) => s + o.priceCents, 0);
    subtotal += unit * qty;
    out.push({
      itemId: item.id,
      name: item.name,
      quantity: qty,
      unitPriceCents: unit,
      options,
      notes: String(line.notes ?? "").slice(0, 200),
      posPlu: item.posPlu,
    });
  }
  return { lines: out, subtotalCents: subtotal };
}

/** Compact plain-text menu for the AI agents' system prompts. */
export function menuForPrompt(): string {
  const menu = getMenu();
  const out: string[] = [];
  for (const cat of menu.categories) {
    if (!cat.items.length) continue;
    out.push(`## ${cat.name}${cat.description ? ` — ${cat.description}` : ""}`);
    for (const it of cat.items) {
      const price = `$${(it.priceCents / 100).toFixed(2)}`;
      const tags = it.tags.filter((t) => !["pork", "chicken", "beef"].includes(t));
      out.push(
        `- [${it.id}] ${it.name} ${price}${it.soldOut ? " (SOLD OUT today)" : ""}${tags.length ? ` {${tags.join(", ")}}` : ""}${it.description ? `: ${it.description}` : ""}`,
      );
      for (const g of it.optionGroups) {
        const rule = g.min >= 1 ? (g.max === 1 ? "required, pick 1" : `required, pick ${g.min}-${g.max}`) : `optional, up to ${g.max}`;
        const choices = g.choices
          .map((c) => `${c.id}=${c.name}${c.priceCents ? ` +$${(c.priceCents / 100).toFixed(2)}` : ""}`)
          .join(", ");
        out.push(`    • option group [${g.id}] ${g.name} (${rule}): ${choices}`);
      }
    }
  }
  return out.join("\n");
}
