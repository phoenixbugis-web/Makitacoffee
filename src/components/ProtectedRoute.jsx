import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Memuat otentikasi...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to Staff Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check: Admin can access everything!
  const hasAccess = user.role === 'admin' || allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Akun Anda dengan peran <strong className="uppercase text-amber-800 font-bold">{user.role}</strong> tidak memiliki izin untuk membuka halaman ini.
          </p>
          <div className="flex flex-col gap-2">
            {user.role === 'kasir' && (
              <a
                href="/kasir"
                className="w-full py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold transition"
              >
                Kembali ke Dashboard Kasir
              </a>
            )}
            {user.role === 'dapur' && (
              <a
                href="/dapur"
                className="w-full py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold transition"
              >
                Kembali ke Kitchen Display (KDS)
              </a>
            )}
            <a
              href="/"
              className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Ke Halaman Depan
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
