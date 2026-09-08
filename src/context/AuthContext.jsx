import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cafe_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('cafe_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('cafe_user', JSON.stringify(data.user));
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server backend tidak merespons (Pastikan aplikasi di-deploy sebagai Web Service Node.js, bukan Static Frontend saja).');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login gagal.');
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('cafe_token', data.token);
    localStorage.setItem('cafe_user', JSON.stringify(data.user));
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cafe_token');
    localStorage.removeItem('cafe_user');
  };

  const isAdmin = user?.role === 'admin';
  const isKasir = user?.role === 'kasir' || isAdmin;
  const isDapur = user?.role === 'dapur' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin, isKasir, isDapur }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
