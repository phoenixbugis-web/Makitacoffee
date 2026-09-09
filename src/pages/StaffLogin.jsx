import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import {
  Coffee,
  Store,
  ChefHat,
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  ArrowLeft,
  QrCode
} from 'lucide-react';

export default function StaffLogin() {
  const { login } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      {/* Top Back Link to Customer Scanner */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-amber-800 transition py-1 px-2.5 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Scan Barcode Meja</span>
        </Link>
        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
          Portal Internal Staf
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
        {/* Cafe Logo & Header */}
        <div className="text-center mb-6">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.cafe_name}
              className="w-16 h-16 object-contain mx-auto mb-3 rounded-2xl shadow-sm border border-amber-100"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: branding?.primary_color || '#78350F' }}
            >
              <Coffee size={28} />
            </div>
          )}
          <h2 className="text-2xl font-extrabold text-gray-900">
            {branding?.cafe_name || 'Kopi Senja'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Masuk ke sistem Kasir, Dapur, atau Dashboard Manajemen Admin
          </p>
        </div>

        {/* Quick Demo Role Selector */}
        <div className="mb-6">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Akses Cepat 1-Klik (Staf):
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition flex flex-col justify-between group"
            >
              <ShieldCheck size={18} className="text-amber-700 group-hover:scale-110 transition" />
              <div className="mt-1">
                <p className="text-xs font-bold text-amber-900">Admin</p>
                <p className="text-[10px] text-amber-700">Semua Akses</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('kasir', 'kasir123')}
              className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition flex flex-col justify-between group"
            >
              <Store size={18} className="text-blue-700 group-hover:scale-110 transition" />
              <div className="mt-1">
                <p className="text-xs font-bold text-blue-900">Kasir</p>
                <p className="text-[10px] text-blue-700">POS & Shift</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('dapur', 'dapur123')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition flex flex-col justify-between group"
            >
              <ChefHat size={18} className="text-emerald-700 group-hover:scale-110 transition" />
              <div className="mt-1">
                <p className="text-xs font-bold text-emerald-900">Dapur</p>
                <p className="text-[10px] text-emerald-700">Layar KDS</p>
              </div>
            </button>
          </div>
        </div>

        {/* Login Error Notification */}
        {loginError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Username Staf</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: kasir / admin / dapur"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-700 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Kata Sandi</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-700 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: branding?.primary_color || '#78350F' }}
          >
            {loadingLogin ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Masuk ke Dashboard Staf</span>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 flex items-center gap-1.5">
        <QrCode size={14} />
        <span>Pelanggan silakan scan barcode yang ada di meja untuk memesan makanan.</span>
      </div>
    </div>
  );
}
