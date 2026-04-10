import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.ts';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
  
  // Audit Log Helper
  const logAction = (userId: number, userName: string, action: string, entityType: string, entityId: number | string | null, details: any) => {
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, userName, action, entityType, entityId, JSON.stringify(details), new Date().toISOString());
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // API Routes
  
  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted = 0').get(email) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, can_update_inventory: user.can_update_inventory }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, can_update_inventory: user.can_update_inventory } });
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)')
        .run(email, hashedPassword, name, 'sales');
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, can_update_inventory: user.can_update_inventory }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, can_update_inventory: user.can_update_inventory } });
    } catch (err: any) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.get('/api/auth/me', authenticate, (req: any, res) => {
    const user = db.prepare('SELECT id, email, role, name, can_update_inventory FROM users WHERE id = ?').get(req.user.id) as any;
    res.json(user);
  });
  
  // Products
  app.get('/api/products', authenticate, (req, res) => {
    const deleted = req.query.deleted === 'true' ? 1 : 0;
    const products = db.prepare('SELECT * FROM products WHERE deleted = ?').all(deleted);
    res.json(products);
  });

  app.post('/api/products', authenticate, isAdmin, (req: any, res) => {
    const { name_en, name_gu, unit, price, purchase_price, stock_quantity, low_stock_threshold } = req.body;
    const result = db.prepare('INSERT INTO products (name_en, name_gu, unit, price, purchase_price, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name_en, name_gu, unit, price, purchase_price, stock_quantity, low_stock_threshold || 10);
    
    logAction(req.user.id, req.user.name, 'CREATE', 'PRODUCT', result.lastInsertRowid, req.body);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/products/:id', authenticate, (req: any, res) => {
    const { name_en, name_gu, unit, price, purchase_price, stock_quantity, low_stock_threshold } = req.body;
    
    // Ensure numeric values
    const numPrice = parseFloat(price) || 0;
    const numPurchasePrice = parseFloat(purchase_price) || 0;
    const numStock = parseInt(stock_quantity) || 0;
    const numThreshold = parseInt(low_stock_threshold) || 0;

    // If not admin, check if they are trying to change restricted fields
    if (req.user?.role !== 'admin') {
      const current = db.prepare('SELECT price, purchase_price, stock_quantity, low_stock_threshold FROM products WHERE id = ?').get(req.params.id) as any;
      if (!current) return res.status(404).json({ error: 'Product not found' });

      // Check if user has explicit permission to update inventory
      const user = db.prepare('SELECT can_update_inventory FROM users WHERE id = ?').get(req.user.id) as any;
      const canUpdateInventory = user?.can_update_inventory === 1;

      // Restrict price changes to admin only
      if (numPrice !== current.price || numPurchasePrice !== current.purchase_price) {
        return res.status(403).json({ error: 'Only administrators can update unit price or selling price.' });
      }

      // Restrict stock changes to authorized users
      if (!canUpdateInventory && (numStock !== current.stock_quantity || numThreshold !== current.low_stock_threshold)) {
        return res.status(403).json({ error: 'You do not have permission to update stock levels or alert thresholds.' });
      }
    }

    try {
      const original = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
      
      db.prepare('UPDATE products SET name_en = ?, name_gu = ?, unit = ?, price = ?, purchase_price = ?, stock_quantity = ?, low_stock_threshold = ? WHERE id = ?')
        .run(name_en, name_gu, unit, numPrice, numPurchasePrice, numStock, numThreshold, req.params.id);
      
      logAction(req.user.id, req.user.name, 'UPDATE', 'PRODUCT', req.params.id, {
        before: original,
        after: { name_en, name_gu, unit, price: numPrice, purchase_price: numPurchasePrice, stock_quantity: numStock, low_stock_threshold: numThreshold }
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/audit-logs', authenticate, isAdmin, (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all();
    res.json(logs);
  });

  app.delete('/api/products/:id', authenticate, isAdmin, (req: any, res) => {
    const { permanent } = req.query;
    if (permanent === 'true') {
      db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
      logAction(req.user.id, req.user.name, 'PERMANENT_DELETE', 'PRODUCT', req.params.id, {});
    } else {
      db.prepare('UPDATE products SET deleted = 1, deletedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), req.params.id);
      logAction(req.user.id, req.user.name, 'DELETE', 'PRODUCT', req.params.id, {});
    }
    res.json({ success: true });
  });

  app.post('/api/products/:id/restore', authenticate, isAdmin, (req: any, res) => {
    db.prepare('UPDATE products SET deleted = 0, deletedAt = NULL WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, 'RESTORE', 'PRODUCT', req.params.id, {});
    res.json({ success: true });
  });

  // Customers
  app.get('/api/customers', authenticate, (req, res) => {
    const deleted = req.query.deleted === 'true' ? 1 : 0;
    const search = req.query.search as string || '';
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = req.query.sortBy as string || 'name';
    const sortOrder = req.query.sortOrder as string || 'ASC';

    let query = 'FROM customers WHERE deleted = ?';
    const params: any[] = [deleted];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR village LIKE ? OR address LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Get total count and total outstanding for the filtered set
    const statsQuery = `SELECT COUNT(*) as total, SUM(total_outstanding) as total_outstanding ${query}`;
    const stats = db.prepare(statsQuery).get(...params) as any;

    // Sorting logic
    let orderBy = 'name COLLATE NOCASE ASC';
    if (sortBy === 'outstanding') {
      orderBy = `total_outstanding ${sortOrder}`;
    } else if (sortBy === 'name') {
      orderBy = `name COLLATE NOCASE ${sortOrder}`;
    }

    const finalQuery = `SELECT * ${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const customers = db.prepare(finalQuery).all(...params, limit, offset);
    
    res.json({ 
      customers, 
      total: stats.total, 
      totalOutstanding: stats.total_outstanding || 0,
      limit, 
      offset 
    });
  });

  app.post('/api/customers', authenticate, (req: any, res) => {
    const { name, phone, address, village } = req.body;
    const result = db.prepare('INSERT INTO customers (name, phone, address, village) VALUES (?, ?, ?, ?)')
      .run(name, phone, address, village);
    
    logAction(req.user.id, req.user.name, 'CREATE', 'CUSTOMER', result.lastInsertRowid, req.body);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/customers/:id', authenticate, (req: any, res) => {
    const { name, phone, address, village } = req.body;
    db.prepare('UPDATE customers SET name = ?, phone = ?, address = ?, village = ? WHERE id = ?')
      .run(name, phone, address, village, req.params.id);
    
    logAction(req.user.id, req.user.name, 'UPDATE', 'CUSTOMER', req.params.id, req.body);
    res.json({ success: true });
  });

  app.delete('/api/customers/:id', authenticate, isAdmin, (req, res) => {
    const { permanent } = req.query;
    if (permanent === 'true') {
      db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    } else {
      const transaction = db.transaction(() => {
        const deletedAt = new Date().toISOString();
        db.prepare('UPDATE customers SET deleted = 1, deletedAt = ? WHERE id = ?').run(deletedAt, req.params.id);
        db.prepare('UPDATE invoices SET deleted = 1, deletedAt = ? WHERE customer_id = ?').run(deletedAt, req.params.id);
        db.prepare('UPDATE payments SET deleted = 1, deletedAt = ? WHERE customer_id = ?').run(deletedAt, req.params.id);
      });
      transaction();
    }
    res.json({ success: true });
  });

  app.post('/api/customers/:id/restore', authenticate, isAdmin, (req: any, res) => {
    const transaction = db.transaction(() => {
      db.prepare('UPDATE customers SET deleted = 0, deletedAt = NULL WHERE id = ?').run(req.params.id);
      db.prepare('UPDATE invoices SET deleted = 0, deletedAt = NULL WHERE customer_id = ?').run(req.params.id);
      db.prepare('UPDATE payments SET deleted = 0, deletedAt = NULL WHERE customer_id = ?').run(req.params.id);
      logAction(req.user.id, req.user.name, 'RESTORE', 'CUSTOMER', req.params.id, {});
    });
    transaction();
    res.json({ success: true });
  });

  app.get('/api/customers/:id/ledger', authenticate, (req, res) => {
    const invoices = db.prepare('SELECT id, "invoice" as type, date, subtotal as amount, total_amount as balance_after FROM invoices WHERE customer_id = ? AND deleted = 0').all(req.params.id);
    const payments = db.prepare('SELECT id, "payment" as type, date, amount, method, note FROM payments WHERE customer_id = ? AND deleted = 0').all(req.params.id);
    
    const ledger = [...invoices, ...payments].sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    res.json(ledger);
  });

  // Invoices
  app.get('/api/invoices', authenticate, (req, res) => {
    const deleted = req.query.deleted === 'true' ? 1 : 0;
    const invoices = db.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.village as customer_village
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id
      WHERE i.deleted = ?
      ORDER BY i.date DESC
    `).all(deleted) as any[];

    // Include items for each invoice
    const getItems = db.prepare(`
      SELECT ii.*, p.name_en as name, p.name_gu 
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `);

    invoices.forEach(inv => {
      inv.items = getItems.all(inv.id);
    });

    res.json(invoices);
  });

  app.get('/api/invoices/:id/items', authenticate, (req, res) => {
    const items = db.prepare(`
      SELECT ii.*, p.name_en as name, p.name_gu 
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `).all(req.params.id);
    res.json(items);
  });

  app.post('/api/invoices', authenticate, (req: any, res) => {
    const { customer_id, items, paid_amount, date } = req.body;
    
    const customer = db.prepare('SELECT total_outstanding FROM customers WHERE id = ?').get(customer_id) as any;
    const previous_outstanding = customer.total_outstanding;
    
    let subtotal = 0;
    items.forEach((item: any) => {
      subtotal += item.quantity * item.rate;
    });

    const total_amount = subtotal + previous_outstanding;
    const balance_due = total_amount - paid_amount;

    const transaction = db.transaction(() => {
      const invoiceResult = db.prepare(`
        INSERT INTO invoices (customer_id, subtotal, previous_outstanding, total_amount, paid_amount, balance_due, date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(customer_id, subtotal, previous_outstanding, total_amount, paid_amount, balance_due, date || new Date().toISOString());
      
      const invoiceId = invoiceResult.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, purchase_price, amount) VALUES (?, ?, ?, ?, ?, ?)');
      const updateStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');
      
      items.forEach((item: any) => {
        insertItem.run(invoiceId, item.product_id, item.quantity, item.rate, item.purchase_price || 0, item.quantity * item.rate);
        updateStock.run(item.quantity, item.product_id);
      });

      db.prepare('UPDATE customers SET total_outstanding = ? WHERE id = ?').run(balance_due, customer_id);
      
      logAction(req.user.id, req.user.name, 'CREATE', 'INVOICE', invoiceId, { customer_id, total_amount, balance_due });
      
      return invoiceId;
    });

    const invoiceId = transaction();
    res.json({ id: invoiceId });
  });

  app.delete('/api/invoices/:id', authenticate, isAdmin, (req, res) => {
    const { permanent } = req.query;
    if (permanent === 'true') {
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
      db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    } else {
      db.prepare('UPDATE invoices SET deleted = 1, deletedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), req.params.id);
    }
    res.json({ success: true });
  });

  app.post('/api/invoices/:id/restore', authenticate, isAdmin, (req: any, res) => {
    db.prepare('UPDATE invoices SET deleted = 0, deletedAt = NULL WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, 'RESTORE', 'INVOICE', req.params.id, {});
    res.json({ success: true });
  });

  // Payments
  app.get('/api/payments', authenticate, (req, res) => {
    const deleted = req.query.deleted === 'true' ? 1 : 0;
    const payments = db.prepare(`
      SELECT p.*, c.name as customer_name
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.deleted = ?
      ORDER BY p.date DESC
    `).all(deleted);
    res.json(payments);
  });

  app.post('/api/payments', authenticate, (req: any, res) => {
    const { customer_id, amount, method, note, date } = req.body;
    
    const transaction = db.transaction(() => {
      const result = db.prepare('INSERT INTO payments (customer_id, amount, method, note, date) VALUES (?, ?, ?, ?, ?)')
        .run(customer_id, amount, method, note, date || new Date().toISOString());
      
      db.prepare('UPDATE customers SET total_outstanding = total_outstanding - ? WHERE id = ?')
        .run(amount, customer_id);
      
      logAction(req.user.id, req.user.name, 'CREATE', 'PAYMENT', result.lastInsertRowid, req.body);
    });

    transaction();
    res.json({ success: true });
  });

  app.delete('/api/payments/:id', authenticate, isAdmin, (req, res) => {
    const { permanent } = req.query;
    if (permanent === 'true') {
      db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
    } else {
      db.prepare('UPDATE payments SET deleted = 1, deletedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), req.params.id);
    }
    res.json({ success: true });
  });

  app.post('/api/payments/:id/restore', authenticate, isAdmin, (req: any, res) => {
    db.prepare('UPDATE payments SET deleted = 0, deletedAt = NULL WHERE id = ?').run(req.params.id);
    logAction(req.user.id, req.user.name, 'RESTORE', 'PAYMENT', req.params.id, {});
    res.json({ success: true });
  });

  // Users Management
  app.get('/api/users', authenticate, isAdmin, (req, res) => {
    const users = db.prepare('SELECT id, email, name, role FROM users WHERE deleted = 0').all();
    res.json(users);
  });

  app.post('/api/users', authenticate, isAdmin, (req: any, res) => {
    const { email, password, name, role, can_update_inventory } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      const result = db.prepare('INSERT INTO users (email, password, name, role, can_update_inventory) VALUES (?, ?, ?, ?, ?)')
        .run(email, hashedPassword, name, role, can_update_inventory ? 1 : 0);
      
      logAction(req.user.id, req.user.name, 'CREATE', 'USER', result.lastInsertRowid, { email, name, role, can_update_inventory });
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', authenticate, isAdmin, (req: any, res) => {
    const { name, role, password, can_update_inventory } = req.body;
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET name = ?, role = ?, password = ?, can_update_inventory = ? WHERE id = ?')
        .run(name, role, hashedPassword, can_update_inventory ? 1 : 0, req.params.id);
    } else {
      db.prepare('UPDATE users SET name = ?, role = ?, can_update_inventory = ? WHERE id = ?')
        .run(name, role, can_update_inventory ? 1 : 0, req.params.id);
    }
    
    logAction(req.user.id, req.user.name, 'UPDATE', 'USER', req.params.id, { name, role, can_update_inventory });
    res.json({ success: true });
  });

  app.delete('/api/users/:id', authenticate, isAdmin, (req: any, res) => {
    db.prepare('UPDATE users SET deleted = 1, deletedAt = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);
    
    logAction(req.user.id, req.user.name, 'DELETE', 'USER', req.params.id, {});
    res.json({ success: true });
  });
  
  // Backup & Restore
  app.get('/api/backup/export', authenticate, isAdmin, (req, res) => {
    try {
      const tables = ['products', 'customers', 'invoices', 'invoice_items', 'payments', 'users'];
      const backupData: Record<string, any[]> = {};
      
      for (const table of tables) {
        backupData[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
      
      res.json(backupData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/backup/import', authenticate, isAdmin, (req, res) => {
    const data = req.body;
    const tables = ['products', 'customers', 'invoices', 'invoice_items', 'payments', 'users'];
    
    try {
      const transaction = db.transaction(() => {
        // Clear existing data
        // Order matters for foreign keys if they were enforced, but here we just clear all
        // To be safe, we disable foreign keys temporarily if needed, but better-sqlite3 handles it if we are careful
        db.prepare('PRAGMA foreign_keys = OFF').run();
        
        for (const table of tables) {
          db.prepare(`DELETE FROM ${table}`).run();
          if (data[table] && Array.isArray(data[table]) && data[table].length > 0) {
            const columns = Object.keys(data[table][0]);
            const placeholders = columns.map(() => '?').join(',');
            const insert = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);
            
            for (const row of data[table]) {
              const values = columns.map(col => row[col]);
              insert.run(...values);
            }
          }
        }
        
        db.prepare('PRAGMA foreign_keys = ON').run();
      });
      
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
