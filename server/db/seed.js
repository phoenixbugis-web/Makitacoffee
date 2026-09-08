import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'cafe.db');
const schemaPath = path.join(__dirname, 'schema.sql');

export function initDatabase() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Execute Schema
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // Lightweight schema migration for discount_categories:
  try {
    const tableInfo = db.prepare("PRAGMA table_info(discount_categories)").all();
    const hasDiscountType = tableInfo.some(col => col.name === 'discount_type');
    const hasDiscountValue = tableInfo.some(col => col.name === 'discount_value');

    if (!hasDiscountType) {
      db.exec("ALTER TABLE discount_categories ADD COLUMN discount_type TEXT DEFAULT 'percent'");
    }
    if (!hasDiscountValue) {
      db.exec("ALTER TABLE discount_categories ADD COLUMN discount_value NUMERIC DEFAULT 0");
    }

    // Set sensible default values for existing categories if at 0
    db.prepare("UPDATE discount_categories SET discount_type = 'percent', discount_value = 20 WHERE name = 'Diskon Karyawan' AND discount_value = 0").run();
    db.prepare("UPDATE discount_categories SET discount_type = 'percent', discount_value = 50 WHERE name = 'Diskon Owner' AND discount_value = 0").run();
    db.prepare("UPDATE discount_categories SET discount_type = 'percent', discount_value = 10 WHERE name = 'Diskon Member' AND discount_value = 0").run();
    db.prepare("UPDATE discount_categories SET discount_type = 'percent', discount_value = 15 WHERE name = 'Diskon Promo' AND discount_value = 0").run();
    db.prepare("UPDATE discount_categories SET discount_type = 'nominal', discount_value = 5000 WHERE name = 'Diskon Lainnya' AND discount_value = 0").run();
  } catch (err) {
    console.error('Migration note for discount_categories:', err);
  }

  // Check if users already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already seeded.');
    return db;
  }

  console.log('Seeding database with default cafe data...');

  // 1. Seed Users (admin, kasir, dapur)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, name)
    VALUES (?, ?, ?, ?)
  `);

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const kasirHash = bcrypt.hashSync('kasir123', salt);
  const dapurHash = bcrypt.hashSync('dapur123', salt);

  insertUser.run('admin', adminHash, 'admin', 'Manager Cafe (Admin)');
  insertUser.run('kasir', kasirHash, 'kasir', 'Siti Rahma (Kasir Utama)');
  insertUser.run('dapur', dapurHash, 'dapur', 'Chef Budi (Head Kitchen & Barista)');

  // 2. Seed Tables (Meja 1 s.d. 10)
  const insertTable = db.prepare(`
    INSERT INTO tables (table_number, label, qr_code_token)
    VALUES (?, ?, ?)
  `);

  for (let i = 1; i <= 10; i++) {
    const area = i <= 6 ? 'Indoor AC' : 'Outdoor Garden';
    insertTable.run(i, `Meja ${i} (${area})`, `TBL-0${i < 10 ? '0' + i : i}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }

  // 3. Seed Categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, slug, display_order)
    VALUES (?, ?, ?)
  `);

  const catCoffee = insertCategory.run('Kopi Spesialti', 'kopi-spesialti', 1).lastInsertRowid;
  const catNonCoffee = insertCategory.run('Minuman & Teh', 'minuman-teh', 2).lastInsertRowid;
  const catFood = insertCategory.run('Makanan Utama', 'makanan-utama', 3).lastInsertRowid;
  const catSnacks = insertCategory.run('Camilan & Kudapan', 'camilan-kudapan', 4).lastInsertRowid;
  const catDessert = insertCategory.run('Dessert & Pastry', 'dessert-pastry', 5).lastInsertRowid;

  // 4. Seed Menu Items
  const insertItem = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, price, image_url, is_available)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Kopi
  insertItem.run(
    catCoffee,
    'Kopi Susu Senja Gula Aren',
    'Espresso house blend arabica & robusta, fresh milk creamy, dan gula aren murni khas Nusantara.',
    22000,
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catCoffee,
    'Americano Double Shot',
    'Ekstraksi dobel espresso arabica Gayo dengan air mineral dingin/hangat, rasa bold & aromatic.',
    18000,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catCoffee,
    'Caramel Macchiato Cloud',
    'Espresso kaya rasa dipadu sirup vanila, steamed milk lembut, dan drizzle saus karamel artisanal.',
    28000,
    'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catCoffee,
    'Caffe Latte Warm',
    'Espresso seimbang berpadu steamed fresh milk dengan microfoam lembut dan latte art cantik.',
    25000,
    'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=60',
    1
  );

  // Minuman Non-Coffee
  insertItem.run(
    catNonCoffee,
    'Uji Matcha Latte Imperial',
    'Bubuk matcha otentik dari Uji Kyoto, diseduh fresh dengan susu oat/sapi creamy dan sedikit madu.',
    27000,
    'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catNonCoffee,
    'Peach Blossom Iced Tea',
    'Teh hitam premium berpadu sari buah peach manis segar dengan irisan buah persik asli & daun mint.',
    20000,
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catNonCoffee,
    'Belgian Dark Chocolate',
    'Cokelat pekat Belgia 70% disajikan hangat atau dingin dengan taburan cocoa powder aromatik.',
    26000,
    'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=60',
    1
  );

  // Makanan Utama
  insertItem.run(
    catFood,
    'Nasi Goreng Spesial Cafe Senja',
    'Nasi goreng rempah istimewa dengan suwiran ayam gurih, telur mata sapi, acar segar, dan kerupuk udang.',
    35000,
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catFood,
    'Mie Nyemek Jawa Telur Bebek',
    'Mie godhog kuah kental gurih pedas manis khas Jogja, sawi hijau, suwir ayam kampung, & telur bebek.',
    32000,
    'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catFood,
    'Chicken Katsu Curry Rice',
    'Fillet paha ayam renyah keemasan dengan kuah kari Jepang kental harum wortel dan kentang empuk.',
    38000,
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60',
    1
  );

  // Camilan
  insertItem.run(
    catSnacks,
    'Truffle Fries with Herb Aioli',
    'Kentang goreng stik renyah diinfus minyak truffle asli, taburan parmesan & daun rosemary segar.',
    24000,
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catSnacks,
    'Singkong Keju Krispi Sambal Roa',
    'Singkong merekah super empuk bertabur parutan keju cheddar melimpah dipadu cocolan sambal roa pedas.',
    20000,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catSnacks,
    'Roti Bakar Bandung Coklat Keju',
    'Roti tebal panggangan arang dengan lelehan cokelat meses Belgia dan parutan keju gurih melimpah.',
    22000,
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&auto=format&fit=crop&q=60',
    1
  );

  // Dessert
  insertItem.run(
    catDessert,
    'Classic Tiramisu Jar',
    'Ladyfinger celup espresso liqueur lembut berlayer krim mascarpone Italia dan taburan kakao pekat.',
    29000,
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60',
    1
  );
  insertItem.run(
    catDessert,
    'Butter Croissant Artisan',
    'Croissant berlapis-lapis mentega Prancis (AOP butter) renyah di luar dan lembut wangi di dalam.',
    23000,
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60',
    1
  );

  // 5. Seed Discount Categories
  const insertDiscountCat = db.prepare(`
    INSERT INTO discount_categories (name, discount_type, discount_value, is_active)
    VALUES (?, ?, ?, 1)
  `);
  insertDiscountCat.run('Diskon Karyawan', 'percent', 20);
  insertDiscountCat.run('Diskon Owner', 'percent', 50);
  insertDiscountCat.run('Diskon Member', 'percent', 10);
  insertDiscountCat.run('Diskon Promo', 'percent', 15);
  insertDiscountCat.run('Diskon Lainnya', 'nominal', 5000);

  // 6. Seed Branding Settings
  const insertBranding = db.prepare(`
    INSERT INTO branding_settings (
      cafe_name, cafe_tagline, cafe_address, cafe_phone, logo_url,
      primary_color, accent_color, background_color, paper_width, footer_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBranding.run(
    'Kopi Senja Nusantara',
    'Artisan Coffee & Comfort Food Indonesia',
    'Jl. Malioboro No. 45, Danurejan, Yogyakarta',
    '0812-3456-7890',
    '',
    '#78350F', // Warm Coffee Brown
    '#D97706', // Warm Amber
    '#FFFBEB', // Soft Cream
    '58mm',
    'Terima kasih atas kunjungan Anda di Kopi Senja Nusantara! Simpan struk ini untuk promo berikutnya.'
  );

  // 7. Seed Employees
  const insertEmployee = db.prepare(`
    INSERT INTO employees (name, role, phone, email, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const emp1 = insertEmployee.run('Budi Santoso', 'Head Kitchen / Chef', '0812-1111-2222', 'budi@senja.cafe').lastInsertRowid;
  const emp2 = insertEmployee.run('Siti Rahma', 'Kasir Utama', '0813-3333-4444', 'siti@senja.cafe').lastInsertRowid;
  const emp3 = insertEmployee.run('Dimas Pratama', 'Senior Barista', '0815-5555-6666', 'dimas@senja.cafe').lastInsertRowid;
  const emp4 = insertEmployee.run('Anisa Wijaya', 'Waiter & Service', '0818-7777-8888', 'anisa@senja.cafe').lastInsertRowid;
  const emp5 = insertEmployee.run('Rizky Ramadhan', 'Junior Barista', '0819-9999-0000', 'rizky@senja.cafe').lastInsertRowid;

  // 8. Seed Schedules
  const insertSchedule = db.prepare(`
    INSERT INTO schedules (employee_id, day_of_week, start_time, end_time, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSchedule.run(emp1, 'Senin', '08:00', '16:00', 'Shift Pagi Dapur');
  insertSchedule.run(emp2, 'Senin', '08:00', '16:00', 'Shift Pagi Kasir');
  insertSchedule.run(emp3, 'Senin', '15:30', '23:00', 'Shift Malam Barista');
  insertSchedule.run(emp4, 'Senin', '10:00', '18:00', 'Shift Tengah Floor');
  insertSchedule.run(emp5, 'Selasa', '08:00', '16:00', 'Shift Pagi Barista');
  insertSchedule.run(emp2, 'Selasa', '08:00', '16:00', 'Shift Pagi Kasir');
  insertSchedule.run(emp1, 'Rabu', '08:00', '16:00', 'Shift Pagi Dapur');
  insertSchedule.run(emp3, 'Kamis', '15:30', '23:00', 'Shift Malam Barista');
  insertSchedule.run(emp4, 'Jumat', '14:00', '22:00', 'Shift Weekend Floor');

  // 9. Seed Initial Cashier Shift (Active open shift)
  const insertShift = db.prepare(`
    INSERT INTO cashier_shifts (cashier_id, starting_cash, status, opened_at, notes)
    VALUES (?, ?, 'open', datetime('now', '-4 hours'), 'Modal awal laci kasir pecahan 5k, 10k, 20k, 50k')
  `);
  const activeShiftId = insertShift.run(2, 200000).lastInsertRowid; // Kasir Siti, modal 200.000

  // 10. Seed Sample Orders for immediate Demo Reports
  const createOrder = db.prepare(`
    INSERT INTO orders (
      order_number, table_id, customer_name, customer_notes, status, payment_status,
      subtotal, discount_amount, tax_amount, total_amount, created_by_user_id, shift_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
  `);

  const createOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, item_name, item_price, quantity, notes, item_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const createPayment = db.prepare(`
    INSERT INTO payments (order_id, payment_method, amount_due, amount_received, change_given, confirmed_by, confirmed_at)
    VALUES (?, 'cash', ?, ?, ?, ?, datetime('now', ?))
  `);

  // Sample Order 1: Meja 1 (Selesai & Dibayar)
  const o1 = createOrder.run('ORD-20260906-001', 1, 'Andi Wibowo', 'Less sugar kopi', 'selesai', 'dibayar', 57000, 0, 0, 57000, 2, activeShiftId, '-3 hours', '-2 hours').lastInsertRowid;
  createOrderItem.run(o1, 1, 'Kopi Susu Senja Gula Aren', 22000, 1, 'Less sugar', 'siap');
  createOrderItem.run(o1, 8, 'Nasi Goreng Spesial Cafe Senja', 35000, 1, 'Pedas sedang', 'siap');
  createPayment.run(o1, 57000, 60000, 3000, 2, '-2 hours');

  // Sample Order 2: Meja 4 (Dibayar & Ada Diskon Karyawan)
  const o2 = createOrder.run('ORD-20260906-002', 4, 'Dimas (Staff)', 'Makan sore', 'selesai', 'dibayar', 62000, 12000, 0, 50000, 2, activeShiftId, '-1.5 hours', '-1 hours').lastInsertRowid;
  createOrderItem.run(o2, 11, 'Truffle Fries with Herb Aioli', 24000, 1, '', 'siap');
  createOrderItem.run(o2, 10, 'Chicken Katsu Curry Rice', 38000, 1, '', 'siap');
  db.prepare(`
    INSERT INTO discounts (order_id, category_id, category_name, type, value, calculated_amount, applied_by, notes, created_at)
    VALUES (?, 1, 'Diskon Karyawan', 'nominal', 12000, 12000, 2, 'Makan sore staff barista Dimas', datetime('now', '-1.5 hours'))
  `).run(o2);
  createPayment.run(o2, 50000, 50000, 0, 2, '-1 hours');

  // Sample Order 3: Meja 2 (Sedang Diproses di Dapur - Sudah Dibayar Cash)
  const o3 = createOrder.run('ORD-20260906-003', 2, 'Maya Putri', 'Dine-in cepat', 'diproses', 'dibayar', 49000, 0, 0, 49000, 2, activeShiftId, '-15 minutes', '-12 minutes').lastInsertRowid;
  createOrderItem.run(o3, 5, 'Uji Matcha Latte Imperial', 27000, 1, 'Oatmilk ice', 'diproses');
  createOrderItem.run(o3, 13, 'Roti Bakar Bandung Coklat Keju', 22000, 1, 'Coklat banyak', 'diproses');
  createPayment.run(o3, 49000, 50000, 1000, 2, '-12 minutes');

  // Sample Order 4: Meja 5 (Order Pelanggan BARU - Menunggu Konfirmasi Kasir)
  const o4 = createOrder.run('ORD-20260906-004', 5, 'Rian Kusuma', 'Tolong jangan terlalu manis', 'menunggu_konfirmasi', 'menunggu', 46000, 0, 0, 46000, null, activeShiftId, '-3 minutes', '-3 minutes').lastInsertRowid;
  createOrderItem.run(o4, 1, 'Kopi Susu Senja Gula Aren', 22000, 1, 'Normal ice', 'menunggu');
  createOrderItem.run(o4, 12, 'Singkong Keju Krispi Sambal Roa', 20000, 1, 'Sambal dipisah', 'menunggu');

  console.log('Database seeded successfully!');
  return db;
}

// If run directly from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase();
}
