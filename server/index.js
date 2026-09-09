import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'cafe-senja-secret-key-2026';
const PORT = process.env.PORT || 3001;

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

// Initialize DB
const db = initDatabase();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket clients broadcast helper
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connected to Cafe Server' }));
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {}
  });
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(uploadDir));

// Auth Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak: Token otentikasi tidak ditemukan.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki wewenang untuk modul ini.' });
    }
    next();
  };
}

// -------------------------------------------------------------
// 1. AUTH ROUTES
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name }
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, role, name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json({ user });
});

// -------------------------------------------------------------
// 2. BRANDING SETTINGS
// -------------------------------------------------------------
app.get('/api/branding', (req, res) => {
  const settings = db.prepare('SELECT * FROM branding_settings ORDER BY id DESC LIMIT 1').get();
  res.json(settings);
});

app.put('/api/branding', authenticate, authorize('admin'), (req, res) => {
  const {
    cafe_name, cafe_tagline, cafe_address, cafe_phone,
    primary_color, accent_color, background_color, paper_width, footer_message, logo_url
  } = req.body;

  db.prepare(`
    UPDATE branding_settings SET
      cafe_name = COALESCE(?, cafe_name),
      cafe_tagline = COALESCE(?, cafe_tagline),
      cafe_address = COALESCE(?, cafe_address),
      cafe_phone = COALESCE(?, cafe_phone),
      primary_color = COALESCE(?, primary_color),
      accent_color = COALESCE(?, accent_color),
      background_color = COALESCE(?, background_color),
      paper_width = COALESCE(?, paper_width),
      footer_message = COALESCE(?, footer_message),
      logo_url = COALESCE(?, logo_url),
      updated_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = (SELECT id FROM branding_settings ORDER BY id DESC LIMIT 1)
  `).run(
    cafe_name, cafe_tagline, cafe_address, cafe_phone,
    primary_color, accent_color, background_color, paper_width, footer_message, logo_url,
    req.user.id
  );

  const updated = db.prepare('SELECT * FROM branding_settings ORDER BY id DESC LIMIT 1').get();
  broadcast('BRANDING_UPDATED', updated);
  res.json(updated);
});

app.post('/api/branding/logo', authenticate, authorize('admin'), upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File gambar logo tidak ditemukan.' });
  }
  const logoUrl = `/uploads/${req.file.filename}`;
  db.prepare(`
    UPDATE branding_settings SET logo_url = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = (SELECT id FROM branding_settings ORDER BY id DESC LIMIT 1)
  `).run(logoUrl, req.user.id);

  const updated = db.prepare('SELECT * FROM branding_settings ORDER BY id DESC LIMIT 1').get();
  broadcast('BRANDING_UPDATED', updated);
  res.json({ logo_url: logoUrl, settings: updated });
});

app.post('/api/branding/reset', authenticate, authorize('admin'), (req, res) => {
  db.prepare(`
    UPDATE branding_settings SET
      cafe_name = 'Kopi Senja Nusantara',
      cafe_tagline = 'Artisan Coffee & Comfort Food Indonesia',
      cafe_address = 'Jl. Malioboro No. 45, Danurejan, Yogyakarta',
      cafe_phone = '0812-3456-7890',
      logo_url = '',
      primary_color = '#78350F',
      accent_color = '#D97706',
      background_color = '#FFFBEB',
      paper_width = '58mm',
      footer_message = 'Terima kasih atas kunjungan Anda di Kopi Senja Nusantara! Simpan struk ini untuk promo berikutnya.',
      updated_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = (SELECT id FROM branding_settings ORDER BY id DESC LIMIT 1)
  `).run(req.user.id);

  const updated = db.prepare('SELECT * FROM branding_settings ORDER BY id DESC LIMIT 1').get();
  broadcast('BRANDING_UPDATED', updated);
  res.json(updated);
});

// -------------------------------------------------------------
// 3. TABLES & QR CODES
// -------------------------------------------------------------
app.get('/api/tables', async (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const tables = db.prepare('SELECT * FROM tables ORDER BY table_number ASC').all();

  // Generate QR Code data URLs for each table
  const enrichedTables = await Promise.all(tables.map(async (tbl) => {
    const orderUrl = `${protocol}://${host}/order?table=${tbl.table_number}&token=${tbl.qr_code_token}`;
    const qrDataUrl = await QRCode.toDataURL(orderUrl, { width: 300, margin: 2 });
    return {
      ...tbl,
      order_url: orderUrl,
      qr_code_data_url: qrDataUrl
    };
  }));

  res.json(enrichedTables);
});

app.post('/api/tables', authenticate, authorize('admin'), (req, res) => {
  const { table_number, label } = req.body;
  if (!table_number) return res.status(400).json({ error: 'Nomor meja wajib diisi.' });

  const token = `TBL-0${table_number}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  try {
    const result = db.prepare(`
      INSERT INTO tables (table_number, label, qr_code_token)
      VALUES (?, ?, ?)
    `).run(Number(table_number), label || `Meja ${table_number}`, token);

    res.status(201).json({ id: result.lastInsertRowid, table_number, label, qr_code_token: token });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: `Meja dengan nomor ${table_number} sudah ada.` });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tables/:id', authenticate, authorize('admin'), (req, res) => {
  const { table_number, label, is_active } = req.body;
  try {
    db.prepare(`
      UPDATE tables SET
        table_number = COALESCE(?, table_number),
        label = COALESCE(?, label),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(table_number, label, is_active, req.params.id);
    res.json({ success: true, message: 'Data meja berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tables/:id/regenerate-qr', authenticate, authorize('admin'), (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: 'Meja tidak ditemukan.' });

  const newToken = `TBL-0${table.table_number}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  db.prepare('UPDATE tables SET qr_code_token = ? WHERE id = ?').run(newToken, req.params.id);
  res.json({ qr_code_token: newToken, message: 'QR Code meja berhasil diperbarui.' });
});

app.delete('/api/tables/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Meja berhasil dihapus.' });
});

// -------------------------------------------------------------
// 4. CATEGORIES & MENU
// -------------------------------------------------------------
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC, name ASC').all();
  res.json(categories);
});

app.post('/api/categories', authenticate, authorize('admin'), (req, res) => {
  const { name, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  try {
    const result = db.prepare(`
      INSERT INTO categories (name, slug, display_order)
      VALUES (?, ?, ?)
    `).run(name, slug, display_order || 0);
    res.status(201).json({ id: result.lastInsertRowid, name, slug, display_order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, display_order, is_active } = req.body;
  const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined;
  db.prepare(`
    UPDATE categories SET
      name = COALESCE(?, name),
      slug = COALESCE(?, slug),
      display_order = COALESCE(?, display_order),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name, slug, display_order, is_active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/categories/:id', authenticate, authorize('admin'), (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?').get(req.params.id).count;
  if (count > 0) {
    return res.status(400).json({ error: 'Kategori masih memiliki item menu. Hapus atau pindahkan item terlebih dahulu.' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/menu', (req, res) => {
  const { category_id, only_available } = req.query;
  let query = `
    SELECT m.*, c.name as category_name, c.slug as category_slug
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (category_id) {
    query += ' AND m.category_id = ?';
    params.push(category_id);
  }
  if (only_available === 'true') {
    query += ' AND m.is_available = 1';
  }
  query += ' ORDER BY c.display_order ASC, m.name ASC';
  const items = db.prepare(query).all(...params);
  res.json(items);
});

app.post('/api/menu', authenticate, authorize('admin'), upload.single('image'), (req, res) => {
  const { category_id, name, description, price, is_available } = req.body;
  if (!category_id || !name || !price) {
    return res.status(400).json({ error: 'Kategori, nama item, dan harga wajib diisi.' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60');

  const result = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, price, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(Number(category_id), name, description || '', Number(price), imageUrl, is_available !== undefined ? Number(is_available) : 1);

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

app.put('/api/menu/:id', authenticate, authorize('admin'), upload.single('image'), (req, res) => {
  const { category_id, name, description, price, is_available } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

  db.prepare(`
    UPDATE menu_items SET
      category_id = COALESCE(?, category_id),
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      image_url = COALESCE(?, image_url),
      is_available = COALESCE(?, is_available)
    WHERE id = ?
  `).run(
    category_id ? Number(category_id) : null,
    name,
    description,
    price ? Number(price) : null,
    imageUrl,
    is_available !== undefined ? Number(is_available) : null,
    req.params.id
  );

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  res.json(item);
});

app.patch('/api/menu/:id/toggle-available', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const item = db.prepare('SELECT is_available FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Menu tidak ditemukan.' });

  const newStatus = item.is_available ? 0 : 1;
  db.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ id: req.params.id, is_available: newStatus });
});

app.delete('/api/menu/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Item menu berhasil dihapus.' });
});

// -------------------------------------------------------------
// 5. DISCOUNT CATEGORIES & MANAGEMENT
// -------------------------------------------------------------
app.get('/api/discounts/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM discount_categories WHERE is_active = 1 ORDER BY id ASC').all();
  res.json(cats);
});

app.post('/api/discounts/categories', authenticate, authorize('admin'), (req, res) => {
  const { name, discount_type, discount_value } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama kategori diskon wajib diisi.' });
  try {
    const dType = discount_type === 'nominal' ? 'nominal' : 'percent';
    const dVal = Math.max(0, Number(discount_value) || 0);
    const result = db.prepare(
      'INSERT INTO discount_categories (name, discount_type, discount_value, is_active) VALUES (?, ?, ?, 1)'
    ).run(name, dType, dVal);
    const created = db.prepare('SELECT * FROM discount_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/discounts/categories/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, discount_type, discount_value, is_active } = req.body;
  const dType = discount_type ? (discount_type === 'nominal' ? 'nominal' : 'percent') : null;
  const dVal = discount_value !== undefined ? Math.max(0, Number(discount_value) || 0) : null;

  db.prepare(`
    UPDATE discount_categories SET
      name = COALESCE(?, name),
      discount_type = COALESCE(?, discount_type),
      discount_value = COALESCE(?, discount_value),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name, dType, dVal, is_active, req.params.id);

  const updated = db.prepare('SELECT * FROM discount_categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/api/discounts/categories/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM discount_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/discounts/history', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { category_id, date } = req.query;
  let query = `
    SELECT
      d.*,
      o.order_number, o.total_amount, o.subtotal, o.payment_status,
      t.table_number, t.label as table_label,
      u.name as applied_by_name
    FROM discounts d
    JOIN orders o ON d.order_id = o.id
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON d.applied_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category_id && category_id !== 'all') {
    query += ' AND d.category_id = ?';
    params.push(category_id);
  }

  if (date) {
    query += ' AND date(d.created_at) = date(?)';
    params.push(date);
  }

  query += ' ORDER BY d.id DESC LIMIT 100';

  const history = db.prepare(query).all(...params);

  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(calculated_amount), 0) as total_discount_amount,
      COUNT(id) as total_discount_count
    FROM discounts
  `).get();

  const byCategory = db.prepare(`
    SELECT category_name, COUNT(*) as count, SUM(calculated_amount) as total_amount
    FROM discounts
    GROUP BY category_name
    ORDER BY total_amount DESC
  `).all();

  res.json({ history, stats, byCategory });
});

// -------------------------------------------------------------
// 6. CASHIER SHIFTS & TUTUP BUKU
// -------------------------------------------------------------
app.get('/api/shifts/current', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const activeShift = db.prepare(`
    SELECT s.*, u.name as cashier_name
    FROM cashier_shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.status = 'open'
    ORDER BY s.id DESC LIMIT 1
  `).get();

  if (!activeShift) {
    return res.json({ active_shift: null });
  }

  // Calculate live numbers for current active shift
  const salesStats = db.prepare(`
    SELECT
      COALESCE(SUM(p.amount_due), 0) as total_sales,
      COALESCE(SUM(p.amount_received), 0) as total_cash_received,
      COALESCE(SUM(p.change_given), 0) as total_change_given,
      COUNT(DISTINCT o.id) as total_orders
    FROM orders o
    JOIN payments p ON o.id = p.order_id
    WHERE o.shift_id = ? AND o.payment_status = 'dibayar'
  `).get(activeShift.id);

  const voidStats = db.prepare(`
    SELECT COUNT(*) as void_count, COALESCE(SUM(o.total_amount), 0) as void_total
    FROM orders o
    WHERE o.shift_id = ? AND o.payment_status = 'voided'
  `).get(activeShift.id);

  const refundStats = db.prepare(`
    SELECT COUNT(*) as refund_count, COALESCE(SUM(r.amount), 0) as refund_total
    FROM refunds r
    JOIN orders o ON r.order_id = o.id
    WHERE o.shift_id = ?
  `).get(activeShift.id);

  const discountStats = db.prepare(`
    SELECT COALESCE(SUM(calculated_amount), 0) as total_discount
    FROM discounts d
    JOIN orders o ON d.order_id = o.id
    WHERE o.shift_id = ?
  `).get(activeShift.id);

  // Expected cash in drawer = starting_cash + total_sales - refund_total
  const expectedCash = activeShift.starting_cash + salesStats.total_sales - refundStats.refund_total;

  res.json({
    active_shift: activeShift,
    stats: {
      starting_cash: activeShift.starting_cash,
      total_sales: salesStats.total_sales,
      total_orders: salesStats.total_orders,
      refund_total: refundStats.refund_total,
      void_total: voidStats.void_total,
      total_discount: discountStats.total_discount,
      expected_cash: expectedCash
    }
  });
});

app.post('/api/shifts/open', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { starting_cash, notes } = req.body;
  if (starting_cash === undefined || starting_cash === null) {
    return res.status(400).json({ error: 'Modal awal kasir wajib diisi.' });
  }

  // Check if open shift already exists
  const existing = db.prepare("SELECT id FROM cashier_shifts WHERE status = 'open'").get();
  if (existing) {
    return res.status(400).json({ error: 'Masih ada shift kasir yang sedang aktif. Silakan tutup shift sebelumnya terlebih dahulu.' });
  }

  const result = db.prepare(`
    INSERT INTO cashier_shifts (cashier_id, starting_cash, notes, status, opened_at)
    VALUES (?, ?, ?, 'open', CURRENT_TIMESTAMP)
  `).run(req.user.id, Number(starting_cash), notes || '');

  const shift = db.prepare('SELECT * FROM cashier_shifts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(shift);
});

app.post('/api/shifts/close', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { ending_cash_actual, notes } = req.body;
  if (ending_cash_actual === undefined || ending_cash_actual === null) {
    return res.status(400).json({ error: 'Jumlah kas fisik wajib diisi untuk tutup buku.' });
  }

  const activeShift = db.prepare("SELECT * FROM cashier_shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();
  if (!activeShift) {
    return res.status(400).json({ error: 'Tidak ada shift aktif yang bisa ditutup.' });
  }

  // Calculate stats
  const salesStats = db.prepare(`
    SELECT COALESCE(SUM(p.amount_due), 0) as total_sales
    FROM orders o
    JOIN payments p ON o.id = p.order_id
    WHERE o.shift_id = ? AND o.payment_status = 'dibayar'
  `).get(activeShift.id);

  const refundStats = db.prepare(`
    SELECT COALESCE(SUM(r.amount), 0) as refund_total
    FROM refunds r
    JOIN orders o ON r.order_id = o.id
    WHERE o.shift_id = ?
  `).get(activeShift.id);

  const expectedCash = activeShift.starting_cash + salesStats.total_sales - refundStats.refund_total;
  const difference = Number(ending_cash_actual) - expectedCash;

  db.prepare(`
    UPDATE cashier_shifts SET
      ending_cash_actual = ?,
      expected_cash = ?,
      cash_difference = ?,
      notes = COALESCE(?, notes),
      closed_at = CURRENT_TIMESTAMP,
      status = 'closed'
    WHERE id = ?
  `).run(Number(ending_cash_actual), expectedCash, difference, notes, activeShift.id);

  const closedShift = db.prepare('SELECT * FROM cashier_shifts WHERE id = ?').get(activeShift.id);
  res.json({
    success: true,
    message: 'Shift kasir berhasil ditutup (End of Day / Tutup Buku selesai).',
    shift: closedShift,
    expected_cash: expectedCash,
    difference
  });
});

app.get('/api/shifts/history', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const history = db.prepare(`
    SELECT s.*, u.name as cashier_name
    FROM cashier_shifts s
    JOIN users u ON s.cashier_id = u.id
    ORDER BY s.id DESC LIMIT 50
  `).all();
  res.json(history);
});

app.get('/api/shifts/:id/z-report', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const shift = db.prepare(`
    SELECT s.*, u.name as cashier_name
    FROM cashier_shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!shift) return res.status(404).json({ error: 'Shift tidak ditemukan.' });

  const branding = db.prepare('SELECT * FROM branding_settings ORDER BY id DESC LIMIT 1').get();

  const orders = db.prepare(`
    SELECT o.*, t.table_number
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    WHERE o.shift_id = ?
    ORDER BY o.id ASC
  `).all(shift.id);

  const salesStats = db.prepare(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(discount_amount), 0) as total_discount,
      COUNT(id) as total_orders
    FROM orders
    WHERE shift_id = ? AND payment_status = 'dibayar'
  `).get(shift.id);

  const discountBreakdown = db.prepare(`
    SELECT category_name, COUNT(*) as count, SUM(calculated_amount) as total_amount
    FROM discounts d
    JOIN orders o ON d.order_id = o.id
    WHERE o.shift_id = ?
    GROUP BY category_name
  `).all(shift.id);

  const refundStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(r.amount), 0) as total_amount
    FROM refunds r
    JOIN orders o ON r.order_id = o.id
    WHERE o.shift_id = ?
  `).get(shift.id);

  const voidStats = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount
    FROM orders
    WHERE shift_id = ? AND payment_status = 'voided'
  `).get(shift.id);

  res.json({
    branding,
    shift,
    orders,
    summary: {
      starting_cash: shift.starting_cash,
      total_revenue: salesStats.total_revenue,
      total_orders: salesStats.total_orders,
      total_discount: salesStats.total_discount,
      total_refund: refundStats.total_amount,
      total_void: voidStats.total_amount,
      expected_cash: shift.expected_cash || (shift.starting_cash + salesStats.total_revenue - refundStats.total_amount),
      ending_cash_actual: shift.ending_cash_actual,
      cash_difference: shift.cash_difference
    },
    discount_breakdown: discountBreakdown
  });
});

// -------------------------------------------------------------
// 7. ORDERS & CHECKOUT (CUSTOMER & CASHIER)
// -------------------------------------------------------------

// Customer creates order or Cashier manual order
app.post('/api/orders', (req, res) => {
  const { table_number, table_id, customer_name, customer_notes, items, manual_discount } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Keranjang pesanan masih kosong.' });
  }

  // Find table
  let table;
  if (table_id) {
    table = db.prepare('SELECT * FROM tables WHERE id = ?').get(table_id);
  } else if (table_number) {
    table = db.prepare('SELECT * FROM tables WHERE table_number = ?').get(table_number);
  }
  if (!table) {
    return res.status(400).json({ error: 'Meja cafe tidak valid.' });
  }

  // Find current open shift if available
  const activeShift = db.prepare("SELECT id FROM cashier_shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();

  // Calculate items and subtotal
  let subtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.menu_item_id);
    if (!menuItem) {
      return res.status(400).json({ error: `Item menu dengan ID ${item.menu_item_id} tidak ditemukan.` });
    }
    const qty = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = menuItem.price * qty;
    subtotal += lineTotal;
    verifiedItems.push({
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      item_price: menuItem.price,
      quantity: qty,
      notes: item.notes || ''
    });
  }

  // Check manual discount if submitted by cashier
  let discountAmount = 0;
  if (manual_discount && manual_discount.value > 0) {
    if (manual_discount.type === 'percent') {
      discountAmount = Math.round((subtotal * Math.min(100, Number(manual_discount.value))) / 100);
    } else {
      discountAmount = Math.min(subtotal, Number(manual_discount.value));
    }
  }

  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Generate order number: ORD-YYYYMMDD-XXXX
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dailyCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_number LIKE ?").get(`ORD-${todayStr}-%`).count + 1;
  const orderNumber = `ORD-${todayStr}-${String(dailyCount).padStart(3, '0')}`;

  // Optional created_by (if token provided)
  let createdByUserId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      createdByUserId = decoded.id;
    } catch (e) {}
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, table_id, customer_name, customer_notes,
      status, payment_status, subtotal, discount_amount, tax_amount, total_amount,
      created_by_user_id, shift_id
    ) VALUES (?, ?, ?, ?, 'menunggu_konfirmasi', 'menunggu', ?, ?, 0, ?, ?, ?)
  `);

  const orderResult = insertOrder.run(
    orderNumber,
    table.id,
    customer_name || 'Pelanggan',
    customer_notes || '',
    subtotal,
    discountAmount,
    totalAmount,
    createdByUserId,
    activeShift ? activeShift.id : null
  );

  const orderId = orderResult.lastInsertRowid;

  // Insert items
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, notes, item_status)
    VALUES (?, ?, ?, ?, ?, ?, 'menunggu')
  `);

  for (const it of verifiedItems) {
    insertOrderItem.run(orderId, it.menu_item_id, it.item_name, it.item_price, it.quantity, it.notes);
  }

  // Insert discount record if applied
  if (discountAmount > 0 && manual_discount) {
    db.prepare(`
      INSERT INTO discounts (order_id, category_id, category_name, type, value, calculated_amount, applied_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      manual_discount.category_id || null,
      manual_discount.category_name || 'Diskon Manual',
      manual_discount.type,
      manual_discount.value,
      discountAmount,
      createdByUserId || 1,
      manual_discount.notes || ''
    );
  }

  const createdOrder = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    WHERE o.id = ?
  `).get(orderId);

  createdOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  // Broadcast NEW_ORDER to cashier!
  broadcast('NEW_ORDER', createdOrder);

  res.status(201).json(createdOrder);
});

// List orders (with role-based views)
app.get('/api/orders', (req, res) => {
  const { status, payment_status, table_id, for_kds, date } = req.query;

  let query = `
    SELECT o.*, t.table_number, t.label as table_label, u.name as cashier_name
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by_user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // CRITICAL KDS RULE: Kitchen Display System ONLY sees paid orders!
  if (for_kds === 'true') {
    query += " AND o.payment_status = 'dibayar' AND o.status IN ('diproses', 'siap') ";
  } else {
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (payment_status) {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
  }

  if (table_id) {
    query += ' AND o.table_id = ?';
    params.push(table_id);
  }

  if (date) {
    query += " AND date(o.created_at) = date(?)";
    params.push(date);
  }

  query += ' ORDER BY o.id DESC LIMIT 100';

  const orders = db.prepare(query).all(...params);

  // Attach items to each order
  const getItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? AND item_status != 'voided'");
  for (const ord of orders) {
    ord.items = getItems.all(ord.id);
  }

  res.json(orders);
});

// Single Order Detail
app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label, u.name as cashier_name
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by_user_id = u.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id);
  order.discounts = db.prepare('SELECT * FROM discounts WHERE order_id = ?').all(order.id);
  order.voids = db.prepare('SELECT * FROM voids WHERE order_id = ?').all(order.id);
  order.refunds = db.prepare('SELECT * FROM refunds WHERE order_id = ?').all(order.id);

  res.json(order);
});

// Public Customer Order Tracking
app.get('/api/orders/track/:order_number', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    WHERE o.order_number = ?
  `).get(req.params.order_number);

  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

// Edit Order Items (Kasir & Admin - Mengubah/Menambah/Menghapus item menu sebelum dibayar)
app.put('/api/orders/:id', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const orderId = req.params.id;
  const { items, customer_notes, customer_name, table_id } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }

  // Hanya pesanan yang belum dibayar / masih menunggu konfirmasi yang boleh diedit langsung
  if (order.payment_status === 'dibayar' || order.status === 'dibatalkan') {
    return res.status(400).json({
      error: 'Pesanan yang sudah dibayar atau dibatalkan tidak dapat diedit langsung.'
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Pesanan harus memiliki minimal 1 item menu. Jika ingin membatalkan semua pesanan, gunakan fitur Void.' });
  }

  // Verifikasi setiap item menu & hitung subtotal baru
  let newSubtotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.menu_item_id);
    if (!menuItem) {
      return res.status(400).json({ error: `Menu dengan ID ${item.menu_item_id} tidak ditemukan.` });
    }
    const qty = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = menuItem.price * qty;
    newSubtotal += lineTotal;
    verifiedItems.push({
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      item_price: menuItem.price,
      quantity: qty,
      notes: item.notes || ''
    });
  }

  // Hitung ulang diskon jika sebelumnya order memiliki diskon
  let newDiscountAmount = 0;
  const existingDiscount = db.prepare('SELECT * FROM discounts WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(orderId);

  if (existingDiscount) {
    if (existingDiscount.type === 'percent') {
      newDiscountAmount = Math.round((newSubtotal * Math.min(100, Number(existingDiscount.value))) / 100);
    } else {
      newDiscountAmount = Math.min(newSubtotal, Number(existingDiscount.value));
    }
    db.prepare('UPDATE discounts SET calculated_amount = ? WHERE id = ?').run(newDiscountAmount, existingDiscount.id);
  } else if (order.discount_amount > 0) {
    newDiscountAmount = Math.min(newSubtotal, order.discount_amount);
  }

  const newTotalAmount = Math.max(0, newSubtotal - newDiscountAmount);

  // Update tabel orders
  db.prepare(`
    UPDATE orders SET
      subtotal = ?,
      discount_amount = ?,
      total_amount = ?,
      customer_notes = COALESCE(?, customer_notes),
      customer_name = COALESCE(?, customer_name),
      table_id = COALESCE(?, table_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newSubtotal,
    newDiscountAmount,
    newTotalAmount,
    customer_notes !== undefined ? customer_notes : null,
    customer_name !== undefined ? customer_name : null,
    table_id !== undefined ? table_id : null,
    orderId
  );

  // Hapus item lama dan masukkan daftar item baru
  db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, notes, item_status)
    VALUES (?, ?, ?, ?, ?, ?, 'menunggu')
  `);

  for (const it of verifiedItems) {
    insertOrderItem.run(orderId, it.menu_item_id, it.item_name, it.item_price, it.quantity, it.notes);
  }

  // Ambil data order terbaru
  const updatedOrder = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label, u.name as cashier_name
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by_user_id = u.id
    WHERE o.id = ?
  `).get(orderId);
  updatedOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  // Broadcast ke semua client WebSocket (Kasir, Pelanggan / OrderTracker, Admin)
  broadcast('ORDER_UPDATED', updatedOrder);

  res.json(updatedOrder);
});

// Update Order Status (Dapur/Kasir)
app.patch('/api/orders/:id/status', authenticate, authorize('admin', 'kasir', 'dapur'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['menunggu_konfirmasi', 'dibayar', 'diproses', 'siap', 'selesai', 'dibatalkan'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status order tidak valid.' });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  const updatedOrder = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    WHERE o.id = ?
  `).get(req.params.id);
  updatedOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);

  broadcast('ORDER_STATUS_CHANGED', updatedOrder);
  res.json(updatedOrder);
});

// -------------------------------------------------------------
// 8. PAYMENT CONFIRMATION (CASH ONLY)
// -------------------------------------------------------------
app.post('/api/orders/:id/pay-cash', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { amount_received } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
  if (order.payment_status === 'dibayar') {
    return res.status(400).json({ error: 'Order ini sudah dibayar sebelumnya.' });
  }

  const totalDue = order.total_amount;
  const received = Number(amount_received) || totalDue;

  if (received < totalDue) {
    return res.status(400).json({ error: `Uang yang diterima (Rp ${received.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalDue.toLocaleString('id-ID')}).` });
  }

  const change = received - totalDue;

  // Find active shift
  const activeShift = db.prepare("SELECT id FROM cashier_shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();

  // Insert payment record (generic schema: payment_method = 'cash')
  db.prepare(`
    INSERT INTO payments (order_id, payment_method, amount_due, amount_received, change_given, confirmed_by)
    VALUES (?, 'cash', ?, ?, ?, ?)
  `).run(order.id, totalDue, received, change, req.user.id);

  // Update order status: payment_status = 'dibayar', and forward to kitchen ('diproses')
  db.prepare(`
    UPDATE orders SET
      payment_status = 'dibayar',
      status = 'diproses',
      shift_id = COALESCE(shift_id, ?),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(activeShift ? activeShift.id : null, order.id);

  // Update all items in this order to 'diproses'
  db.prepare("UPDATE order_items SET item_status = 'diproses' WHERE order_id = ? AND item_status != 'voided'").run(order.id);

  const fullOrder = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label, u.name as cashier_name
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON u.id = ?
    WHERE o.id = ?
  `).get(req.user.id, order.id);

  fullOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  fullOrder.payment = {
    payment_method: 'cash',
    amount_due: totalDue,
    amount_received: received,
    change_given: change,
    confirmed_by_name: req.user.name
  };

  // BROADCAST TO KDS! Order is now paid, KDS will play audio chime and show order card!
  broadcast('PAYMENT_CONFIRMED', fullOrder);

  res.json({
    success: true,
    message: 'Pembayaran tunai berhasil dikonfirmasi. Order diteruskan ke Dapur.',
    order: fullOrder,
    change_given: change
  });
});

// -------------------------------------------------------------
// 9. MANUAL DISCOUNT APPLICATION
// -------------------------------------------------------------
app.post('/api/orders/:id/apply-discount', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { category_id, category_name, type, value, notes } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
  if (order.payment_status === 'dibayar') {
    return res.status(400).json({ error: 'Diskon tidak dapat diterapkan setelah order dibayar.' });
  }

  // Auto-fill dari tabel discount_categories jika tidak di-pass manual
  let resolvedType = type;
  let resolvedValue = Number(value);
  let resolvedCatName = category_name;

  if (category_id) {
    const cat = db.prepare('SELECT * FROM discount_categories WHERE id = ?').get(category_id);
    if (cat) {
      if (!resolvedCatName) resolvedCatName = cat.name;
      if (!resolvedType) resolvedType = cat.discount_type || 'percent';
      if (isNaN(resolvedValue) || resolvedValue === undefined) resolvedValue = Number(cat.discount_value) || 0;
    }
  }

  const subtotal = order.subtotal;
  let calculatedAmount = 0;
  const numValue = Number(resolvedValue) || 0;

  if (resolvedType === 'nominal') {
    calculatedAmount = Math.min(subtotal, Math.max(0, numValue));
  } else {
    calculatedAmount = Math.round((subtotal * Math.min(100, Math.max(0, numValue))) / 100);
  }

  const newTotal = Math.max(0, subtotal - calculatedAmount);

  // Update order
  db.prepare(`
    UPDATE orders SET
      discount_amount = ?,
      total_amount = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(calculatedAmount, newTotal, order.id);

  // Delete previous discounts on this order
  db.prepare('DELETE FROM discounts WHERE order_id = ?').run(order.id);

  // Insert audit record
  db.prepare(`
    INSERT INTO discounts (order_id, category_id, category_name, type, value, calculated_amount, applied_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    category_id || null,
    resolvedCatName || 'Diskon Otomatis',
    resolvedType || 'percent',
    numValue,
    calculatedAmount,
    req.user.id,
    notes || ''
  );

  const updatedOrder = db.prepare(`
    SELECT o.*, t.table_number, t.label as table_label
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    WHERE o.id = ?
  `).get(order.id);
  updatedOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  updatedOrder.discounts = db.prepare('SELECT * FROM discounts WHERE order_id = ?').all(order.id);

  broadcast('ORDER_UPDATED', updatedOrder);

  res.json({
    success: true,
    message: 'Diskon berhasil diterapkan.',
    order: updatedOrder,
    discount_amount: calculatedAmount
  });
});

// -------------------------------------------------------------
// 10. VOID ORDER & REFUND
// -------------------------------------------------------------
app.post('/api/orders/:id/void', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { reason, order_item_id } = req.body;
  if (!reason) return res.status(400).json({ error: 'Alasan void wajib diisi.' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

  if (order_item_id) {
    // Void single item
    const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(order_item_id, order.id);
    if (!item) return res.status(404).json({ error: 'Item order tidak ditemukan.' });

    db.prepare("UPDATE order_items SET item_status = 'voided', void_reason = ? WHERE id = ?").run(reason, order_item_id);

    // Recalculate subtotal & total
    const remainingItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? AND item_status != 'voided'").all(order.id);
    const newSubtotal = remainingItems.reduce((acc, curr) => acc + (curr.item_price * curr.quantity), 0);
    const newTotal = Math.max(0, newSubtotal - order.discount_amount);

    db.prepare('UPDATE orders SET subtotal = ?, total_amount = ? WHERE id = ?').run(newSubtotal, newTotal, order.id);

    // Log void
    db.prepare(`
      INSERT INTO voids (order_id, order_item_id, reason, voided_by)
      VALUES (?, ?, ?, ?)
    `).run(order.id, order_item_id, reason, req.user.id);

    broadcast('ORDER_VOIDED', { order_id: order.id, order_item_id, reason, item_name: item.item_name });
    return res.json({ success: true, message: `Item "${item.item_name}" berhasil di-void.` });
  } else {
    // Void whole order
    db.prepare(`
      UPDATE orders SET
        status = 'dibatalkan',
        payment_status = 'voided',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(order.id);

    db.prepare("UPDATE order_items SET item_status = 'voided', void_reason = ? WHERE order_id = ?").run(reason, order.id);

    db.prepare(`
      INSERT INTO voids (order_id, order_item_id, reason, voided_by)
      VALUES (?, NULL, ?, ?)
    `).run(order.id, reason, req.user.id);

    broadcast('ORDER_VOIDED', { order_id: order.id, reason, order_number: order.order_number });
    return res.json({ success: true, message: `Order #${order.order_number} berhasil di-void.` });
  }
});

app.post('/api/orders/:id/refund', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { amount, reason } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Nominal refund wajib valid.' });
  if (!reason) return res.status(400).json({ error: 'Alasan refund wajib diisi.' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
  if (order.payment_status !== 'dibayar') {
    return res.status(400).json({ error: 'Hanya order yang sudah dibayar yang bisa direfund.' });
  }

  db.prepare(`
    INSERT INTO refunds (order_id, amount, reason, processed_by)
    VALUES (?, ?, ?, ?)
  `).run(order.id, Number(amount), reason, req.user.id);

  db.prepare("UPDATE orders SET payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);

  broadcast('ORDER_REFUNDED', { order_id: order.id, amount: Number(amount), reason, order_number: order.order_number });

  res.json({ success: true, message: `Refund cash sebesar Rp ${Number(amount).toLocaleString('id-ID')} berhasil dicatat.` });
});

// -------------------------------------------------------------
// 11. SALES REPORTS & DAILY TRANSACTION LOG
// -------------------------------------------------------------
app.get('/api/reports/daily-log', authenticate, authorize('admin', 'kasir'), (req, res) => {
  const { date, shift_id, cashier_id, status } = req.query;

  let query = `
    SELECT
      o.id, o.order_number, o.created_at, o.status, o.payment_status,
      o.subtotal, o.discount_amount, o.total_amount,
      t.table_number, t.label as table_label,
      u.name as cashier_name,
      p.payment_method, p.amount_received, p.change_given
    FROM orders o
    JOIN tables t ON o.table_id = t.id
    LEFT JOIN payments p ON o.id = p.order_id
    LEFT JOIN users u ON p.confirmed_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (date) {
    query += ' AND date(o.created_at) = date(?)';
    params.push(date);
  } else {
    query += ' AND date(o.created_at) = date("now")';
  }

  if (shift_id) {
    query += ' AND o.shift_id = ?';
    params.push(shift_id);
  }

  if (cashier_id) {
    query += ' AND p.confirmed_by = ?';
    params.push(cashier_id);
  }

  if (status) {
    query += ' AND o.payment_status = ?';
    params.push(status);
  }

  query += ' ORDER BY o.id DESC';

  const logs = db.prepare(query).all(...params);

  const getItems = db.prepare('SELECT item_name, quantity, item_price FROM order_items WHERE order_id = ?');
  for (const log of logs) {
    log.items = getItems.all(log.id);
  }

  res.json(logs);
});

app.get('/api/reports/sales', authenticate, authorize('admin'), (req, res) => {
  const { period, start_date, end_date } = req.query;

  let dateFilter = '';
  const params = [];

  if (period === 'today') {
    dateFilter = "AND date(o.created_at) = date('now')";
  } else if (period === 'week') {
    dateFilter = "AND o.created_at >= date('now', '-7 days')";
  } else if (period === 'month') {
    dateFilter = "AND o.created_at >= date('now', '-30 days')";
  } else if (period === 'year') {
    dateFilter = "AND o.created_at >= date('now', '-365 days')";
  } else if (start_date && end_date) {
    dateFilter = "AND date(o.created_at) BETWEEN date(?) AND date(?)";
    params.push(start_date, end_date);
  } else {
    dateFilter = "AND o.created_at >= date('now', '-30 days')";
  }

  // Summary KPI
  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN o.payment_status = 'dibayar' THEN o.total_amount ELSE 0 END), 0) as net_revenue,
      COALESCE(SUM(CASE WHEN o.payment_status = 'dibayar' THEN o.subtotal ELSE 0 END), 0) as gross_revenue,
      COALESCE(SUM(CASE WHEN o.payment_status = 'dibayar' THEN o.discount_amount ELSE 0 END), 0) as total_discounts,
      COUNT(CASE WHEN o.payment_status = 'dibayar' THEN 1 END) as paid_orders_count,
      COUNT(CASE WHEN o.payment_status = 'voided' THEN 1 END) as voided_orders_count,
      COALESCE(SUM(CASE WHEN o.payment_status = 'voided' THEN o.total_amount ELSE 0 END), 0) as voided_amount
    FROM orders o
    WHERE 1=1 ${dateFilter}
  `).get(...params);

  // Total Refunds in period
  const refundSummary = db.prepare(`
    SELECT COALESCE(SUM(r.amount), 0) as total_refunds, COUNT(r.id) as refund_count
    FROM refunds r
    JOIN orders o ON r.order_id = o.id
    WHERE 1=1 ${dateFilter}
  `).get(...params);

  // Top Selling Items
  const bestSellers = db.prepare(`
    SELECT oi.item_name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.item_price) as total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.payment_status = 'dibayar' AND oi.item_status != 'voided' ${dateFilter}
    GROUP BY oi.item_name
    ORDER BY total_qty DESC
    LIMIT 7
  `).all(...params);

  // Revenue by Category
  const categoryRevenue = db.prepare(`
    SELECT c.name as category_name, SUM(oi.quantity * oi.item_price) as total_sales
    FROM order_items oi
    JOIN menu_items m ON oi.menu_item_id = m.id
    JOIN categories c ON m.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.payment_status = 'dibayar' AND oi.item_status != 'voided' ${dateFilter}
    GROUP BY c.name
    ORDER BY total_sales DESC
  `).all(...params);

  // Discount Breakdown by Category
  const discountBreakdown = db.prepare(`
    SELECT d.category_name, COUNT(d.id) as count, SUM(d.calculated_amount) as total_amount
    FROM discounts d
    JOIN orders o ON d.order_id = o.id
    WHERE o.payment_status = 'dibayar' ${dateFilter}
    GROUP BY d.category_name
    ORDER BY total_amount DESC
  `).all(...params);

  // Daily Trend
  const dailyTrend = db.prepare(`
    SELECT date(o.created_at) as order_date,
      SUM(o.total_amount) as revenue,
      COUNT(o.id) as order_count
    FROM orders o
    WHERE o.payment_status = 'dibayar' ${dateFilter}
    GROUP BY date(o.created_at)
    ORDER BY order_date ASC
  `).all(...params);

  res.json({
    summary: {
      ...summary,
      total_refunds: refundSummary.total_refunds,
      refund_count: refundSummary.refund_count,
      final_net_sales: summary.net_revenue - refundSummary.total_refunds
    },
    best_sellers: bestSellers,
    category_revenue: categoryRevenue,
    discount_breakdown: discountBreakdown,
    daily_trend: dailyTrend
  });
});

// -------------------------------------------------------------
// 12. EMPLOYEES & SHIFTS SCHEDULE
// -------------------------------------------------------------
app.get('/api/employees', authenticate, authorize('admin'), (req, res) => {
  const employees = db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
  res.json(employees);
});

app.post('/api/employees', authenticate, authorize('admin'), (req, res) => {
  const { name, role, phone, email } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Nama dan role karyawan wajib diisi.' });

  const result = db.prepare(`
    INSERT INTO employees (name, role, phone, email, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(name, role, phone || '', email || '');

  res.status(201).json({ id: result.lastInsertRowid, name, role, phone, email });
});

app.put('/api/employees/:id', authenticate, authorize('admin'), (req, res) => {
  const { name, role, phone, email, is_active } = req.body;
  db.prepare(`
    UPDATE employees SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name, role, phone, email, is_active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/employees/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/schedules', authenticate, authorize('admin'), (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, e.name as employee_name, e.role as employee_role
    FROM schedules s
    JOIN employees e ON s.employee_id = e.id
    ORDER BY
      CASE s.day_of_week
        WHEN 'Senin' THEN 1
        WHEN 'Selasa' THEN 2
        WHEN 'Rabu' THEN 3
        WHEN 'Kamis' THEN 4
        WHEN 'Jumat' THEN 5
        WHEN 'Sabtu' THEN 6
        WHEN 'Minggu' THEN 7
        ELSE 8
      END,
      s.start_time ASC
  `).all();
  res.json(schedules);
});

app.post('/api/schedules', authenticate, authorize('admin'), (req, res) => {
  const { employee_id, day_of_week, start_time, end_time, notes } = req.body;
  if (!employee_id || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'Karyawan, hari, jam mulai, dan jam selesai wajib diisi.' });
  }

  const result = db.prepare(`
    INSERT INTO schedules (employee_id, day_of_week, start_time, end_time, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(Number(employee_id), day_of_week, start_time, end_time, notes || '');

  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/schedules/:id', authenticate, authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Serve frontend build in production
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distDir, 'index.html'));
    }
  });
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`=================================================`);
  console.log(`☕ SERVER MAKITA COFFEE BERJALAN PADA PORT ${PORT}`);
  console.log(`-------------------------------------------------`);
  console.log(`- Akses Komputer Lokal : http://localhost:${PORT}`);
  console.log(`- Akses HP/Tablet/Wi-Fi : http://${localIp}:${PORT}`);
  console.log(`=================================================`);
});
