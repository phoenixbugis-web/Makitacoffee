import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Tag,
  FileSpreadsheet,
  Calendar,
  Filter,
  Users,
  Award,
  Sparkles,
  TrendingDown,
  Info
} from 'lucide-react';

export default function AdminDiscounts() {
  const { token, user } = useAuth();
  const { branding } = useBranding();

  // Tabs: 'categories' | 'history' | 'recap'
  const [activeTab, setActiveTab] = useState('categories');

  // Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [historyByCategory, setHistoryByCategory] = useState([]);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal Add / Edit Category
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDiscountType, setCatDiscountType] = useState('percent');
  const [catDiscountValue, setCatDiscountValue] = useState('10');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/discounts/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load discount categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      let url = '/api/discounts/history?';
      if (historyCategoryFilter !== 'all') url += `&category_id=${historyCategoryFilter}`;
      if (historyDateFilter) url += `&date=${historyDateFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
        setHistoryStats(data.stats || null);
        setHistoryByCategory(data.byCategory || []);
      }
    } catch (err) {
      console.error('Failed to load discount history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchHistory();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'recap') {
      fetchHistory();
    }
  }, [activeTab, historyCategoryFilter, historyDateFilter]);

  const openAddModal = () => {
    setEditingCat(null);
    setCatName('');
    setCatDiscountType('percent');
    setCatDiscountValue('10');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDiscountType(cat.discount_type || 'percent');
    setCatDiscountValue(String(cat.discount_value !== undefined ? cat.discount_value : 10));
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSaving(true);
    try {
      const url = editingCat ? `/api/discounts/categories/${editingCat.id}` : '/api/discounts/categories';
      const method = editingCat ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: catName.trim(),
          discount_type: catDiscountType,
          discount_value: Number(catDiscountValue) || 0
        })
      });

      if (res.ok) {
        setModalOpen(false);
        fetchCategories();
        fetchHistory();
      } else {
        alert('Gagal menyimpan kategori diskon.');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori diskon ini?')) return;
    try {
      const res = await fetch(`/api/discounts/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCategories();
        fetchHistory();
      }
    } catch (err) {
      alert('Gagal menghapus kategori diskon.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: branding?.primary_color || '#78350F' }}>
                <Percent size={22} />
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Manajemen Diskon Manual & Audit
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Kelola kategori diskon (Diskon Karyawan, Owner, Member, Promo) dan pantau jejak audit pemakaian potongan harga kasir.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 self-start"
              style={{ backgroundColor: branding?.primary_color || '#78350F' }}
            >
              <Plus size={16} />
              <span>Tambah Kategori Diskon</span>
            </button>
          </div>
        </div>

        {/* Informational Policy Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Kebijakan Diskon Cafe:</strong> Saat pesanan diproses di kasir atau checkout, kasir/admin dapat memilih kategori diskon di bawah ini dan <strong>mengisi sendiri nilai diskonnya secara bebas</strong> (baik dalam bentuk <em>persentase %</em> maupun <em>nominal Rupiah</em>). Sistem tidak mengunci angka tetap, sehingga fleksibel sesuai situasi dan sepenuhnya tercatat di audit log.
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
              Total Potongan Diskon
            </span>
            <p className="text-xl font-black text-amber-900 mt-1">
              {formatRupiah(historyStats?.total_discount_amount || 0)}
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Akumulasi seluruh transaksi</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
              Total Order Berdiskon
            </span>
            <p className="text-xl font-black text-gray-900 mt-1">
              {historyStats?.total_discount_count || 0} Kali
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Penggunaan diskon kasir</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
              Kategori Diskon Aktif
            </span>
            <p className="text-xl font-black text-emerald-700 mt-1">
              {categories.length} Kategori
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Siap dipilih di kasir POS</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
              Rata-rata Diskon
            </span>
            <p className="text-xl font-black text-purple-700 mt-1">
              {formatRupiah(
                historyStats?.total_discount_count > 0
                  ? Math.round(historyStats.total_discount_amount / historyStats.total_discount_count)
                  : 0
              )}
            </p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">Per transaksi berdiskon</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-2xl text-xs font-bold self-start w-fit">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Tag size={14} />
            <span>Kategori Diskon ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History size={14} />
            <span>Audit Log Pemakaian Diskon</span>
          </button>

          <button
            onClick={() => setActiveTab('recap')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'recap'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingDown size={14} />
            <span>Rekapitulasi per Kategori</span>
          </button>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: DAFTAR KATEGORI DISKON (CRUD) */}
        {/* ============================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-gray-100 gap-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Tag size={18} className="text-amber-800" />
                    <span>Daftar Kategori / Alasan Diskon</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Kategori ini otomatis muncul sebagai pilihan saat kasir atau admin menerapkan diskon manual.
                  </p>
                </div>
                <span className="text-xs text-gray-500 font-semibold">
                  {categories.length} kategori terdaftar
                </span>
              </div>

              {loadingCategories ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-10">Belum ada kategori diskon.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat) => {
                    const usageCount = historyByCategory.find(c => c.category_name === cat.name)?.count || 0;
                    const totalNominal = historyByCategory.find(c => c.category_name === cat.name)?.total_amount || 0;

                    return (
                      <div
                        key={cat.id}
                        className="p-5 bg-gray-50 hover:bg-amber-50/50 rounded-3xl border border-gray-200 transition flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                                {cat.discount_type === 'nominal' ? 'Rp' : '%'}
                              </span>
                              <div>
                                <h3 className="font-extrabold text-sm text-gray-900">{cat.name}</h3>
                                <span className="text-[10px] text-gray-400 font-mono">ID: #{cat.id}</span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Aktif
                            </span>
                          </div>

                          {/* Nilai Diskon Default */}
                          <div className="mt-3 p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900">Besaran Diskon:</span>
                            <span className="text-xs font-black text-amber-950 bg-white px-2 py-0.5 rounded-lg shadow-2xs">
                              {cat.discount_type === 'nominal' ? formatRupiah(cat.discount_value || 0) : `${cat.discount_value || 0}%`}
                            </span>
                          </div>

                          <div className="my-2.5 p-2.5 rounded-xl bg-white border border-gray-100 text-[11px] text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Frekuensi Terpakai:</span>
                              <strong className="text-gray-900">{usageCount} kali</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Terpotong:</span>
                              <strong className="text-amber-900">{formatRupiah(totalNominal)}</strong>
                            </div>
                          </div>

                          <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <span>✓</span>
                            <span>Otomatis terisi di POS saat kasir memilih kategori ini.</span>
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-amber-800 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1"
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: AUDIT LOG PEMAKAIAN DISKON */}
        {/* ============================================================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <History size={18} className="text-amber-800" />
                  <span>Audit Log Riwayat Pemakaian Diskon</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Seluruh pemotongan harga dicatat transparan: nilai input, nama kasir, order terkait, dan waktu.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                  className="p-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl"
                >
                  <option value="all">Semua Kategori Diskon</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="p-2 text-xs font-bold bg-gray-50 border border-gray-300 rounded-xl"
                />
                {historyDateFilter && (
                  <button
                    onClick={() => setHistoryDateFilter('')}
                    className="p-2 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
                  >
                    Reset Tanggal
                  </button>
                )}
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : historyList.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-12">
                Tidak ada data pemakaian diskon dengan filter saat ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                      <th className="pb-3">No. Order</th>
                      <th className="pb-3">Meja</th>
                      <th className="pb-3">Kategori Diskon</th>
                      <th className="pb-3">Nilai Diinput</th>
                      <th className="pb-3">Total Potongan (IDR)</th>
                      <th className="pb-3">Total Akhir Order</th>
                      <th className="pb-3">Diterapkan Oleh</th>
                      <th className="pb-3">Waktu Transaksi</th>
                      <th className="pb-3">Catatan Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 font-mono font-bold text-gray-900">
                          #{item.order_number}
                        </td>
                        <td className="py-3 font-semibold text-gray-800">
                          {item.table_label || `Meja ${item.table_number}`}
                        </td>
                        <td className="py-3">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold text-[11px] border border-amber-200">
                            {item.category_name}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-gray-800">
                          {item.type === 'percent' ? `${item.value}%` : formatRupiah(item.value)}
                        </td>
                        <td className="py-3 font-black text-emerald-800 text-sm">
                          - {formatRupiah(item.calculated_amount)}
                        </td>
                        <td className="py-3 font-bold text-gray-900">
                          {formatRupiah(item.total_amount)}
                        </td>
                        <td className="py-3 text-gray-700 font-semibold">
                          {item.applied_by_name || 'Kasir'}
                        </td>
                        <td className="py-3 text-gray-500">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="py-3 text-gray-500 italic max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: REKAPITULASI PER KATEGORI DISKON */}
        {/* ============================================================= */}
        {activeTab === 'recap' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingDown size={18} className="text-amber-800" />
              <span>Rekapitulasi Total Diskon Diberikan per Kategori</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Perbandingan total potongan harga antara Diskon Karyawan, Diskon Owner, Diskon Member, dan Diskon Promo.
            </p>

            {historyByCategory.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Belum ada data diskon tercatat.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyByCategory.map((cat, idx) => {
                  const maxAmt = historyByCategory[0]?.total_amount || 1;
                  const percent = Math.round((cat.total_amount / maxAmt) * 100);

                  return (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900">{cat.category_name}</span>
                        <span className="text-xs text-gray-500 font-semibold">{cat.count} kali transaksi</span>
                      </div>
                      <div className="text-xl font-black text-amber-950">
                        {formatRupiah(cat.total_amount)}
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-800 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Add/Edit Discount Category */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editingCat ? 'Edit Kategori Diskon' : 'Tambah Kategori Diskon'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="my-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Kategori Diskon:</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Misal: Diskon Komunitas Motor"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-600 focus:bg-white"
                />
              </div>

              {/* Tipe Diskon */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tipe Diskon Otomatis:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatDiscountType('percent')}
                    className={`py-2 text-center rounded-xl font-bold transition ${
                      catDiscountType === 'percent'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatDiscountType('nominal')}
                    className={`py-2 text-center rounded-xl font-bold transition ${
                      catDiscountType === 'nominal'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Nominal Rupiah (Rp)
                  </button>
                </div>
              </div>

              {/* Nilai Diskon */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Jumlah Diskon ({catDiscountType === 'percent' ? '%' : 'Rp'}):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max={catDiscountType === 'percent' ? 100 : 10000000}
                  value={catDiscountValue}
                  onChange={(e) => setCatDiscountValue(e.target.value)}
                  placeholder={catDiscountType === 'percent' ? 'Contoh: 15' : 'Contoh: 15000'}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-black text-sm focus:ring-2 focus:ring-amber-600 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                <span className="font-bold">Otomatisasi Kasir:</span> Kasir cukup memilih kategori ini di POS, dan diskon sebesar{' '}
                <strong>
                  {catDiscountType === 'nominal'
                    ? formatRupiah(Number(catDiscountValue) || 0)
                    : `${catDiscountValue || 0}%`}
                </strong>{' '}
                akan langsung terisi secara otomatis tanpa kasir perlu mengetik ulang nominal.
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !catName.trim()}
                  className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
