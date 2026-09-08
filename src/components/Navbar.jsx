import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useSocket } from '../context/SocketContext';
import {
  Coffee,
  Store,
  ChefHat,
  QrCode,
  UtensilsCrossed,
  ReceiptText,
  BarChart3,
  Users,
  Palette,
  Percent,
  LogOut,
  Menu as MenuIcon,
  X,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Navigation items for Admin
  const adminLinks = [
    { label: 'Kasir POS', path: '/kasir', icon: Store },
    { label: 'Dapur (KDS)', path: '/dapur', icon: ChefHat },
    { label: 'Menu & Kategori', path: '/admin/menu', icon: UtensilsCrossed },
    { label: 'Meja & QR', path: '/admin/tables', icon: QrCode },
    { label: 'Shift Kasir', path: '/kasir/shift', icon: ReceiptText },
    { label: 'Laporan', path: '/admin/reports', icon: BarChart3 },
    { label: 'Diskon', path: '/admin/discounts', icon: Percent },
    { label: 'Staff & Jadwal', path: '/admin/employees', icon: Users },
    { label: 'Branding', path: '/admin/branding', icon: Palette },
  ];

  // Navigation items for Kasir
  const kasirLinks = [
    { label: 'POS Kasir', path: '/kasir', icon: Store },
    { label: 'Buka / Tutup Shift', path: '/kasir/shift', icon: ReceiptText },
    { label: 'Manajemen Diskon', path: '/admin/discounts', icon: Percent },
  ];

  // Navigation items for Dapur
  const dapurLinks = [
    { label: 'Kitchen Display (KDS)', path: '/dapur', icon: ChefHat },
  ];

  let currentLinks = [];
  if (user?.role === 'admin') currentLinks = adminLinks;
  else if (user?.role === 'kasir') currentLinks = kasirLinks;
  else if (user?.role === 'dapur') currentLinks = dapurLinks;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Cafe Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.cafe_name}
                  className="w-10 h-10 object-contain rounded-xl shadow-sm border border-amber-100"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: branding?.primary_color || '#78350F' }}
                >
                  <Coffee size={22} />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 tracking-tight leading-tight text-base sm:text-lg group-hover:text-amber-800 transition">
                  {branding?.cafe_name || 'Kopi Senja Nusantara'}
                </span>
                <span className="text-xs text-gray-500 line-clamp-1 hidden sm:block">
                  {branding?.cafe_tagline || 'Cafe Management System'}
                </span>
              </div>
            </Link>

            {/* Live Socket Status Dot */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
              title={connected ? 'Terhubung secara realtime via WebSocket' : 'Mencoba menghubungkan kembali...'}
            >
              {connected ? <Wifi size={12} className="text-emerald-600" /> : <WifiOff size={12} className="text-rose-600 animate-pulse" />}
              <span className="text-[11px]">{connected ? 'Live Sync' : 'Reconnecting'}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[64%] py-1">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={active ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
                >
                  <Icon size={15} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Login / Logout */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-gray-800 leading-tight">{user.name}</span>
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Keluar / Logout"
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/order"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition"
                  style={{ backgroundColor: branding?.primary_color || '#78350F' }}
                >
                  Menu Meja
                </Link>
                <Link
                  to="/"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Login Staff
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X size={22} /> : <MenuIcon size={22} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900">{user.name}</p>
              <p className="text-xs text-amber-700 font-semibold uppercase">{user.role}</p>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                connected ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span>{connected ? 'Live Sync' : 'Offline'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={active ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
            >
              <LogOut size={16} /> Keluar Akun
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
