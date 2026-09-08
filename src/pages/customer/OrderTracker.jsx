import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  Coffee,
  Store,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

export default function OrderTracker() {
  const { orderNumber } = useParams();
  const { addListener } = useSocket();
  const { branding } = useBranding();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/track/${orderNumber}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError('Pesanan tidak ditemukan.');
      }
    } catch (err) {
      setError('Gagal memuat status pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Listen to real-time status updates via WebSocket
    const removeListener = addListener((msg) => {
      if (
        (msg.type === 'ORDER_STATUS_CHANGED' ||
         msg.type === 'PAYMENT_CONFIRMED' ||
         msg.type === 'ORDER_VOIDED' ||
         msg.type === 'ORDER_UPDATED') &&
        msg.payload?.order_number === orderNumber
      ) {
        fetchOrder();
      }
    });

    return () => removeListener();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-xs">Memeriksa status pesanan...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg text-center border border-gray-200">
          <AlertTriangle size={48} className="mx-auto text-amber-600 mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Pesanan Tidak Ditemukan</h2>
          <p className="text-xs text-gray-500 mt-1 mb-6">Nomor order #{orderNumber} tidak terdaftar di sistem.</p>
          <Link
            to="/order"
            className="w-full py-2.5 px-4 bg-amber-800 text-white font-bold rounded-xl text-xs inline-block"
          >
            Kembali ke Menu
          </Link>
        </div>
      </div>
    );
  }

  // Steps timeline
  // Statuses: 'menunggu_konfirmasi' | 'dibayar' | 'diproses' | 'siap' | 'selesai' | 'dibatalkan'
  const isVoided = order.payment_status === 'voided' || order.status === 'dibatalkan';

  const steps = [
    {
      id: 'menunggu_konfirmasi',
      title: 'Menunggu Konfirmasi',
      desc: 'Silakan datang ke Kasir untuk membayar tunai',
      icon: Store,
      done: true
    },
    {
      id: 'dibayar',
      title: 'Pembayaran Diterima',
      desc: 'Kasir telah menerima pembayaran tunai',
      icon: CheckCircle2,
      done: order.payment_status === 'dibayar'
    },
    {
      id: 'diproses',
      title: 'Sedang Disiapkan',
      desc: 'Dapur & barista sedang meracik pesanan',
      icon: ChefHat,
      done: ['diproses', 'siap', 'selesai'].includes(order.status)
    },
    {
      id: 'siap',
      title: 'Pesanan Siap',
      desc: 'Pesanan siap diantar ke meja Anda',
      icon: BellRing,
      done: ['siap', 'selesai'].includes(order.status)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/order?table=${order.table_number}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> Tambah Menu Lain
          </Link>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full">
            Meja #{order.table_number}
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header Banner */}
          <div
            className="p-6 text-white text-center relative"
            style={{ backgroundColor: branding?.primary_color || '#78350F' }}
          >
            <span className="text-xs uppercase tracking-widest text-amber-200 font-bold">
              Pelacak Status Pesanan
            </span>
            <h1 className="text-2xl font-black mt-1">#{order.order_number}</h1>
            <p className="text-xs text-amber-100/90 mt-1">
              Dipesan pada {formatDateTime(order.created_at)}
            </p>
          </div>

          {/* Voided Alert if cancelled */}
          {isVoided && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <div>
                <strong>Pesanan Dibatalkan (Void).</strong> Pesanan ini telah dibatalkan oleh Kasir/Admin.
              </div>
            </div>
          )}

          {/* Timeline */}
          {!isVoided && (
            <div className="p-6 border-b border-gray-100">
              <div className="space-y-6">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className="flex items-start gap-4 relative">
                      {/* Vertical line connector */}
                      {idx < steps.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 bottom-0 w-0.5 -mb-6 ${
                            step.done && steps[idx + 1].done ? 'bg-amber-700' : 'bg-gray-200'
                          }`}
                        />
                      )}

                      {/* Icon Bubble */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs z-10 transition ${
                          step.done
                            ? 'bg-amber-800 text-white'
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`text-sm font-bold ${
                              step.done ? 'text-gray-900' : 'text-gray-400'
                            }`}
                          >
                            {step.title}
                          </h3>
                          {step.done && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              Selesai
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${
                            step.done ? 'text-gray-600' : 'text-gray-400'
                          }`}
                        >
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cash Payment Prompt (if still unpaid) */}
          {order.payment_status === 'menunggu' && !isVoided && (
            <div className="m-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <Store size={15} /> Silakan Menuju Kasir
              </p>
              <p className="leading-relaxed">
                Total pembayaran Anda adalah <strong>{formatRupiah(order.total_amount)}</strong>. Tunjukkan nomor order <strong>#{order.order_number}</strong> atau nomor <strong>Meja {order.table_number}</strong> kepada kasir untuk membayar tunai.
              </p>
            </div>
          )}

          {/* Order Items Summary */}
          <div className="p-6 bg-gray-50/50">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Ringkasan Item Pesanan
            </h4>

            <div className="divide-y divide-gray-200/60">
              {order.items?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{item.item_name}</span>
                    <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    {item.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-0.5">
                        * {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatRupiah(item.item_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 mt-3 border-t border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Diskon:</span>
                  <span>- {formatRupiah(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-gray-900 pt-1 border-t border-gray-200">
                <span>Total Tagihan:</span>
                <span>{formatRupiah(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
