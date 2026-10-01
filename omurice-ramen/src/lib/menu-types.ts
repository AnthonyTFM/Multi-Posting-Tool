// Shared menu/cart types. Safe to import from client components.

export type Art = "ramen" | "omurice" | "boba" | "appetizer" | "dessert" | "drink";

export type OptionChoice = { id: string; name: string; priceCents: number };

export type OptionGroup = {
  id: string;
  name: string;
  min: number; // 0 = optional, 1 = required single choice
  max: number;
  choices: OptionChoice[];
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  image: string | null;
  tags: string[];
  optionGroups: OptionGroup[];
  soldOut: boolean;
  active: boolean;
  popular: boolean;
  posPlu: string | null;
  verified: boolean;
  sort: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  description: string;
  art: Art;
  sort: number;
  active: boolean;
};

export type Menu = { categories: (MenuCategory & { items: MenuItem[] })[] };

/** What a customer (web or phone) asks for. Prices are never trusted from the client. */
export type CartLineInput = {
  itemId: string;
  quantity: number;
  // groupId -> selected choice ids
  options?: Record<string, string[]>;
  notes?: string;
};

/** A priced, validated line as stored on an order. */
export type OrderLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number; // base + options
  options: { group: string; choice: string; priceCents: number; choiceId: string; groupId: string }[];
  notes: string;
  posPlu: string | null;
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
