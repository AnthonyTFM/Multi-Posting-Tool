// SQLite via Node's built-in driver: no native build step, one file to back up.
// Fine for a single location. Put DATABASE_PATH on a persistent volume in production.

import fs from "node:fs";
import path from "node:path";
import { SEED_CATEGORIES, SEED_FAQS } from "./seed-data.ts";

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
type Database = InstanceType<typeof DatabaseSync>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  art TEXT NOT NULL DEFAULT 'ramen',
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  image TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  option_groups TEXT NOT NULL DEFAULT '[]',
  sold_out INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  popular INTEGER NOT NULL DEFAULT 0,
  pos_plu TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_at TEXT NOT NULL,
  asap INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  lines TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  pos_status TEXT NOT NULL DEFAULT 'none',
  pos_error TEXT,
  client_ip TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  party_size INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  local_date TEXT NOT NULL,
  local_minutes INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reservations_date ON reservations(local_date);
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  call_sid TEXT UNIQUE,
  from_number TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT NOT NULL DEFAULT 'in_progress',
  summary TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '[]',
  order_id TEXT,
  reservation_id TEXT
);
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`;

function seed(db: Database) {
  const hasMenu = db.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };
  if (hasMenu.n === 0) {
    const insCat = db.prepare("INSERT INTO categories (id, name, description, art, sort) VALUES (?, ?, ?, ?, ?)");
    const insItem = db.prepare(
      `INSERT INTO items (id, category_id, name, description, price_cents, tags, option_groups, popular, verified, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    SEED_CATEGORIES.forEach((cat, ci) => {
      insCat.run(cat.id, cat.name, cat.description, cat.art, ci);
      cat.items.forEach((it, ii) => {
        insItem.run(
          it.id,
          cat.id,
          it.name,
          it.description,
          it.priceCents,
          JSON.stringify(it.tags ?? []),
          JSON.stringify(it.optionGroups ?? []),
          it.popular ? 1 : 0,
          it.verified ? 1 : 0,
          ii,
        );
      });
    });
  }
  const hasFaq = db.prepare("SELECT COUNT(*) AS n FROM faqs").get() as { n: number };
  if (hasFaq.n === 0) {
    const ins = db.prepare("INSERT INTO faqs (question, answer, sort) VALUES (?, ?, ?)");
    SEED_FAQS.forEach((f, i) => ins.run(f.question, f.answer, i));
  }
}

function open(): Database {
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "omurice.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  seed(db);
  return db;
}

// One connection per process; survive Next.js dev hot reloads.
const g = globalThis as unknown as { __omuriceDb?: Database };
export function db(): Database {
  if (!g.__omuriceDb) g.__omuriceDb = open();
  return g.__omuriceDb;
}

export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    d.exec("COMMIT");
    return out;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
