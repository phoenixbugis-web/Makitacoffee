import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useBranding } from '../../context/BrandingContext';
import { formatDateTime, getElapsedMinutes } from '../../utils/formatters';
import {
  playKitchenOrderChime,
  playKitchenReadyChime,
  playVoidAlertChime
} from '../../utils/audio';
import ThermalReceipt from '../../components/ThermalReceipt';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Volume2,
  RefreshCw,
  Sparkles,
  Flame,
  Check
} from 'lucide-react';

export default function KitchenDisplay() {
  const { token } = useAuth();
  const { addListener, connected } = useSocket();
  const { branding } = useBranding();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [voidAlert, setVoidAlert] = useState(null);

  // Kitchen ticket modal for printing
  const [kitchenTicketModal, setKitchenTicketModal] = useState({
    isOpen: false,
    order: null
  });

  // Fetch only paid orders that are in kitchen (diproses or siap)
  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch('/api/orders?for_kds=true');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();

    // Auto update elapsed timer every 30 seconds
    const timer = setInterval(() => {
      setOrders(prev => [...prev]);
    }, 30000);

    // Listen to real-time events
    const unsubscribe = addListener((msg) => {
      // 1. New Paid Order arrives!
      if (msg.type === 'PAYMENT_CONFIRMED') {
        playKitchenOrderChime();
        setNewOrderAlert(msg.payload);
        fetchKitchenOrders();
        setTimeout(() => setNewOrderAlert(null), 6000);
      }

      // 2. Order status updated
      if (msg.type === 'ORDER_STATUS_CHANGED') {
        fetchKitchenOrders();
      }

      // 3. Void order or item
      if (msg.type === 'ORDER_VOIDED') {
        playVoidAlertChime();
        setVoidAlert(msg.payload);
        fetchKitchenOrders();
        setTimeout(() => setVoidAlert(null), 7000);
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  // Update order status: 'diproses' -> 'siap' -> 'selesai'
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        if (newStatus === 'siap') {
          playKitchenReadyChime();
        }
        fetchKitchenOrders();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 pb-20 select-none">
      {/* KDS Header Bar (High Contrast Dark Mode) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-gray-950 flex items-center justify-center font-black shadow-lg">
            <ChefHat size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
                Kitchen Display System (KDS)
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                Order Sudah Dibayar Cash
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {branding?.cafe_name || 'Cafe Senja'} &bull; Layar Antrian Dapur & Barista Real-time
            </p>
          </div>
        </div>

        {/* Right Info & Refresh */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-400 block font-mono">Antrian Aktif:</span>
            <span className="text-xl font-black text-amber-400 font-mono">
              {orders.length} Pesanan
            </span>
          </div>

          <button
            onClick={() => {
              playKitchenOrderChime();
            }}
            title="Tes Notifikasi Suara Bel"
            className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
          >
            <Volume2 size={18} />
          </button>

          <button
            onClick={fetchKitchenOrders}
            className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            title="Refresh Layar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Pop-up Alert: New Paid Order */}
      {newOrderAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-3">
            <Flame size={24} className="text-amber-300 animate-pulse" />
            <div>
              <p className="text-sm uppercase tracking-wider text-emerald-100">Pesanan Baru Masuk & Sudah Dibayar!</p>
              <p className="text-lg font-black">
                {newOrderAlert.table_label || `Meja ${newOrderAlert.table_number}`} &bull; #{newOrderAlert.order_number}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNewOrderAlert(null)}
            className="text-xs bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-xl"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Pop-up Alert: Order / Item Voided */}
      {voidAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-700 text-white font-bold flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-300" />
            <div>
              <p className="text-sm uppercase tracking-wider text-rose-200">PERINGATAN VOID DARI KASIR!</p>
              <p className="text-base font-black">
                {voidAlert.item_name ? `Item "${voidAlert.item_name}" dibatalkan` : `Order #${voidAlert.order_number} dibatalkan`}
              </p>
              <p className="text-xs text-rose-200">Alasan: {voidAlert.reason}</p>
            </div>
          </div>
          <button
            onClick={() => setVoidAlert(null)}
            className="text-xs bg-rose-900 hover:bg-rose-950 px-3 py-1.5 rounded-xl"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Orders */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-900/80 rounded-3xl p-16 text-center border border-gray-800 max-w-lg mx-auto mt-10">
          <ChefHat size={54} className="mx-auto text-gray-600 mb-3" />
          <h2 className="text-xl font-bold text-gray-200">Dapur Sedang Santai</h2>
          <p className="text-xs text-gray-400 mt-1">
            Tidak ada pesanan aktif. Order yang belum dibayar kasir tidak akan muncul di sini. Begitu kasir konfirmasi bayar, order akan otomatis berbunyi dan tampil di layar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {orders.map((order) => {
            const elapsed = getElapsedMinutes(order.created_at);
            // Color code timer: green (<10m), yellow (10-20m), red (>20m)
            const timerColor = elapsed > 20
              ? 'bg-rose-600 text-white'
              : elapsed > 10
              ? 'bg-amber-500 text-gray-950'
              : 'bg-emerald-600 text-white';

            const isSiap = order.status === 'siap';

            return (
              <div
                key={order.id}
                className={`bg-gray-900 rounded-3xl border-2 flex flex-col justify-between shadow-2xl transition overflow-hidden ${
                  isSiap ? 'border-emerald-500/80' : 'border-amber-500/80'
                }`}
              >
                <div>
                  {/* Card Header with Table & Timer */}
                  <div className="p-4 bg-gray-850 border-b border-gray-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white">
                        {order.table_label || `MEJA ${order.table_number}`}
                      </h2>
                      <span className="text-[11px] font-mono text-gray-400">
                        #{order.order_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono flex items-center gap-1 ${timerColor}`}>
                        <Clock size={13} />
                        <span>{elapsed} mnt</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer / Cashier notes */}
                  {order.customer_notes && (
                    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 italic">
                      * {order.customer_notes}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="p-4 space-y-3">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-950/70 rounded-2xl border border-gray-800/80 flex items-start justify-between gap-2"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-100 uppercase tracking-wide leading-tight">
                            {item.item_name}
                          </p>
                          {item.notes ? (
                            <p className="text-xs font-bold text-amber-400 mt-1 underline">
                              NOTE: {item.notes}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-lg font-black px-2.5 py-0.5 bg-amber-500 text-gray-950 rounded-xl shrink-0">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-gray-850 border-t border-gray-800 space-y-2">
                  <div className="flex items-center gap-2">
                    {order.status === 'diproses' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'siap')}
                        className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} />
                        <span>Tandai Siap Saji</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'selesai')}
                        className="flex-1 py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-1.5"
                      >
                        <Check size={16} />
                        <span>Selesai / Diantar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setKitchenTicketModal({ isOpen: true, order })}
                      title="Cetak Tiket Dapur"
                      className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kitchen Ticket Modal */}
      {kitchenTicketModal.isOpen && (
        <ThermalReceipt
          type="kitchen"
          data={kitchenTicketModal.order}
          onClose={() => setKitchenTicketModal({ isOpen: false, order: null })}
        />
      )}
    </div>
  );
}
