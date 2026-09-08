# Cafe Ordering & Management System (Full-Stack, Responsive Web App + PWA)

Sistem Pemesanan & Manajemen Cafe Modern Nusantara yang lengkap, responsif, dan siap diinstal sebagai **PWA (Progressive Web App)**. Dibangun menggunakan arsitektur full-stack Node.js Express, SQLite, WebSocket real-time, React 18, Tailwind CSS, dan Lucide Icons dalam Bahasa Indonesia dan mata uang Rupiah (IDR).

---

## ☕ Fitur Utama Sistem

1. **Pemesanan Pelanggan Mandiri (Scan Barcode/QR Meja Tanpa Login)**
   - Akses instan via `/order?table=X` (auto-deteksi nomor meja).
   - Menu dikelompokkan per kategori (Kopi Spesialti, Minuman & Teh, Makanan Utama, Camilan, Dessert).
   - Drawer detail item: atur kuantiti, catatan khusus (*less sugar, no ice, dll.*).
   - Checkout langsung ke status **"Menunggu Konfirmasi Kasir" (Cash-Only)** tanpa perlu login.
   - Pelacak status pesanan interaktif (*Menunggu Konfirmasi &rarr; Dibayar &rarr; Diproses &rarr; Siap &rarr; Selesai*).

2. **Dashboard Kasir POS (Cash-Only & Konfirmasi Tunai)**
   - Antrian pesanan masuk real-time dari pelanggan.
   - Perhitungan otomatis uang tunai diterima & kembalian.
   - Tombol **"Tandai Sudah Dibayar (Cash)"** &rarr; otomatis meneruskan pesanan ke Dapur (KDS) dan mencetak struk thermal.
   - Input order manual (Walk-in) dengan pemilihan nomor meja.
   - Mesin Diskon Fleksibel (% atau Rp, kategori: Diskon Karyawan, Diskon Owner, dll.).
   - Manajemen Void order/item & Refund tunai terotorisasi dengan alasan audit.

3. **Kitchen Display System (KDS - Dapur Real-time)**
   - **Hanya menampilkan pesanan yang sudah dibayar tunai di kasir** (pesanan belum bayar tidak pernah masuk KDS).
   - Notifikasi audio bel chime synthesizer (Web Audio API) otomatis saat ada order baru dibayar masuk.
   - Pengelompokan pesanan per meja, timer durasi elapsed dengan warna indikator, serta catatan khusus yang disorot jelas.
   - Tombol aksi: "Mulai Proses" &rarr; "Tandai Siap" &rarr; "Selesai".
   - Sinkronisasi instan saat ada item/order yang di-void dari kasir (hilang otomatis disertai suara peringatan).

4. **Mesin Cetak Struk Thermal Printer (58mm & 80mm)**
   - Format cetak ramah thermal printer ESC/POS.
   - Pilihan lebar kertas **58mm** dan **80mm**.
   - Cetak Struk Pelanggan, Tiket Dapur (Kitchen Ticket), Slip Void/Refund, dan Slip Z-Report Tutup Buku.
   - Tombol "Cetak Ulang Struk" di riwayat transaksi.

5. **Pembukuan Shift Kasir & Tutup Buku (Z-Report)**
   - Buka shift dengan input modal awal (cash float).
   - Pelacakan live: total penjualan cash, void, refund, diskon, dan uang yang seharusnya ada di laci.
   - Tutup shift: input hitung fisik kas, kalkulasi selisih otomatis (Lebih/Kurang/Pas).
   - Dokumen Z-Report lengkap yang dapat dicetak ke printer thermal atau diekspor.

6. **Laporan Penjualan & Log Transaksi Harian**
   - Filter Harian, Mingguan, Bulanan, Tahunan, dan kalender tanggal.
   - Grafik analitik pendapatan, item terlaris (Best Sellers), pendapatan per kategori, serta rekapitulasi diskon per kategori.
   - Log audit transaksi harian yang dapat difilter dan diekspor ke file CSV.

7. **Generator Barcode / QR Meja & Table Tent Card**
   - Generate kode QR unik untuk Meja 1 s.d. 10.
   - Unduh file gambar QR (PNG).
   - Mode pratinjau dan cetak Kartu Meja (Table Standee / Tent Card) siap cetak dengan logo cafe.

8. **Branding & Template Cafe (Live Preview)**
   - Ganti nama cafe, tagline, alamat, no telepon, pesan footer struk.
   - Upload file logo cafe atau gunakan URL gambar.
   - Color picker warna Primer, Aksen, dan Background, dilengkapi preset palet (Modern Espresso, Matcha Zen, Berry Sunset, Royal Velvet, Minimalist Charcoal).
   - **Live Preview Real-time** header customer, menu card, dan struk thermal sebelum disimpan.
   - Perubahan berlaku global dan instan di seluruh layar.
   - Tombol "Reset ke Default".

9. **Landing Page Portal & Role-Based Access Control**
   - Halaman portal selamat datang dengan simulator scan meja pengunjung.
   - Login staf berbasis peran (*Admin*, *Kasir*, *Dapur*).
   - Role Route Guard: Kasir dilarang masuk ke Admin/KDS, Dapur dilarang masuk ke Kasir/Admin, Admin memiliki akses penuh ke seluruh modul.

---

## 🔑 Akun Demo Bawaan (Default Credentials)

| Role | Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Akses penuh ke seluruh menu, POS, KDS, Laporan, Karyawan, Branding |
| **Kasir** | `kasir` | `kasir123` | POS Kasir, Konfirmasi Cash, Buka/Tutup Shift, Cetak Struk |
| **Dapur** | `dapur` | `dapur123` | Kitchen Display System (KDS) & Notifikasi Pesanan Masuk |
| **Pengunjung** | *Tanpa Login* | *Tanpa Login* | Langsung pesan di `/order?table=1` |

---

## 🚀 Cara Menjalankan Aplikasi

```bash
cd /Users/macbook/.gemini/antigravity/scratch/cafe-order-system

# Menjalankan server aplikasi (Backend + Frontend + WebSocket pada port 3001)
npm start

# Atau jalankan dev server
npm run dev
```

Buka browser di: **`http://localhost:3001`**
- Halaman Depan & Login: `http://localhost:3001/`
- Simulasi Pesan Meja 3: `http://localhost:3001/order?table=3`
- POS Kasir: `http://localhost:3001/kasir`
- Kitchen Display (KDS): `http://localhost:3001/dapur`
- Shift Kasir: `http://localhost:3001/kasir/shift`
- Laporan Penjualan: `http://localhost:3001/admin/reports`
- Branding Editor: `http://localhost:3001/admin/branding`
- Generator QR Meja: `http://localhost:3001/admin/tables`
