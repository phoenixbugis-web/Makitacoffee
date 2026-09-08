import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import ThermalReceipt from '../../components/ThermalReceipt';
import {
  ReceiptText,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Printer,
  FileText,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Ban,
  Percent,
  Plus
} from 'lucide-react';

export default function CashierShift() {
  const { user, token } = useAuth();
  const { branding } = useBranding();

  const [activeShift, setActiveShift] = useState(null);
  const [shiftStats, setShiftStats] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Open Shift Form
  const [startingCash, setStartingCash] = useState('200000');
  const [openShiftNotes, setOpenShiftNotes] = useState('');
  const [openingShift, setOpeningShift] = useState(false);

  // Close Shift Form
  const [endingCashActual, setEndingCashActual] = useState('');
  const [closeShiftNotes, setCloseShiftNotes] = useState('');
  const [closingShift, setClosingShift] = useState(false);

  // Z-Report Modal
  const [zReportModal, setZReportModal] = useState({
    isOpen: false,
    data: null
  });

  const fetchShiftData = async () => {
    try {
      const [curRes, histRes] = await Promise.all([
        fetch('/api/shifts/current', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/shifts/history', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (curRes.ok) {
        const data = await curRes.json();
        setActiveShift(data.active_shift);
        setShiftStats(data.stats);
      }
      if (histRes.ok) {
        setShiftHistory(await histRes.json());
      }
    } catch (err) {
      console.error('Failed to load shift data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [token]);

  // Open shift
  const handleOpenShift = async (e) => {
    e.preventDefault();
    setOpeningShift(true);
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          starting_cash: Number(startingCash),
          notes: openShiftNotes
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal membuka shift.');
        return;
      }
      alert('Shift kasir berhasil dibuka!');
      fetchShiftData();
    } catch (err) {
      alert('Terjadi kesalahan.');
    } finally {
      setOpeningShift(false);
    }
  };

  // Close shift
  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!endingCashActual || Number(endingCashActual) < 0) {
      alert('Masukkan jumlah uang fisik di laci kasir.');
      return;
    }

    setClosingShift(true);
    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ending_cash_actual: Number(endingCashActual),
          notes: closeShiftNotes
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menutup shift.');
        return;
      }

      alert('Shift kasir berhasil ditutup (Tutup Buku / Z-Report selesai)!');

      // Fetch Z-Report for thermal print
      const zRes = await fetch(`/api/shifts/${activeShift.id}/z-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (zRes.ok) {
        const zData = await zRes.json();
        setZReportModal({ isOpen: true, data: zData });
      }

      fetchShiftData();
    } catch (err) {
      alert('Terjadi kesalahan saat menutup shift.');
    } finally {
      setClosingShift(false);
    }
  };

  // View past Z-Report
  const handleViewZReport = async (shiftId) => {
    try {
      const res = await fetch(`/api/shifts/${shiftId}/z-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZReportModal({ isOpen: true, data });
      }
    } catch (err) {
      alert('Gagal mengambil laporan Z-Report.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <ReceiptText size={26} className="text-amber-800" />
              <span>Pembukuan Shift Kasir & Tutup Buku (Z-Report)</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Rekonsiliasi uang kas di laci, hitung fisik tunai, deteksi selisih, dan cetak Z-Report thermal.
            </p>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 1. STATUS SHIFT AKTIF ATAU FORM BUKA SHIFT */}
        {/* ============================================================= */}
        {activeShift ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Shift Kasir Sedang Aktif
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  Shift #{activeShift.id} &bull; Kasir: {activeShift.cashier_name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dibuka pada: {formatDateTime(activeShift.opened_at)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-right">
                  <span className="text-[11px] text-amber-800 font-bold block">Modal Awal Kas:</span>
                  <span className="text-lg font-black text-amber-950">
                    {formatRupiah(activeShift.starting_cash)}
                  </span>
                </div>
              </div>
            </div>

            {/* Live KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 my-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block">Total Penjualan Cash:</span>
                <span className="text-lg font-black text-gray-900 mt-1 block">
                  {formatRupiah(shiftStats?.total_sales)}
                </span>
                <span className="text-[10px] text-gray-400">
                  {shiftStats?.total_orders} order dibayar
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block">Total Refund Cash:</span>
                <span className="text-lg font-black text-purple-700 mt-1 block">
                  {formatRupiah(shiftStats?.refund_total)}
                </span>
                <span className="text-[10px] text-gray-400">Pengembalian uang</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block">Total Diskon Diberikan:</span>
                <span className="text-lg font-black text-amber-800 mt-1 block">
                  {formatRupiah(shiftStats?.total_discount)}
                </span>
                <span className="text-[10px] text-gray-400">Audit potongan</span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs text-gray-500 block">Total Order Void:</span>
                <span className="text-lg font-black text-rose-600 mt-1 block">
                  {formatRupiah(shiftStats?.void_total)}
                </span>
                <span className="text-[10px] text-gray-400">Order dibatalkan</span>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 col-span-2 sm:col-span-1">
                <span className="text-xs text-amber-800 font-bold block">Uang Kas Seharusnya Ada:</span>
                <span className="text-xl font-black text-amber-950 mt-1 block">
                  {formatRupiah(shiftStats?.expected_cash)}
                </span>
                <span className="text-[10px] text-amber-700">(Modal + Penjualan - Refund)</span>
              </div>
            </div>

            {/* Close Shift / End-of-Day Form */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <DollarSign size={18} className="text-amber-800" />
                <span>Formulir Tutup Shift (End of Day / Z-Report)</span>
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Hitung uang fisik di laci kasir (uang kertas & koin). Masukkan jumlahnya di bawah untuk rekonsiliasi dan menghitung selisih (Lebih/Kurang/Pas).
              </p>

              <form onSubmit={handleCloseShift} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hasil Hitung Kas Fisik (Rp):
                  </label>
                  <input
                    type="number"
                    required
                    value={endingCashActual}
                    onChange={(e) => setEndingCashActual(e.target.value)}
                    placeholder="Misal: 1250000"
                    className="w-full p-3 text-base font-black bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan Kasir (Opsional):
                  </label>
                  <input
                    type="text"
                    value={closeShiftNotes}
                    onChange={(e) => setCloseShiftNotes(e.target.value)}
                    placeholder="Misal: Pecahan 100k: 5 lbr, 50k: 10 lbr..."
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={closingShift || !endingCashActual}
                    className="w-full py-3.5 px-4 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ReceiptText size={16} />
                    <span>{closingShift ? 'Memproses...' : 'Tutup Shift & Cetak Z-Report'}</span>
                  </button>
                </div>
              </form>

              {/* Live Preview Difference if user typed endingCash */}
              {endingCashActual && (
                <div className="mt-4 p-4 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-600">Perhitungan Selisih:</span>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Kas Fisik ({formatRupiah(endingCashActual)}) - Kas Seharusnya ({formatRupiah(shiftStats?.expected_cash)})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 font-medium block">Selisih:</span>
                    <span className={`text-base font-black ${
                      Number(endingCashActual) - shiftStats?.expected_cash < 0
                        ? 'text-rose-600'
                        : Number(endingCashActual) - shiftStats?.expected_cash > 0
                        ? 'text-emerald-700'
                        : 'text-gray-900'
                    }`}>
                      {Number(endingCashActual) - shiftStats?.expected_cash === 0
                        ? 'PAS (Tidak Ada Selisih)'
                        : formatRupiah(Number(endingCashActual) - shiftStats?.expected_cash)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Buka Shift Form */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-md">
            <div className="max-w-xl mx-auto text-center py-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ReceiptText size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900">Mulai Shift Kasir Baru</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md mx-auto">
                Shift kasir belum aktif. Masukkan jumlah uang tunai modal awal (cash float) yang disiapkan di laci kasir untuk uang kembalian.
              </p>

              <form onSubmit={handleOpenShift} className="mt-6 space-y-4 text-left max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Modal Awal Kasir (Rp):
                  </label>
                  <input
                    type="number"
                    required
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    placeholder="Contoh: 200000"
                    className="w-full p-3 text-lg font-black bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:bg-white"
                  />
                  {/* Quick starting cash pills */}
                  <div className="flex gap-2 mt-2">
                    {[100000, 200000, 300000, 500000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStartingCash(String(amt))}
                        className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan Shift (Opsional):
                  </label>
                  <input
                    type="text"
                    value={openShiftNotes}
                    onChange={(e) => setOpenShiftNotes(e.target.value)}
                    placeholder="Misal: Uang pecahan 2k, 5k, 10k lengkap"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={openingShift || !startingCash}
                  className="w-full py-3.5 px-4 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  <span>{openingShift ? 'Membuka Shift...' : 'Konfirmasi Buka Shift Kasir'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* 2. RIWAYAT SHIFT SEBELUMNYA & Z-REPORT */}
        {/* ============================================================= */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Riwayat Shift & Dokumen Z-Report</h2>
            <span className="text-xs text-gray-500">{shiftHistory.length} shift tersimpan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                  <th className="pb-3">Shift ID</th>
                  <th className="pb-3">Kasir</th>
                  <th className="pb-3">Waktu Buka</th>
                  <th className="pb-3">Waktu Tutup</th>
                  <th className="pb-3">Modal Awal</th>
                  <th className="pb-3">Kas Seharusnya</th>
                  <th className="pb-3">Kas Fisik</th>
                  <th className="pb-3">Selisih</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Z-Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shiftHistory.map((sh) => (
                  <tr key={sh.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 font-bold font-mono text-gray-900">#{sh.id}</td>
                    <td className="py-3 font-semibold text-gray-800">{sh.cashier_name}</td>
                    <td className="py-3 text-gray-600">{formatDateTime(sh.opened_at)}</td>
                    <td className="py-3 text-gray-600">{sh.closed_at ? formatDateTime(sh.closed_at) : '-'}</td>
                    <td className="py-3 font-semibold text-gray-800">{formatRupiah(sh.starting_cash)}</td>
                    <td className="py-3 font-semibold text-gray-800">{formatRupiah(sh.expected_cash)}</td>
                    <td className="py-3 font-bold text-gray-900">{formatRupiah(sh.ending_cash_actual)}</td>
                    <td className="py-3">
                      <span className={`font-bold ${
                        Number(sh.cash_difference) < 0 ? 'text-rose-600' :
                        Number(sh.cash_difference) > 0 ? 'text-emerald-700' : 'text-gray-700'
                      }`}>
                        {Number(sh.cash_difference) === 0 ? 'Pas' : formatRupiah(sh.cash_difference)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        sh.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sh.status === 'open' ? 'Aktif' : 'Tutup'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewZReport(sh.id)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold inline-flex items-center gap-1 transition"
                      >
                        <Printer size={13} />
                        <span>Lihat & Cetak</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Z-Report Thermal Modal */}
      {zReportModal.isOpen && (
        <ThermalReceipt
          type="z_report"
          data={zReportModal.data}
          onClose={() => setZReportModal({ isOpen: false, data: null })}
        />
      )}
    </div>
  );
}
