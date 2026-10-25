import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type DatabaseHandle = Database.Database;

const migrations = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS shop_settings (id INTEGER PRIMARY KEY CHECK (id = 1), shop_name TEXT NOT NULL, owner_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL, address TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'PKR', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1);`,
  `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category_id INTEGER REFERENCES categories(id), gender TEXT NOT NULL DEFAULT 'Unisex', fabric TEXT NOT NULL DEFAULT 'Other', cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (cost_minor >= 0), price_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0), low_stock_threshold INTEGER NOT NULL DEFAULT 5, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS product_variants (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id), size TEXT NOT NULL, color TEXT NOT NULL, barcode TEXT UNIQUE, stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), UNIQUE(product_id, size, color));`,
  `CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id), customer_id INTEGER REFERENCES customers(id), subtotal_minor INTEGER NOT NULL, discount_minor INTEGER NOT NULL DEFAULT 0, total_minor INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'completed', sold_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL REFERENCES sales(id), variant_id INTEGER NOT NULL REFERENCES product_variants(id), product_name TEXT NOT NULL, variant_label TEXT NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price_minor INTEGER NOT NULL, unit_cost_minor INTEGER NOT NULL, discount_minor INTEGER NOT NULL DEFAULT 0, line_total_minor INTEGER NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL REFERENCES sales(id), method TEXT NOT NULL, amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0));`,
  `CREATE TABLE IF NOT EXISTS stock_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, variant_id INTEGER NOT NULL REFERENCES product_variants(id), quantity_delta INTEGER NOT NULL, reason TEXT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`,
  `CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);`,
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id);`
];

export function openDatabase(): DatabaseHandle {
  const databasePath = path.join(app.getPath('userData'), 'loom-pos.sqlite');
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const applied = new Set((database.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((row) => row.version));
  migrations.forEach((migration, index) => {
    if (applied.has(index)) return;
    const apply = database.transaction(() => {
      database.exec(migration);
      database.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(index);
    });
    apply();
  });
  return database;
}
