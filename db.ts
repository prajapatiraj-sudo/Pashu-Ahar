import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('krushnam.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en TEXT NOT NULL,
    name_gu TEXT,
    name_hi TEXT,
    unit TEXT DEFAULT 'Bag',
    price REAL DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_outstanding REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL,
    previous_outstanding REAL,
    total_amount REAL,
    paid_amount REAL,
    balance_due REAL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    rate REAL,
    amount REAL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    amount REAL,
    method TEXT,
    note TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

// Seed initial products based on the bill image provided
const seedProducts = [
  { en: 'Kapas Khol', gu: 'કપાસ ખોળ', price: 0 },
  { en: 'Bhusu', gu: 'ભુસુ', price: 0 },
  { en: 'Chuni - Chana Chuni', gu: 'ચુની - ચના ચુની', price: 0 },
  { en: 'Dan', gu: 'દાણ', price: 0 },
  { en: 'Caliber Starter', gu: 'કેલિબર સ્ટાર્ટર', price: 0 },
  { en: 'Caliber Junior', gu: 'કેલિબર જુનિયર', price: 0 },
  { en: 'Caliber Senior', gu: 'કેલિબર સિનિયર', price: 0 },
  { en: 'Prelecto Pro', gu: 'પ્રીલેક્ટો પ્રો.', price: 0 },
  { en: 'Powerlek', gu: 'પાવરલેક', price: 0 },
  { en: 'Unilek Bronze', gu: 'યુનિલેક બ્રોન્ઝ', price: 0 },
  { en: 'Unilek Buff', gu: 'યુનિલેક બફ', price: 0 },
  { en: 'Chana Chilkha', gu: 'ચના છીલકા', price: 0 },
  { en: 'Saaya Chuni', gu: 'સાયા ચુની', price: 0 },
  { en: 'Platinium', gu: 'પ્લેટિનિયમ', price: 0 },
  { en: 'Tuver Chuni', gu: 'તુવેર ચુની', price: 0 }
];

const checkProducts = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
if (checkProducts.count === 0) {
  const insert = db.prepare('INSERT INTO products (name_en, name_gu, price) VALUES (?, ?, ?)');
  seedProducts.forEach(p => insert.run(p.en, p.gu, p.price));
}

export default db;
