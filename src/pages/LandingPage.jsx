import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import {
  Coffee,
  Store,
  ChefHat,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  AlertCircle,
  Smartphone
} from 'lucide-react';

export default function LandingPage() {
  const { user, login } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Table simulator state
  const [selectedTable, setSelectedTable] = useState(1);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);
    try {
      const loggedUser = await login(username, password);
      if (loggedUser.role === 'admin') navigate('/kasir');
      else if (loggedUser.role === 'kasir') navigate('/kasir');
      else if (loggedUser.role === 'dapur') navigate('/dapur');
    } catch (err) {
      setLoginError(err.message || 'Login gagal.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleQuickLogin = async (u, p) => {
    setUsername(u);
    setPassword(p);
    setLoginError('');
    setLoadingLogin(true);
    try {
      const loggedUser = await login(u, p);
      if (loggedUser.role === 'admin') navigate('/kasir');
      else if (loggedUser.role === 'kasir') navigate('/kasir');
      else if (loggedUser.role === 'dapur') navigate('/dapur');
    } catch (err) {
      setLoginError(err.message || 'Login gagal.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const goToCustomerOrder = () => {
    navigate(`/order?table=${selectedTable}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50/40 via-white to-orange-50/30">
      {/* Top Announcement / Branding Bar */}
      <div
        className="text-white py-2.5 px-4 text-xs text-center font-medium shadow-xs flex items-center justify-center gap-2"
        style={{ backgroundColor: branding?.primary_color || '#78350F' }}
      >
        <Sparkles size={14} className="text-amber-300" />
        <span>Selamat datang di Sistem Digital Pemesanan Cafe Modern (PWA Ready)</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Hero Branding */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.cafe_name}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto mb-4 rounded-2xl shadow-md border border-amber-200"
            />
          ) : (
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: branding?.primary_color || '#78350F' }}
            >
              <Coffee size={44} />
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            {branding?.cafe_name || 'Kopi Senja Nusantara'}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-600 font-medium">
            {branding?.cafe_tagline || 'Artisan Coffee & Comfort Food Indonesia'}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {branding?.cafe_address} &bull; Telp: {branding?.cafe_phone}
          </p>
        </div>

        {/* Two Columns Grid: Customer Table Ordering VS Staff Login */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1: PENGUNJUNG / PELANGGAN (Scan QR Meja) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-0"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 mb-4">
                <Smartphone size={14} />
                <span>Pemesanan Pelanggan (Tanpa Login)</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">
                Pesan Mandiri Lewat Meja
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Pelanggan cukup scan barcode di meja cafe dengan HP. Pilih kopi dan makanan favorit, order langsung terhubung ke nomor meja Anda, lalu bayar cash di kasir.
              </p>

              {/* Table Selector Simulator */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <label className="block text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">
                  Simulasi Scan Barcode Meja:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedTable(num)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                        selectedTable === num
                          ? 'text-white shadow-md scale-105'
                          : 'bg-white text-gray-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                      style={selectedTable === num ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
                    >
                      <span className="text-[10px] text-amber-200/80 font-normal">Meja</span>
                      <span>#{num}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 relative z-10">
              <button
                onClick={goToCustomerOrder}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-white shadow-lg transition flex items-center justify-center gap-3 text-base group-hover:scale-[1.01]"
                style={{ backgroundColor: branding?.primary_color || '#78350F' }}
              >
                <QrCode size={20} />
                <span>Buka Menu Meja #{selectedTable}</span>
                <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition" />
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-2.5">
                *Pelanggan tidak perlu download aplikasi atau login akun.
              </p>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2: PORTAL LOGIN ROLE STAFF */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 mb-4">
                <Lock size={13} />
                <span>Portal Karyawan & Manajemen</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900">
                Masuk Sesuai Peran (Role)
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Login untuk staf Admin, Kasir, atau Dapur. Setiap role memiliki akses yang terisolasi dan terlindungi.
              </p>

              {/* 1-Click Demo Login Buttons for quick testing */}
              <div className="mt-5 mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Akses Cepat 1-Klik (Demo Testing):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    disabled={loadingLogin}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-left transition"
                  >
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <ShieldCheck size={14} /> Admin
                    </div>
                    <p className="text-[10px] text-amber-700 mt-0.5">Semua Akses</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('kasir', 'kasir123')}
                    disabled={loadingLogin}
                    className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-left transition"
                  >
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                      <Store size={14} /> Kasir
                    </div>
                    <p className="text-[10px] text-blue-700 mt-0.5">POS & Tutup Shift</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('dapur', 'dapur123')}
                    disabled={loadingLogin}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-left transition"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <ChefHat size={14} /> Dapur
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Layar KDS</p>
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin / kasir / dapur"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingLogin}
                  className="w-full py-3 px-4 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  style={{ backgroundColor: branding?.primary_color || '#78350F' }}
                >
                  {loadingLogin ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
                </button>
              </form>
            </div>

            {user && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
                <span>Saat ini masuk sebagai <strong>{user.name}</strong> ({user.role})</span>
                <button
                  onClick={() => navigate(user.role === 'dapur' ? '/dapur' : '/kasir')}
                  className="text-amber-800 font-bold hover:underline"
                >
                  Buka Dashboard &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-14 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2">
              <QrCode size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">QR Code Meja Otomatis</h3>
            <p className="text-xs text-gray-500 mt-1">Meja 1-10 langsung terdeteksi tanpa perlu login.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto mb-2">
              <Store size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Kasir Cash Only & POS</h3>
            <p className="text-xs text-gray-500 mt-1">Konfirmasi tunai, diskon custom, dan cetak struk thermal.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
              <ChefHat size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Kitchen Display (KDS)</h3>
            <p className="text-xs text-gray-500 mt-1">Hanya order dibayar dengan suara notifikasi bel.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto mb-2">
              <Sparkles size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Branding & Live Preview</h3>
            <p className="text-xs text-gray-500 mt-1">Ganti logo dan palet warna cafe secara instan global.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
