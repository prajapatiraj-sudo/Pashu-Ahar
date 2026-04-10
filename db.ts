import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

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
    purchase_price REAL DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    deleted INTEGER DEFAULT 0,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    village TEXT,
    total_outstanding REAL DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    deletedAt TEXT
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
    deleted INTEGER DEFAULT 0,
    deletedAt TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    rate REAL,
    purchase_price REAL,
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
    deleted INTEGER DEFAULT 0,
    deletedAt TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'sales',
    can_update_inventory INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migrations: Add columns if they don't exist
const addColumnIfNotExists = (table: string, column: string, type: string) => {
  try {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const exists = info.some(col => col.name === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`Added column ${column} to ${table}`);
    }
  } catch (err) {
    console.error(`Error adding column ${column} to ${table}:`, err);
  }
};

addColumnIfNotExists('products', 'low_stock_threshold', 'INTEGER DEFAULT 10');
addColumnIfNotExists('products', 'purchase_price', 'REAL DEFAULT 0');
addColumnIfNotExists('users', 'can_update_inventory', 'INTEGER DEFAULT 0');

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

// Seed default admin user
const checkAdmin = db.prepare('SELECT count(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
if (checkAdmin.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
    .run('rajkumar.prajapati@enjayworld.com', hashedPassword, 'Admin', 'admin');
}

if (checkProducts.count === 0) {
  const insert = db.prepare('INSERT INTO products (name_en, name_gu, price) VALUES (?, ?, ?)');
  seedProducts.forEach(p => insert.run(p.en, p.gu, p.price));
}

export default db;
