import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import CustomerScanner from './pages/CustomerScanner';
import StaffLogin from './pages/StaffLogin';
import CustomerOrder from './pages/customer/CustomerOrder';
import OrderTracker from './pages/customer/OrderTracker';
import CashierDashboard from './pages/cashier/CashierDashboard';
import CashierShift from './pages/cashier/CashierShift';
import KitchenDisplay from './pages/kitchen/KitchenDisplay';
import AdminMenu from './pages/admin/AdminMenu';
import AdminTables from './pages/admin/AdminTables';
import AdminReports from './pages/admin/AdminReports';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminBranding from './pages/admin/AdminBranding';
import AdminDiscounts from './pages/admin/AdminDiscounts';

export default function App() {
  const location = useLocation();

  // Hide global navbar on Customer Scanner, Staff Login, Customer ordering, or Kitchen Display
  const hideNavbar =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/staff' ||
    location.pathname.startsWith('/order') ||
    location.pathname === '/dapur';

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavbar && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* Customer Route: Direct Camera Scanner to scan table QR code */}
          <Route path="/" element={<CustomerScanner />} />
          <Route path="/order" element={<CustomerOrder />} />
          <Route path="/order/track/:orderNumber" element={<OrderTracker />} />

          {/* Dedicated Staff Login (Isolated from customers) */}
          <Route path="/login" element={<StaffLogin />} />
          <Route path="/staff" element={<Navigate to="/login" replace />} />

          {/* Cashier Routes (Kasir & Admin) */}
          <Route
            path="/kasir"
            element={
              <ProtectedRoute allowedRoles={['kasir']}>
                <CashierDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir/shift"
            element={
              <ProtectedRoute allowedRoles={['kasir']}>
                <CashierShift />
              </ProtectedRoute>
            }
          />

          {/* Kitchen Display (Dapur & Admin) */}
          <Route
            path="/dapur"
            element={
              <ProtectedRoute allowedRoles={['dapur']}>
                <KitchenDisplay />
              </ProtectedRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tables"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminTables />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminEmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branding"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBranding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/discounts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'kasir']}>
                <AdminDiscounts />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
