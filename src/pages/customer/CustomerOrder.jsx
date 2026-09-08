import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Plus,
  Minus,
  Search,
  Coffee,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  X,
  AlertTriangle
} from 'lucide-react';

export default function CustomerOrder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { branding } = useBranding();

  const tableParam = searchParams.get('table');
  const [tableNumber, setTableNumber] = useState(tableParam ? parseInt(tableParam) : 1);

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart: Array of { menuItem, quantity, notes }
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Item detail drawer
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalNotes, setModalNotes] = useState('');

  // Checkout modal
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, menuRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/menu')
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (menuRes.ok) setMenuItems(await menuRes.json());
      } catch (err) {
        console.error('Error fetching menu data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchCategory = selectedCategory === 'all' || String(item.category_id) === String(selectedCategory);
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  // Open item modal
  const openItemModal = (item) => {
    if (!item.is_available) return;
    setSelectedItemForModal(item);
    setModalQty(1);
    setModalNotes('');
  };

  // Add to cart from modal
  const handleAddToCart = () => {
    if (!selectedItemForModal) return;

    setCart(prev => {
      // If item with same ID and same notes already exists, increment qty
      const existingIdx = prev.findIndex(
        ci => ci.menu_item_id === selectedItemForModal.id && ci.notes === modalNotes
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += modalQty;
        return updated;
      }
      return [
        ...prev,
        {
          menu_item_id: selectedItemForModal.id,
          name: selectedItemForModal.name,
          price: selectedItemForModal.price,
          image_url: selectedItemForModal.image_url,
          quantity: modalQty,
          notes: modalNotes
        }
      ];
    });

    setSelectedItemForModal(null);
  };

  const updateCartQty = (idx, delta) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  // Submit order
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber,
          customer_name: customerName || 'Pelanggan Meja ' + tableNumber,
          customer_notes: customerNotes,
          items: cart.map(c => ({
            menu_item_id: c.menu_item_id,
            quantity: c.quantity,
            notes: c.notes
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal mengirim pesanan.');
        return;
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // Clear cart and redirect to order tracker
      setCart([]);
      setIsCartOpen(false);
      navigate(`/order/track/${data.order_number}`);
    } catch (err) {
      alert('Terjadi kesalahan koneksi server.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-xl border border-amber-100"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: branding?.primary_color || '#78350F' }}
              >
                <Coffee size={20} />
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900 leading-tight text-sm sm:text-base">
                {branding?.cafe_name || 'Kopi Senja Nusantara'}
              </h1>
              <p className="text-xs text-gray-500">Pesan langsung dari tempat duduk</p>
            </div>
          </div>

          {/* Table Badge & Selector */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-amber-800 font-semibold">Nomor Meja:</span>
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(parseInt(e.target.value))}
              className="bg-transparent font-bold text-sm text-amber-950 focus:outline-hidden cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                <option key={n} value={n}>Meja {n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kopi, makanan, snack favorit..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100/80 rounded-xl text-xs sm:text-sm border-0 focus:ring-2 focus:ring-amber-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Category Pills (Horizontal Scroll) */}
        <div className="max-w-4xl mx-auto px-4 pb-2.5 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
              selectedCategory === 'all'
                ? 'text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={selectedCategory === 'all' ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
          >
            Semua Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                selectedCategory === cat.id
                  ? 'text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedCategory === cat.id ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Menu Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Menyiapkan daftar menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 text-gray-500">
            <Coffee size={40} className="mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-700">Tidak ada menu yang cocok</p>
            <p className="text-xs mt-1">Coba gunakan kata kunci pencarian lain atau pilih kategori berbeda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openItemModal(item)}
                className={`bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-xs hover:shadow-md transition flex flex-col justify-between cursor-pointer group ${
                  !item.is_available ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <div>
                  <div className="relative aspect-4/3 rounded-xl overflow-hidden mb-3 bg-gray-100">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-md">
                          Habis
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-amber-800 transition">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="font-extrabold text-gray-900 text-sm">
                    {formatRupiah(item.price)}
                  </span>
                  <button
                    disabled={!item.is_available}
                    className="p-1.5 rounded-xl text-white shadow-xs transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: branding?.primary_color || '#78350F' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-4">
          <div
            onClick={() => setIsCartOpen(true)}
            className="p-3.5 sm:p-4 rounded-2xl text-white shadow-2xl flex items-center justify-between cursor-pointer transition hover:scale-[1.01]"
            style={{ backgroundColor: branding?.primary_color || '#78350F' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
              <div>
                <span className="text-xs font-medium text-amber-200">
                  {totalCartCount} Item &bull; Meja {tableNumber}
                </span>
                <p className="text-base font-extrabold leading-none mt-0.5">
                  {formatRupiah(cartSubtotal)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-gray-900 font-bold text-xs shadow-xs">
              <span>Lihat Pesanan</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      )}

      {/* Item Detail / Add Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="relative aspect-16/9 bg-gray-100">
              <img
                src={selectedItemForModal.image_url}
                alt={selectedItemForModal.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900">{selectedItemForModal.name}</h2>
              <p className="text-xs text-gray-500 mt-1">{selectedItemForModal.description}</p>
              <p className="text-base font-extrabold text-amber-900 mt-2">
                {formatRupiah(selectedItemForModal.price)}
              </p>

              {/* Custom Notes */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan Khusus (Opsional):
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Misal: Kurang manis, tanpa es batu, sambal dipisah..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-600 focus:bg-white"
                />
              </div>

              {/* Quantity Selector & Add Button */}
              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-gray-100 px-3 py-1.5 rounded-xl">
                  <button
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-700"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-sm w-6 text-center">{modalQty}</span>
                  <button
                    onClick={() => setModalQty(modalQty + 1)}
                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-md text-sm transition"
                  style={{ backgroundColor: branding?.primary_color || '#78350F' }}
                >
                  Tambah &bull; {formatRupiah(selectedItemForModal.price * modalQty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer & Checkout Confirmation */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
            {/* Cart Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-amber-800" />
                <h2 className="font-bold text-gray-900 text-base">Keranjang Meja #{tableNumber}</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                    <p className="text-xs font-semibold text-amber-900 mt-0.5">
                      {formatRupiah(item.price)}
                    </p>
                    {item.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-1 bg-white p-1 rounded-md border border-gray-100">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-gray-200">
                    <button
                      onClick={() => updateCartQty(idx, -1)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(idx, 1)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Cash-Only Notice Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <Info size={16} className="shrink-0 text-amber-700 mt-0.5" />
                <p leading-relaxed>
                  <strong>Metode Pembayaran: Tunai (Cash).</strong> Setelah pesanan dikirim, status pesanan akan masuk ke antrian kasir. Silakan datang ke kasir untuk membayar tunai sebelum pesanan diproses di dapur.
                </p>
              </div>

              {/* Customer Name & Order Notes */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Pemesan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Misal: Andi / Maya"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Catatan Pesanan Meja:
                  </label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Misal: Jangan pakai kantong plastik..."
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-gray-600 font-medium">Subtotal Pembayaran:</span>
                <span className="text-lg font-black text-gray-900">{formatRupiah(cartSubtotal)}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={submittingOrder}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: branding?.primary_color || '#78350F' }}
              >
                {submittingOrder ? (
                  <span>Mengirim Pesanan...</span>
                ) : (
                  <>
                    <span>Kirim Pesanan ke Kasir</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
