import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { useSocket } from '../../context/SocketContext';
import { formatRupiah, formatDateTime, getElapsedMinutes } from '../../utils/formatters';
import { playCashierDing, playKitchenReadyChime } from '../../utils/audio';
import ThermalReceipt from '../../components/ThermalReceipt';
import confetti from 'canvas-confetti';
import {
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Percent,
  Ban,
  RotateCcw,
  Printer,
  Plus,
  Minus,
  Search,
  Coffee,
  X,
  User,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Edit3,
  Trash2
} from 'lucide-react';

export default function CashierDashboard() {
  const { user, token } = useAuth();
  const { branding } = useBranding();
  const { addListener } = useSocket();

  // Tabs: 'incoming' (Menunggu Konfirmasi), 'manual_order' (Input Walk-in), 'history' (Riwayat Transaksi)
  const [activeTab, setActiveTab] = useState('incoming');

  // Orders lists
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Active shift info
  const [activeShift, setActiveShift] = useState(null);

  // Modals state
  // 1. Payment Confirmation Modal
  const [payingOrder, setPayingOrder] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // 2. Discount Modal
  const [discountOrder, setDiscountOrder] = useState(null);
  const [discountCategories, setDiscountCategories] = useState([]);
  const [selectedDiscountCat, setSelectedDiscountCat] = useState(null);
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'nominal'
  const [discountValue, setDiscountValue] = useState('');
  const [discountNotes, setDiscountNotes] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // 3. Void Modal
  const [voidModalOrder, setVoidModalOrder] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [processingVoid, setProcessingVoid] = useState(false);

  // 4. Refund Modal
  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // 5. Thermal Receipt Modal
  const [receiptModal, setReceiptModal] = useState({
    isOpen: false,
    type: 'customer',
    data: null
  });

  // 6. Edit Order Modal state (Ubah/Tambah/Hapus Menu Antrian)
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editCustomerNotes, setEditCustomerNotes] = useState('');
  const [editSearchMenu, setEditSearchMenu] = useState('');
  const [editSelectedCategory, setEditSelectedCategory] = useState('all');
  const [savingEditOrder, setSavingEditOrder] = useState(false);

  // Manual Walk-in Order state
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [manualTableId, setManualTableId] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCart, setManualCart] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('all');
  const [submittingManualOrder, setSubmittingManualOrder] = useState(false);

  // Fetch orders & data
  const fetchData = async () => {
    try {
      const [incRes, todayRes, shiftRes, catRes, tblRes, menuRes, menuCatRes] = await Promise.all([
        fetch('/api/orders?payment_status=menunggu'),
        fetch('/api/orders?date=' + new Date().toISOString().slice(0, 10)),
        fetch('/api/shifts/current', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/discounts/categories'),
        fetch('/api/tables'),
        fetch('/api/menu?only_available=true'),
        fetch('/api/categories')
      ]);

      if (incRes.ok) setIncomingOrders(await incRes.json());
      if (todayRes.ok) setTodayOrders(await todayRes.json());
      if (shiftRes.ok) {
        const s = await shiftRes.json();
        setActiveShift(s.active_shift);
      }
      if (catRes.ok) setDiscountCategories(await catRes.json());
      if (tblRes.ok) {
        const tblData = await tblRes.json();
        setTables(tblData);
        if (tblData.length > 0 && !manualTableId) setManualTableId(tblData[0].id);
      }
      if (menuRes.ok) setMenuItems(await menuRes.json());
      if (menuCatRes.ok) setMenuCategories(await menuCatRes.json());
    } catch (err) {
      console.error('Failed to load cashier data:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to real-time WebSocket events
    const unsubscribe = addListener((msg) => {
      if (
        msg.type === 'NEW_ORDER' ||
        msg.type === 'PAYMENT_CONFIRMED' ||
        msg.type === 'ORDER_STATUS_CHANGED' ||
        msg.type === 'ORDER_UPDATED' ||
        msg.type === 'ORDER_VOIDED' ||
        msg.type === 'ORDER_REFUNDED'
      ) {
        fetchData();
      }
    });

    return () => unsubscribe();
  }, [token]);

  // Open Payment Confirmation Modal
  const openPaymentModal = (order) => {
    setPayingOrder(order);
    setAmountReceived(String(order.total_amount));
  };

  // Submit Cash Payment
  const handleConfirmPayment = async () => {
    if (!payingOrder) return;
    const received = Number(amountReceived);
    if (received < payingOrder.total_amount) {
      alert(`Uang tunai kurang. Total tagihan: ${formatRupiah(payingOrder.total_amount)}`);
      return;
    }

    setConfirmingPayment(true);
    try {
      const res = await fetch(`/api/orders/${payingOrder.id}/pay-cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount_received: received })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal memproses pembayaran.');
        return;
      }

      playCashierDing();
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}

      // Open receipt preview automatically
      setReceiptModal({
        isOpen: true,
        type: 'customer',
        data: data.order
      });

      setPayingOrder(null);
      fetchData();
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  // Open Discount Modal (Otomatis mengisi nilai diskon berdasarkan kategori)
  const openDiscountModal = (order) => {
    setDiscountOrder(order);
    const initialCat = discountCategories[0] || null;
    if (initialCat) {
      setSelectedDiscountCat(initialCat.id);
      setDiscountType(initialCat.discount_type || 'percent');
      setDiscountValue(String(initialCat.discount_value !== undefined ? initialCat.discount_value : '10'));
    } else {
      setSelectedDiscountCat(null);
      setDiscountType('percent');
      setDiscountValue('10');
    }
    setDiscountNotes('');
  };

  // Kasir memilih kategori diskon -> otomatis mengisi tipe & nilai dari settingan Admin
  const handleSelectDiscountCategory = (catId) => {
    setSelectedDiscountCat(catId);
    const cat = discountCategories.find(c => String(c.id) === String(catId));
    if (cat) {
      setDiscountType(cat.discount_type || 'percent');
      setDiscountValue(String(cat.discount_value !== undefined ? cat.discount_value : '0'));
    }
  };

  // Submit Discount
  const handleApplyDiscount = async () => {
    if (!discountOrder || !discountValue || Number(discountValue) <= 0) {
      alert('Silakan masukkan nilai diskon yang valid.');
      return;
    }

    const catObj = discountCategories.find(c => String(c.id) === String(selectedDiscountCat));
    setApplyingDiscount(true);
    try {
      const res = await fetch(`/api/orders/${discountOrder.id}/apply-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: selectedDiscountCat,
          category_name: catObj?.name || 'Diskon Manual',
          type: discountType,
          value: Number(discountValue),
          notes: discountNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menerapkan diskon.');
        return;
      }

      alert('Diskon berhasil diterapkan!');
      setDiscountOrder(null);
      fetchData();
    } catch (err) {
      alert('Terjadi kesalahan.');
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Submit Void Order
  const handleVoidOrder = async () => {
    if (!voidModalOrder || !voidReason) {
      alert('Alasan void wajib diisi.');
      return;
    }

    setProcessingVoid(true);
    try {
      const res = await fetch(`/api/orders/${voidModalOrder.id}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: voidReason })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal membatalkan order.');
        return;
      }

      alert('Order berhasil dibatalkan (Void).');
      setVoidModalOrder(null);
      setVoidReason('');
      fetchData();
    } catch (err) {
      alert('Terjadi kesalahan saat memproses void.');
    } finally {
      setProcessingVoid(false);
    }
  };

  // Submit Refund
  const handleRefund = async () => {
    if (!refundModalOrder || !refundAmount || Number(refundAmount) <= 0 || !refundReason) {
      alert('Nominal refund dan alasan wajib diisi lengkap.');
      return;
    }

    setProcessingRefund(true);
    try {
      const res = await fetch(`/api/orders/${refundModalOrder.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(refundAmount),
          reason: refundReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal memproses refund.');
        return;
      }

      alert(data.message || 'Refund berhasil.');
      setRefundModalOrder(null);
      setRefundAmount('');
      setRefundReason('');
      fetchData();
    } catch (err) {
      alert('Gagal memproses refund.');
    } finally {
      setProcessingRefund(false);
    }
  };

  // -------------------------------------------------------------
  // EDIT ORDER ITEMS (KASIR MEMPERBARUI MENU PESANAN PELANGGAN)
  // -------------------------------------------------------------
  const openEditOrderModal = (order) => {
    setEditingOrder(order);
    setEditItems(
      (order.items || []).map((it) => ({
        menu_item_id: it.menu_item_id,
        item_name: it.item_name,
        item_price: Number(it.item_price),
        quantity: Number(it.quantity) || 1,
        notes: it.notes || ''
      }))
    );
    setEditCustomerNotes(order.customer_notes || '');
    setEditSearchMenu('');
    setEditSelectedCategory('all');
  };

  const closeEditOrderModal = () => {
    setEditingOrder(null);
    setEditItems([]);
    setEditCustomerNotes('');
    setSavingEditOrder(false);
  };

  const updateEditItemQty = (index, delta) => {
    setEditItems((prev) => {
      const updated = [...prev];
      const newQty = (Number(updated[index].quantity) || 1) + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const removeEditItem = (index) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditItemNotes = (index, notes) => {
    setEditItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes };
      return updated;
    });
  };

  const addItemToEditOrder = (item) => {
    setEditItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.menu_item_id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (Number(updated[existingIndex].quantity) || 1) + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            menu_item_id: item.id,
            item_name: item.name,
            item_price: Number(item.price),
            quantity: 1,
            notes: ''
          }
        ];
      }
    });
  };

  const handleSaveOrderEdit = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert('Pesanan harus memiliki minimal 1 item menu. Jika ingin membatalkan seluruh pesanan, gunakan tombol Void Order.');
      return;
    }

    setSavingEditOrder(true);
    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: editItems,
          customer_notes: editCustomerNotes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengubah pesanan.');
      }

      const updated = await res.json();
      setIncomingOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      closeEditOrderModal();
    } catch (err) {
      alert(`Gagal menyimpan perubahan pesanan: ${err.message}`);
    } finally {
      setSavingEditOrder(false);
    }
  };

  // Manual Walk-in Order helpers
  const addToManualCart = (item) => {
    setManualCart(prev => {
      const exist = prev.find(c => c.menu_item_id === item.id);
      if (exist) {
        return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }];
    });
  };

  const updateManualQty = (id, delta) => {
    setManualCart(prev => {
      return prev
        .map(c => c.menu_item_id === id ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0);
    });
  };

  const manualSubtotal = manualCart.reduce((acc, c) => acc + (c.price * c.quantity), 0);

  const handleCreateManualOrder = async () => {
    if (manualCart.length === 0) {
      alert('Pilih minimal satu menu untuk order manual.');
      return;
    }

    setSubmittingManualOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          table_id: manualTableId,
          customer_name: manualCustomerName || 'Tamu Walk-in',
          items: manualCart
        })
      });

      const newOrder = await res.json();
      if (!res.ok) {
        alert(newOrder.error || 'Gagal membuat order manual.');
        return;
      }

      setManualCart([]);
      setManualCustomerName('');
      setActiveTab('incoming');
      fetchData();

      // Directly open payment modal for this new walk-in order
      openPaymentModal(newOrder);
    } catch (err) {
      alert('Terjadi kesalahan server.');
    } finally {
      setSubmittingManualOrder(false);
    }
  };

  // Filter menu items for manual POS by category and search
  const filteredManualMenu = menuItems.filter(m => {
    const matchCategory = selectedMenuCategory === 'all' || String(m.category_id) === String(selectedMenuCategory);
    const matchSearch = m.name.toLowerCase().includes(manualSearch.toLowerCase()) ||
      m.category_name?.toLowerCase().includes(manualSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Filter menu items for Edit Order Modal
  const filteredEditMenu = menuItems.filter(m => {
    const matchCat = editSelectedCategory === 'all' || String(m.category_id) === String(editSelectedCategory);
    const matchSearch = m.name.toLowerCase().includes(editSearchMenu.toLowerCase()) ||
      m.category_name?.toLowerCase().includes(editSearchMenu.toLowerCase());
    return matchCat && matchSearch;
  });

  const currentEditSubtotal = editItems.reduce((sum, it) => sum + (it.item_price * it.quantity), 0);
  let estimatedDiscount = 0;
  if (editingOrder && editingOrder.discount_amount > 0 && editingOrder.subtotal > 0) {
    const ratio = editingOrder.discount_amount / editingOrder.subtotal;
    estimatedDiscount = Math.round(currentEditSubtotal * ratio);
  }
  const currentEditTotal = Math.max(0, currentEditSubtotal - estimatedDiscount);

  return (
    <div className="min-h-screen bg-gray-100/70 pb-20">
      {/* Top Warning Banner if No Active Shift */}
      {!activeShift && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>Perhatian: Belum ada shift kasir yang aktif. Harap buka shift kasir untuk memulai transaksi hari ini.</span>
          </div>
          <a
            href="/kasir/shift"
            className="px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50"
          >
            Buka Shift Sekarang &rarr;
          </a>
        </div>
      )}

      {/* Cashier Bar Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
            <div>
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Store size={22} className="text-amber-800" />
                <span>Dashboard Kasir POS (Cash Only)</span>
              </h1>
              <p className="text-xs text-gray-500">
                Konfirmasi tunai, diskon manual, cetak struk thermal, & order walk-in.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('incoming')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'incoming'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Antrian Order Masuk</span>
                {incomingOrders.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-extrabold animate-pulse">
                    {incomingOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('manual_order')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'manual_order'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Plus size={14} />
                <span>Input Order Walk-in</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
                  activeTab === 'history'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock size={14} />
                <span>Riwayat Hari Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ============================================================= */}
        {/* TAB 1: ANTRIAN ORDER MASUK (MENUNGGU KONFIRMASI KASIR) */}
        {/* ============================================================= */}
        {activeTab === 'incoming' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Antrian Menunggu Pembayaran Tunai
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  {incomingOrders.length} Order
                </span>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-amber-900 hover:underline font-semibold"
              >
                Refresh Data
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : incomingOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="text-base font-bold text-gray-900">Antrian Kasir Bersih!</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Semua pesanan pelanggan yang masuk telah dikonfirmasi pembayarannya atau belum ada order baru.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {incomingOrders.map((order) => {
                  const elapsed = getElapsedMinutes(order.created_at);
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl p-5 border-2 border-amber-300 shadow-md hover:shadow-lg transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-gray-900">
                                {order.table_label || `Meja ${order.table_number}`}
                              </span>
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold uppercase">
                                Cash Only
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                              #{order.order_number}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg">
                              {elapsed} mnt lalu
                            </span>
                          </div>
                        </div>

                        {/* Customer details */}
                        <div className="py-2 text-xs text-gray-600 flex items-center justify-between">
                          <span>Pemesan: <strong>{order.customer_name}</strong></span>
                        </div>

                        {/* Items list */}
                        <div className="py-2 space-y-1.5 max-h-48 overflow-y-auto border-t border-b border-gray-100 my-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs">
                              <div className="flex-1 pr-2">
                                <span className="font-bold text-gray-900">{item.item_name}</span>
                                <span className="text-gray-500 ml-1.5">x{item.quantity}</span>
                                {item.notes && (
                                  <p className="text-[10px] text-gray-500 italic mt-0.5">
                                    * {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="font-semibold text-gray-800">
                                {formatRupiah(item.item_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Price Details */}
                        <div className="py-1 space-y-1 text-xs">
                          <div className="flex justify-between text-gray-500">
                            <span>Subtotal:</span>
                            <span>{formatRupiah(order.subtotal)}</span>
                          </div>
                          {Number(order.discount_amount) > 0 && (
                            <div className="flex justify-between font-bold text-emerald-700">
                              <span>Diskon:</span>
                              <span>- {formatRupiah(order.discount_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-base text-gray-900 pt-1 border-t border-gray-100">
                            <span>Total Cash:</span>
                            <span>{formatRupiah(order.total_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        {/* Main Payment Confirm Button */}
                        <button
                          type="button"
                          onClick={() => openPaymentModal(order)}
                          className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-sm shadow-md transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={18} />
                          <span>Tandai Sudah Dibayar (Cash)</span>
                        </button>

                        {/* Additional Actions (Edit Menu, Discount & Void) */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => openEditOrderModal(order)}
                            className="py-2 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold transition flex items-center justify-center gap-1"
                            title="Edit Menu / Ubah Pesanan"
                          >
                            <Edit3 size={13} />
                            <span>Edit Menu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openDiscountModal(order)}
                            className="py-2 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold transition flex items-center justify-center gap-1"
                          >
                            <Percent size={13} />
                            <span>Diskon</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVoidModalOrder(order)}
                            className="py-2 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-bold transition flex items-center justify-center gap-1"
                          >
                            <Ban size={13} />
                            <span>Void</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: INPUT ORDER WALK-IN (MANUAL POS) */}
        {/* ============================================================= */}
        {activeTab === 'manual_order' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Menu Picker (Col 7) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Pilih Menu Walk-in</h2>
                    <p className="text-xs text-gray-500">Pilih kategori menu untuk mempercepat pencarian hidangan</p>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 self-start sm:self-auto">
                    {filteredManualMenu.length} item tampil
                  </span>
                </div>

                {/* Kategori Menu Pills Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedMenuCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                      selectedMenuCategory === 'all'
                        ? 'text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={selectedMenuCategory === 'all' ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
                  >
                    <span>Semua Menu</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedMenuCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {menuItems.length}
                    </span>
                  </button>
                  {menuCategories.map((cat) => {
                    const countInCat = menuItems.filter(m => String(m.category_id) === String(cat.id)).length;
                    const active = String(selectedMenuCategory) === String(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedMenuCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                          active
                            ? 'text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={active ? { backgroundColor: branding?.primary_color || '#78350F' } : {}}
                      >
                        <span>{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {countInCat}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Cari kopi, makanan, snack..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  />
                  {manualSearch && (
                    <button
                      onClick={() => setManualSearch('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredManualMenu.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => addToManualCart(m)}
                    className="p-3 bg-gray-50 hover:bg-amber-50 rounded-2xl border border-gray-200/80 cursor-pointer transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="aspect-4/3 rounded-xl overflow-hidden bg-gray-200 mb-2">
                        <img
                          src={m.image_url}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <p className="font-bold text-xs text-gray-900 line-clamp-1">{m.name}</p>
                      <p className="text-[10px] text-gray-500">{m.category_name}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-900">
                        {formatRupiah(m.price)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-amber-800 text-white flex items-center justify-center text-xs">
                        +
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Order Summary & Table Selector (Col 5) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-amber-800" />
                  <span>Keranjang Order Walk-in</span>
                </h2>

                {/* Table & Customer Inputs */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Meja:</label>
                    <select
                      value={manualTableId}
                      onChange={(e) => setManualTableId(e.target.value)}
                      className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-600"
                    >
                      {tables.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Pelanggan:</label>
                    <input
                      type="text"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      placeholder="Walk-in / Nama Tamu"
                      className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* Cart Items */}
                <div className="space-y-2 max-h-80 overflow-y-auto border-t border-b border-gray-100 py-3 mb-4">
                  {manualCart.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Belum ada item dipilih.</p>
                  ) : (
                    manualCart.map((c) => (
                      <div key={c.menu_item_id} className="p-2 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[10px] text-gray-500">{formatRupiah(c.price)} x {c.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateManualQty(c.menu_item_id, -1)}
                            className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="font-bold w-4 text-center">{c.quantity}</span>
                          <button
                            onClick={() => updateManualQty(c.menu_item_id, 1)}
                            className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(manualSubtotal)}</span>
                  </div>
                  <div className="flex justify-between font-black text-base text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total Tagihan:</span>
                    <span>{formatRupiah(manualSubtotal)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCreateManualOrder}
                  disabled={submittingManualOrder || manualCart.length === 0}
                  className="w-full py-3 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-2xl shadow-md transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{submittingManualOrder ? 'Membuat Order...' : 'Lanjut ke Pembayaran Cash'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: RIWAYAT ORDER HARI INI */}
        {/* ============================================================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Riwayat Transaksi Hari Ini</h2>
              <span className="text-xs text-gray-500">{todayOrders.length} transaksi tercatat</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="pb-3">No. Order</th>
                    <th className="pb-3">Meja</th>
                    <th className="pb-3">Pemesan</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Status Order</th>
                    <th className="pb-3">Status Bayar</th>
                    <th className="pb-3">Waktu</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todayOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 font-mono font-bold text-gray-900">
                        #{ord.order_number}
                      </td>
                      <td className="py-3 font-semibold text-gray-800">
                        {ord.table_label || `Meja ${ord.table_number}`}
                      </td>
                      <td className="py-3 text-gray-600">{ord.customer_name}</td>
                      <td className="py-3 font-extrabold text-gray-900">
                        {formatRupiah(ord.total_amount)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.status === 'selesai' ? 'bg-emerald-100 text-emerald-800' :
                          ord.status === 'siap' ? 'bg-blue-100 text-blue-800' :
                          ord.status === 'diproses' ? 'bg-amber-100 text-amber-800' :
                          ord.status === 'dibatalkan' ? 'bg-rose-100 text-rose-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.payment_status === 'dibayar' ? 'bg-emerald-100 text-emerald-800' :
                          ord.payment_status === 'refunded' ? 'bg-purple-100 text-purple-800' :
                          ord.payment_status === 'voided' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {formatDateTime(ord.created_at)}
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        {ord.payment_status === 'dibayar' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setReceiptModal({ isOpen: true, type: 'customer', data: ord })}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold inline-flex items-center gap-1"
                              title="Cetak Ulang Struk"
                            >
                              <Printer size={13} />
                              <span>Cetak</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRefundModalOrder(ord);
                                setRefundAmount(String(ord.total_amount));
                              }}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg font-semibold inline-flex items-center gap-1"
                              title="Refund Cash"
                            >
                              <RotateCcw size={13} />
                              <span>Refund</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: KONFIRMASI PEMBAYARAN TUNAI (CASH ONLY) */}
      {/* ============================================================= */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Konfirmasi Bayar Cash</span>
                <h2 className="text-lg font-bold text-gray-900">
                  {payingOrder.table_label || `Meja ${payingOrder.table_number}`} &bull; #{payingOrder.order_number}
                </h2>
              </div>
              <button onClick={() => setPayingOrder(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="my-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-xs text-amber-800 font-semibold uppercase">Total Tagihan Pelanggan</span>
              <p className="text-3xl font-black text-amber-950 mt-1">
                {formatRupiah(payingOrder.total_amount)}
              </p>
            </div>

            {/* Amount Received Input */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Uang Tunai Diterima (Rp):
                </label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full p-3 text-lg font-black bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  payingOrder.total_amount,
                  Math.ceil(payingOrder.total_amount / 10000) * 10000,
                  Math.ceil(payingOrder.total_amount / 50000) * 50000,
                  100000
                ].filter((v, i, a) => v >= payingOrder.total_amount && a.indexOf(v) === i).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountReceived(String(amt))}
                    className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Calculated Change */}
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600">Uang Kembalian:</span>
                <span className={`text-base font-black ${Number(amountReceived) >= payingOrder.total_amount ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {Number(amountReceived) >= payingOrder.total_amount
                    ? formatRupiah(Number(amountReceived) - payingOrder.total_amount)
                    : 'Uang Kurang!'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={confirmingPayment || Number(amountReceived) < payingOrder.total_amount}
                className="flex-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                <span>{confirmingPayment ? 'Memproses...' : 'Terima Uang & Kirim ke Dapur'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: DISKON MANUAL (KARYAWAN / OWNER / DLL) */}
      {/* ============================================================= */}
      {discountOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Percent size={18} className="text-amber-800" />
                <h2 className="text-base font-bold text-gray-900">Terapkan Diskon Manual</h2>
              </div>
              <button onClick={() => setDiscountOrder(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="my-4 text-xs space-y-3.5">
              <div className="p-2.5 bg-amber-50/80 rounded-2xl border border-amber-200 text-[11px] text-amber-900">
                Pilih salah satu kategori diskon di bawah ini. Nilai diskon akan <strong>otomatis terisi</strong> sesuai pengaturan Admin.
              </div>

              {/* Quick Select Category Grid */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">Pilih Kategori Diskon:</label>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5">
                  {discountCategories.map(cat => {
                    const isSelected = String(cat.id) === String(selectedDiscountCat);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectDiscountCategory(cat.id)}
                        className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        <span className="font-bold text-xs truncate">{cat.name}</span>
                        <span className={`text-[11px] font-black mt-1 ${isSelected ? 'text-amber-200' : 'text-amber-900'}`}>
                          {cat.discount_type === 'nominal' ? formatRupiah(cat.discount_value || 0) : `${cat.discount_value || 0}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Calculation Preview */}
              {(() => {
                const orderSubtotal = discountOrder.subtotal || 0;
                const dNum = Number(discountValue) || 0;
                const calcDiscount = discountType === 'percent'
                  ? Math.round((orderSubtotal * Math.min(100, Math.max(0, dNum))) / 100)
                  : Math.min(orderSubtotal, Math.max(0, dNum));
                const newTotal = Math.max(0, orderSubtotal - calcDiscount);
                const activeCat = discountCategories.find(c => String(c.id) === String(selectedDiscountCat));

                return (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Pesanan:</span>
                      <span className="font-semibold">{formatRupiah(orderSubtotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>Potongan Diskon ({activeCat?.name || 'Kategori'}: {discountType === 'percent' ? `${discountValue}%` : formatRupiah(discountValue)}):</span>
                      <span>- {formatRupiah(calcDiscount)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-emerald-200 flex justify-between font-black text-sm text-gray-900">
                      <span>Total Tagihan Baru:</span>
                      <span className="text-emerald-700">{formatRupiah(newTotal)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Catatan Audit (Opsional) */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Catatan Audit (Opsional):</label>
                <input
                  type="text"
                  value={discountNotes}
                  onChange={(e) => setDiscountNotes(e.target.value)}
                  placeholder="Misal: Diskon staff barista Dimas"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDiscountOrder(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={applyingDiscount || Number(discountValue) <= 0}
                className="flex-2 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {applyingDiscount ? 'Menerapkan...' : `Terapkan Diskon (${discountType === 'percent' ? `${discountValue}%` : formatRupiah(discountValue)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: VOID ORDER */}
      {/* ============================================================= */}
      {voidModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 border border-red-200">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-rose-700">
              <Ban size={20} />
              <h2 className="text-base font-bold">Void / Batalkan Order #{voidModalOrder.order_number}</h2>
            </div>

            <div className="my-4 text-xs space-y-3">
              <p className="text-gray-600">
                Order dari <strong>{voidModalOrder.table_label || `Meja ${voidModalOrder.table_number}`}</strong> senilai <strong>{formatRupiah(voidModalOrder.total_amount)}</strong> akan dibatalkan.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Alasan Void (Wajib diisi):
                </label>
                <textarea
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Misal: Pelanggan salah pesan, stok habis, pelanggan membatalkan pesanan..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVoidModalOrder(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVoidOrder}
                disabled={processingVoid || !voidReason}
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
              >
                {processingVoid ? 'Memproses Void...' : 'Konfirmasi Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: REFUND CASH */}
      {/* ============================================================= */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 border border-purple-200">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-purple-800">
              <RotateCcw size={20} />
              <h2 className="text-base font-bold">Refund Cash Order #{refundModalOrder.order_number}</h2>
            </div>

            <div className="my-4 text-xs space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nominal Refund Tunai (Rp):</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Alasan Refund (Wajib):</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Misal: Minuman tumpah, komplain rasa, pesanan tertunda..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRefund}
                disabled={processingRefund || !refundReason || !refundAmount}
                className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50"
              >
                {processingRefund ? 'Memproses Refund...' : 'Simpan Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 5: CETAK STRUK THERMAL PRINTER */}
      {/* ============================================================= */}
      {receiptModal.isOpen && (
        <ThermalReceipt
          type={receiptModal.type}
          data={receiptModal.data}
          onClose={() => setReceiptModal({ isOpen: false, type: 'customer', data: null })}
        />
      )}

      {/* ============================================================= */}
      {/* MODAL 6: EDIT PESANAN / GANTI / TAMBAH MENU (KASIR) */}
      {/* ============================================================= */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Edit3 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-gray-900">
                      Edit Menu Pesanan
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold">
                      {editingOrder.table_label || `Meja ${editingOrder.table_number}`}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      #{editingOrder.order_number}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pemesan: <strong>{editingOrder.customer_name}</strong> &bull; Ubah porsi, hapus menu habis, atau tambahkan menu baru.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditOrderModal}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - 2 Columns on Desktop */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri: Menu yang Sedang Dipesan (6 Col) */}
              <div className="lg:col-span-6 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-blue-700" />
                    <span>Daftar Menu yang Dipesan ({editItems.length})</span>
                  </h3>
                  {editItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditItems([])}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Kosongkan Semua
                    </button>
                  )}
                </div>

                {editItems.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-xs font-bold text-gray-700">Semua menu telah dihapus</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Pilih menu pengganti dari panel di sebelah kanan untuk menambahkan hidangan ke pesanan ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {editItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-200 transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-gray-900 truncate">{item.item_name}</h4>
                            <p className="text-[11px] font-semibold text-gray-500">
                              {formatRupiah(item.item_price)} / porsi
                            </p>
                          </div>

                          {/* Stepper & Line Total */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateEditItemQty(idx, -1)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 transition"
                                title="Kurang Qty"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="px-2 text-xs font-black text-gray-900 min-w-[24px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateEditItemQty(idx, 1)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 transition"
                                title="Tambah Qty"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeEditItem(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                              title="Hapus Menu Ini (Habis / Batal)"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Line total and notes input */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => updateEditItemNotes(idx, e.target.value)}
                            placeholder="Catatan rasa (misal: less sugar, pedas sedang)..."
                            className="w-full text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-1 placeholder:text-gray-400"
                          />
                          <span className="text-xs font-black text-gray-800 shrink-0">
                            {formatRupiah(item.item_price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Catatan Tambahan Pelanggan */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan Umum Pesanan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={editCustomerNotes}
                    onChange={(e) => setEditCustomerNotes(e.target.value)}
                    placeholder="Misal: Meja minta sendok garpu lebih, pisahkan kuah..."
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Kolom Kanan: Tambah Menu Pengganti / Menu Baru (6 Col) */}
              <div className="lg:col-span-6 flex flex-col space-y-3 lg:border-l lg:border-gray-100 lg:pl-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Coffee size={14} className="text-amber-800" />
                    <span>Pilih Menu Cafe untuk Ditambahkan</span>
                  </h3>
                  <span className="text-[11px] font-bold text-gray-400">
                    {filteredEditMenu.length} item
                  </span>
                </div>

                {/* Search menu */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={editSearchMenu}
                    onChange={(e) => setEditSearchMenu(e.target.value)}
                    placeholder="Cari makanan atau minuman..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs placeholder:text-gray-400"
                  />
                  {editSearchMenu && (
                    <button
                      type="button"
                      onClick={() => setEditSearchMenu('')}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setEditSelectedCategory('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition ${
                      editSelectedCategory === 'all'
                        ? 'bg-amber-800 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Semua
                  </button>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition ${
                        editSelectedCategory === cat.id
                          ? 'bg-amber-800 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Menu List */}
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {filteredEditMenu.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Tidak ada menu yang cocok dengan pencarian.</p>
                  ) : (
                    filteredEditMenu.map((mItem) => {
                      const existing = editItems.find(it => it.menu_item_id === mItem.id);
                      return (
                        <div
                          key={mItem.id}
                          className="p-2.5 bg-white hover:bg-amber-50/50 rounded-xl border border-gray-200 hover:border-amber-300 transition flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 truncate">{mItem.name}</span>
                              {existing && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-black shrink-0">
                                  x{existing.quantity}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-amber-900">
                              {formatRupiah(mItem.price)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => addItemToEditOrder(mItem)}
                            className="py-1.5 px-3 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <Plus size={13} />
                            <span>Tambah</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Calculations and Actions */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs w-full sm:w-auto justify-between sm:justify-start">
                <div>
                  <span className="text-gray-500 block text-[10px]">Subtotal Baru:</span>
                  <span className="font-bold text-gray-800 text-sm">{formatRupiah(currentEditSubtotal)}</span>
                </div>
                {estimatedDiscount > 0 && (
                  <div className="border-l border-gray-300 pl-4">
                    <span className="text-emerald-700 block text-[10px]">Diskon:</span>
                    <span className="font-bold text-emerald-700 text-sm">- {formatRupiah(estimatedDiscount)}</span>
                  </div>
                )}
                <div className="border-l border-gray-300 pl-4">
                  <span className="text-gray-500 block text-[10px]">Total Tagihan Cash:</span>
                  <span className="font-black text-amber-950 text-base">{formatRupiah(currentEditTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={closeEditOrderModal}
                  disabled={savingEditOrder}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrderEdit}
                  disabled={savingEditOrder || editItems.length === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                >
                  {savingEditOrder ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Simpan Perubahan Pesanan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
