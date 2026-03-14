import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './db.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  });

  app.post('/api/products', (req, res) => {
    const { name_en, name_gu, unit, price, stock_quantity } = req.body;
    const result = db.prepare('INSERT INTO products (name_en, name_gu, unit, price, stock_quantity) VALUES (?, ?, ?, ?, ?)')
      .run(name_en, name_gu, unit, price, stock_quantity);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/products/:id', (req, res) => {
    const { name_en, name_gu, unit, price, stock_quantity } = req.body;
    db.prepare('UPDATE products SET name_en = ?, name_gu = ?, unit = ?, price = ?, stock_quantity = ? WHERE id = ?')
      .run(name_en, name_gu, unit, price, stock_quantity, req.params.id);
    res.json({ success: true });
  });

  // Customers
  app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers').all();
    res.json(customers);
  });

  app.post('/api/customers', (req, res) => {
    const { name, phone, address } = req.body;
    const result = db.prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)')
      .run(name, phone, address);
    res.json({ id: result.lastInsertRowid });
  });

  // Invoices
  app.get('/api/invoices', (req, res) => {
    const invoices = db.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id
      ORDER BY i.date DESC
    `).all();
    res.json(invoices);
  });

  app.get('/api/invoices/:id/items', (req, res) => {
    const items = db.prepare(`
      SELECT ii.*, p.name_en as name, p.name_gu 
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `).all(req.params.id);
    res.json(items);
  });

  app.post('/api/invoices', (req, res) => {
    const { customer_id, items, paid_amount } = req.body;
    
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
        INSERT INTO invoices (customer_id, subtotal, previous_outstanding, total_amount, paid_amount, balance_due)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(customer_id, subtotal, previous_outstanding, total_amount, paid_amount, balance_due);
      
      const invoiceId = invoiceResult.lastInsertRowid;

      const insertItem = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)');
      const updateStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');
      
      items.forEach((item: any) => {
        insertItem.run(invoiceId, item.product_id, item.quantity, item.rate, item.quantity * item.rate);
        updateStock.run(item.quantity, item.product_id);
      });

      db.prepare('UPDATE customers SET total_outstanding = ? WHERE id = ?').run(balance_due, customer_id);
      
      return invoiceId;
    });

    const invoiceId = transaction();
    res.json({ id: invoiceId });
  });

  // Payments
  app.post('/api/payments', (req, res) => {
    const { customer_id, amount, method, note } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO payments (customer_id, amount, method, note) VALUES (?, ?, ?, ?)')
        .run(customer_id, amount, method, note);
      
      db.prepare('UPDATE customers SET total_outstanding = total_outstanding - ? WHERE id = ?')
        .run(amount, customer_id);
    });

    transaction();
    res.json({ success: true });
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
