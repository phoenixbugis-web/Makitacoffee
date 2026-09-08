import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah, formatDateTime, formatDate } from '../../utils/formatters';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  Ban,
  Percent,
  Filter,
  DollarSign,
  Coffee,
  Printer,
  ChevronRight
} from 'lucide-react';

export default function AdminReports() {
  const { token } = useAuth();
  const { branding } = useBranding();

  // Tabs: 'analytics' | 'daily_log'
  const [activeTab, setActiveTab] = useState('analytics');

  // Analytics filter: 'today' | 'week' | 'month' | 'year'
  const [period, setPeriod] = useState('month');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Daily Log filter
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logStatusFilter, setLogStatusFilter] = useState('all');

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/reports/sales?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAnalyticsData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchDailyLogs = async () => {
    setLoadingLogs(true);
    try {
      let url = `/api/reports/daily-log?date=${logDate}`;
      if (logStatusFilter !== 'all') {
        url += `&status=${logStatusFilter}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDailyLogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else {
      fetchDailyLogs();
    }
  }, [activeTab, period, logDate, logStatusFilter]);

  // Export Daily Log to CSV
  const exportDailyLogsToCSV = () => {
    if (dailyLogs.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor.');
      return;
    }

    const headers = ['No Order', 'Meja', 'Waktu', 'Status Bayar', 'Status Order', 'Subtotal', 'Diskon', 'Total Akhir', 'Kasir', 'Daftar Item'];
    const rows = dailyLogs.map(l => [
      l.order_number,
      l.table_label || `Meja ${l.table_number}`,
      `"${formatDateTime(l.created_at)}"`,
      l.payment_status,
      l.status,
      l.subtotal,
      l.discount_amount,
      l.total_amount,
      l.cashier_name || 'Kasir',
      `"${l.items?.map(i => `${i.item_name} (x${i.quantity})`).join('; ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log-Transaksi-${logDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <BarChart3 size={26} className="text-amber-800" />
              <span>Laporan Penjualan & Transaksi Harian</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Statistik pendapatan, analisis item terlaris, rincian diskon kategori, serta log audit transaksi harian.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-2xl text-xs font-bold self-start">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'analytics'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analisis Penjualan
            </button>
            <button
              onClick={() => setActiveTab('daily_log')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'daily_log'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Log Transaksi Harian
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: ANALISIS PENJUALAN DENGAN CHART & BREAKDOWN */}
        {/* ============================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Period Filter Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">Rentang Waktu:</span>
                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { id: 'today', label: 'Hari Ini' },
                    { id: 'week', label: '7 Hari Terakhir' },
                    { id: 'month', label: '30 Hari Terakhir' },
                    { id: 'year', label: '1 Tahun' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id)}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        period === p.id ? 'bg-amber-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition no-print"
              >
                <Printer size={14} /> Cetak Laporan
              </button>
            </div>

            {loadingAnalytics ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !analyticsData ? (
              <p className="text-center text-xs text-gray-500 py-12">Gagal memuat data analitik.</p>
            ) : (
              <>
                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Pendapatan Bersih
                    </span>
                    <p className="text-xl font-black text-emerald-800 mt-1">
                      {formatRupiah(analyticsData.summary?.final_net_sales)}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Setelah refund & diskon</span>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Penjualan Kotor
                    </span>
                    <p className="text-xl font-black text-gray-900 mt-1">
                      {formatRupiah(analyticsData.summary?.gross_revenue)}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Sebelum potongan</span>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Jumlah Order Selesai
                    </span>
                    <p className="text-xl font-black text-amber-900 mt-1">
                      {analyticsData.summary?.paid_orders_count}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Transaksi dibayar</span>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Total Diskon
                    </span>
                    <p className="text-xl font-black text-amber-700 mt-1">
                      {formatRupiah(analyticsData.summary?.total_discounts)}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Potongan harga</span>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Total Refund Cash
                    </span>
                    <p className="text-xl font-black text-purple-700 mt-1">
                      {formatRupiah(analyticsData.summary?.total_refunds)}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{analyticsData.summary?.refund_count}x pengembalian</span>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Order Void
                    </span>
                    <p className="text-xl font-black text-rose-600 mt-1">
                      {formatRupiah(analyticsData.summary?.voided_amount)}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{analyticsData.summary?.voided_orders_count} pesanan batal</span>
                  </div>
                </div>

                {/* Section 2: Best Sellers & Category Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Selling Items (Col 6) */}
                  <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Coffee size={18} className="text-amber-800" />
                      <span>Item Menu Terlaris (Best Sellers)</span>
                    </h3>

                    {analyticsData.best_sellers?.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">Belum ada data penjualan.</p>
                    ) : (
                      <div className="space-y-3">
                        {analyticsData.best_sellers?.map((item, idx) => {
                          const maxQty = analyticsData.best_sellers[0]?.total_qty || 1;
                          const percent = Math.round((item.total_qty / maxQty) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-800">{item.item_name}</span>
                                <span className="font-extrabold text-amber-900">
                                  {item.total_qty} porsi &bull; {formatRupiah(item.total_sales)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-amber-700 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Revenue by Category (Col 6) */}
                  <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-amber-800" />
                      <span>Pendapatan Berdasarkan Kategori</span>
                    </h3>

                    {analyticsData.category_revenue?.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center">Belum ada data pendapatan.</p>
                    ) : (
                      <div className="space-y-3">
                        {analyticsData.category_revenue?.map((cat, idx) => {
                          const totalAll = analyticsData.category_revenue.reduce((a, b) => a + b.total_sales, 0) || 1;
                          const percent = Math.round((cat.total_sales / totalAll) * 100);
                          return (
                            <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                              <div>
                                <p className="font-bold text-gray-900 text-xs">{cat.category_name}</p>
                                <p className="text-[10px] text-gray-500">{percent}% dari total omset</p>
                              </div>
                              <span className="font-black text-sm text-gray-900">
                                {formatRupiah(cat.total_sales)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Detailed Discount Breakdown (Prompt Requirement 9 & 14) */}
                <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
                  <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Percent size={18} className="text-amber-800" />
                    <span>Rincian Diskon per Kategori (Diskon Karyawan, Owner, Member, Promo)</span>
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Audit lengkap nominal diskon yang telah diberikan staf kasir kepada pelanggan atau internal.
                  </p>

                  {analyticsData.discount_breakdown?.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">Tidak ada diskon yang diberikan pada periode ini.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {analyticsData.discount_breakdown?.map((disc, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                          <span className="text-xs font-bold text-amber-900 block">{disc.category_name}</span>
                          <span className="text-xl font-black text-amber-950 mt-1 block">
                            {formatRupiah(disc.total_amount)}
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">
                            Diberikan sebanyak {disc.count} kali
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: LOG TRANSAKSI HARIAN */}
        {/* ============================================================= */}
        {activeTab === 'daily_log' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-gray-500" />
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="p-2 text-xs font-bold bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>

                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="p-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl"
                >
                  <option value="all">Semua Status Bayar</option>
                  <option value="dibayar">Sudah Dibayar</option>
                  <option value="menunggu">Menunggu Konfirmasi</option>
                  <option value="refunded">Refunded</option>
                  <option value="voided">Voided (Batal)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportDailyLogsToCSV}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download size={14} />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            {loadingLogs ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : dailyLogs.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-12">
                Tidak ada data transaksi pada tanggal {formatDate(logDate)}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                      <th className="pb-3">No. Order</th>
                      <th className="pb-3">Meja</th>
                      <th className="pb-3">Waktu</th>
                      <th className="pb-3">Item Pesanan</th>
                      <th className="pb-3">Diskon</th>
                      <th className="pb-3">Total Tagihan</th>
                      <th className="pb-3">Status Bayar</th>
                      <th className="pb-3">Kasir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 font-mono font-bold text-gray-900">
                          #{log.order_number}
                        </td>
                        <td className="py-3 font-semibold text-gray-800">
                          {log.table_label || `Meja ${log.table_number}`}
                        </td>
                        <td className="py-3 text-gray-500">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 text-gray-700 max-w-xs">
                          {log.items?.map((it, i) => (
                            <span key={i} className="inline-block bg-gray-100 px-1.5 py-0.5 rounded-md text-[10px] mr-1 mb-1 font-medium">
                              {it.item_name} x{it.quantity}
                            </span>
                          ))}
                        </td>
                        <td className="py-3 font-bold text-amber-800">
                          {Number(log.discount_amount) > 0 ? `- ${formatRupiah(log.discount_amount)}` : '-'}
                        </td>
                        <td className="py-3 font-extrabold text-gray-900 text-sm">
                          {formatRupiah(log.total_amount)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.payment_status === 'dibayar' ? 'bg-emerald-100 text-emerald-800' :
                            log.payment_status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                            log.payment_status === 'voided' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {log.payment_status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600 font-medium">
                          {log.cashier_name || 'Kasir'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
