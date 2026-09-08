import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah } from '../../utils/formatters';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Search,
  X
} from 'lucide-react';

export default function AdminMenu() {
  const { token } = useAuth();
  const { branding } = useBranding();

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Menu Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: 1
  });
  const [imageFile, setImageFile] = useState(null);
  const [savingItem, setSavingItem] = useState(false);

  // Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const fetchMenuAndCategories = async () => {
    try {
      const [catRes, menuRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu')
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (menuRes.ok) setMenuItems(await menuRes.json());
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndCategories();
  }, []);

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      category_id: categories[0]?.id || '',
      name: '',
      description: '',
      price: '',
      image_url: '',
      is_available: 1
    });
    setImageFile(null);
    setItemModalOpen(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      image_url: item.image_url || '',
      is_available: item.is_available
    });
    setImageFile(null);
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSavingItem(true);
    try {
      const formData = new FormData();
      formData.append('category_id', itemForm.category_id);
      formData.append('name', itemForm.name);
      formData.append('description', itemForm.description);
      formData.append('price', itemForm.price);
      formData.append('is_available', itemForm.is_available);
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (itemForm.image_url) {
        formData.append('image_url', itemForm.image_url);
      }

      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menyimpan menu.');
        return;
      }

      setItemModalOpen(false);
      fetchMenuAndCategories();
    } catch (err) {
      alert('Terjadi kesalahan.');
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const res = await fetch(`/api/menu/${item.id}/toggle-available`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMenuAndCategories();
      }
    } catch (err) {
      alert('Gagal mengubah ketersediaan.');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item menu ini?')) return;
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMenuAndCategories();
      }
    } catch (err) {
      alert('Gagal menghapus item menu.');
    }
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;
    setSavingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: catName, display_order: categories.length + 1 })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menambah kategori.');
        return;
      }
      setCatName('');
      setCatModalOpen(false);
      fetchMenuAndCategories();
    } catch (err) {
      alert('Terjadi kesalahan.');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Hapus kategori ini? Kategori yang masih memiliki menu tidak dapat dihapus.')) return;
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus kategori.');
        return;
      }
      fetchMenuAndCategories();
    } catch (err) {
      alert('Gagal menghapus kategori.');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCategoryFilter === 'all' || String(item.category_id) === String(selectedCategoryFilter);
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <UtensilsCrossed size={26} className="text-amber-800" />
              <span>Manajemen Menu & Kategori</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Atur daftar kuliner, harga Rupiah, foto produk, dan toggle status ketersediaan (Tersedia/Habis).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCatModalOpen(true)}
              className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-xl text-xs font-bold shadow-xs hover:bg-gray-50 transition flex items-center gap-1.5"
            >
              <FolderPlus size={16} />
              <span>Tambah Kategori</span>
            </button>
            <button
              onClick={openAddItemModal}
              className="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
              style={{ backgroundColor: branding?.primary_color || '#78350F' }}
            >
              <Plus size={16} />
              <span>Tambah Menu Baru</span>
            </button>
          </div>
        </div>

        {/* Categories Bar & Search Filter */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-amber-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua ({menuItems.length})
            </button>
            {categories.map((cat) => (
              <div key={cat.id} className="relative group shrink-0 flex items-center">
                <button
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-amber-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  title="Hapus Kategori"
                  className="hidden group-hover:block ml-1 p-1 text-gray-400 hover:text-rose-600"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari item menu..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-700"
            />
          </div>
        </div>

        {/* Menu Items Table / Grid */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-12">Tidak ada item menu yang ditemukan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="pb-3">Menu</th>
                    <th className="pb-3">Kategori</th>
                    <th className="pb-3">Harga (IDR)</th>
                    <th className="pb-3">Ketersediaan</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60'}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-gray-100"
                          />
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                            <p className="text-gray-500 text-[11px] line-clamp-1 max-w-xs">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold text-[11px]">
                          {item.category_name}
                        </span>
                      </td>
                      <td className="py-3 font-extrabold text-gray-900 text-sm">
                        {formatRupiah(item.price)}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition ${
                            item.is_available
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {item.is_available ? (
                            <>
                              <CheckCircle2 size={13} /> Tersedia
                            </>
                          ) : (
                            <>
                              <XCircle size={13} /> Habis (Kosong)
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 text-gray-600 hover:text-amber-800 hover:bg-gray-100 rounded-lg transition"
                          title="Edit Menu"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Menu"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Item Modal (Create/Edit) */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editingItem ? 'Edit Item Menu' : 'Tambah Menu Baru'}
              </h2>
              <button onClick={() => setItemModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="my-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Kategori Menu:</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-xs"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Menu:</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Contoh: Kopi Susu Senja Gula Aren"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Harga (Rupiah):</label>
                <input
                  type="number"
                  required
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="Contoh: 25000"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deskripsi Hidangan:</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ceritakan cita rasa, bahan baku, atau takaran..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Foto Menu:</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-900 hover:file:bg-amber-100"
                  />
                  <span className="text-[10px] text-gray-400 block">Atau gunakan URL / path gambar:</span>
                  <input
                    type="text"
                    value={itemForm.image_url}
                    onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/... atau /uploads/..."
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Status Ketersediaan:</label>
                <select
                  value={itemForm.is_available}
                  onChange={(e) => setItemForm({ ...itemForm, is_available: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-xs"
                >
                  <option value={1}>Tersedia (Ready to Order)</option>
                  <option value={0}>Habis (Stok Kosong)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md"
                >
                  {savingItem ? 'Menyimpan...' : 'Simpan Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">Tambah Kategori Baru</h2>
            <form onSubmit={handleAddCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Kategori:</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Misal: Artisan Tea / Mocktail"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingCat || !catName}
                  className="flex-1 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md"
                >
                  {savingCat ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
