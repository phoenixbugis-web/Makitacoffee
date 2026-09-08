-- Skema Database Cafe Ordering & Management System (SQLite)

-- 1. Tabel Pengguna (Admin, Kasir, Dapur)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'kasir', 'dapur')) NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Meja Cafe & Token Barcode / QR
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_number INTEGER UNIQUE NOT NULL,
  label TEXT NOT NULL,
  qr_code_token TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Kategori Menu
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- IDR dalam integer (rupiah utuh)
  image_url TEXT,
  is_available INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Kategori Diskon (CRUD by Admin, misal: Diskon Karyawan, Diskon Owner, dll.)
CREATE TABLE IF NOT EXISTS discount_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK(discount_type IN ('percent', 'nominal')) DEFAULT 'percent',
  discount_value NUMERIC DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Shift Kasir (Buka Shift, Kas Modal, Kas Aktual, Selisih, Tutup Shift)
CREATE TABLE IF NOT EXISTS cashier_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  starting_cash INTEGER NOT NULL,
  ending_cash_actual INTEGER DEFAULT 0,
  expected_cash INTEGER DEFAULT 0,
  cash_difference INTEGER DEFAULT 0,
  notes TEXT,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open'
);

-- 7. Tabel Orders (Pemesanan Pelanggan / Kasir Manual)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  table_id INTEGER NOT NULL REFERENCES tables(id),
  customer_name TEXT DEFAULT 'Pelanggan',
  customer_notes TEXT,
  status TEXT CHECK(status IN ('menunggu_konfirmasi', 'dibayar', 'diproses', 'siap', 'selesai', 'dibatalkan')) DEFAULT 'menunggu_konfirmasi',
  payment_status TEXT CHECK(payment_status IN ('menunggu', 'dibayar', 'refunded', 'voided')) DEFAULT 'menunggu',
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  created_by_user_id INTEGER REFERENCES users(id), -- NULL jika dipesan pelanggan langsung
  shift_id INTEGER REFERENCES cashier_shifts(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Item Pesanan
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  item_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  item_status TEXT CHECK(item_status IN ('menunggu', 'diproses', 'siap', 'voided')) DEFAULT 'menunggu',
  void_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Diskon Order (Audit Trail Diskon)
CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES discount_categories(id),
  category_name TEXT NOT NULL,
  type TEXT CHECK(type IN ('percent', 'nominal')) NOT NULL,
  value NUMERIC NOT NULL,
  calculated_amount INTEGER NOT NULL,
  applied_by INTEGER NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel Pembayaran (Generik, siap QRIS/Metode lain di masa depan)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', generic for future qris/card/ewallet
  amount_due INTEGER NOT NULL,
  amount_received INTEGER NOT NULL,
  change_given INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT,
  confirmed_by INTEGER NOT NULL REFERENCES users(id),
  confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabel Void Order / Item
CREATE TABLE IF NOT EXISTS voids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INTEGER REFERENCES order_items(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  voided_by INTEGER NOT NULL REFERENCES users(id),
  voided_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Tabel Refunds (Pengembalian Uang Cash)
CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  processed_by INTEGER NOT NULL REFERENCES users(id),
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tabel Karyawan & Staff
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'Admin', 'Kasir', 'Dapur / Barista', 'Head Chef', 'Waiter'
  phone TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Tabel Jadwal Shift Kerja Karyawan
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL, -- 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
  shift_date DATE,
  start_time TEXT NOT NULL, -- '08:00'
  end_time TEXT NOT NULL,   -- '16:00'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. Tabel Pengaturan Branding & Template Cafe
CREATE TABLE IF NOT EXISTS branding_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cafe_name TEXT NOT NULL DEFAULT 'Kopi Senja Nusantara',
  cafe_tagline TEXT DEFAULT 'Artisan Coffee & Comfort Food',
  cafe_address TEXT DEFAULT 'Jl. Malioboro No. 45, Yogyakarta',
  cafe_phone TEXT DEFAULT '+62 812-3456-7890',
  logo_url TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#854D0E', -- Warm amber / coffee brown
  accent_color TEXT DEFAULT '#D97706',  -- Golden amber
  background_color TEXT DEFAULT '#FFFBEB', -- Soft cream
  paper_width TEXT CHECK(paper_width IN ('58mm', '80mm')) DEFAULT '58mm',
  footer_message TEXT DEFAULT 'Terima kasih atas kunjungan Anda! Selamat menikmati hidangan kami.',
  updated_by INTEGER REFERENCES users(id),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
