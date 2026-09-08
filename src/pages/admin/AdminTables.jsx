import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import {
  QrCode,
  Plus,
  Download,
  Printer,
  RefreshCw,
  Trash2,
  Edit2,
  ExternalLink,
  Coffee,
  X
} from 'lucide-react';

export default function AdminTables() {
  const { token } = useAuth();
  const { branding } = useBranding();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Table modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [tableLabel, setTableLabel] = useState('');
  const [savingTable, setSavingTable] = useState(false);

  // Print Standee Modal
  const [selectedTableForPrint, setSelectedTableForPrint] = useState(null);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const openAddModal = () => {
    setEditingTable(null);
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) + 1 : 1;
    setTableNumber(String(nextNum));
    setTableLabel(`Meja ${nextNum} (Indoor)`);
    setModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTable(t);
    setTableNumber(String(t.table_number));
    setTableLabel(t.label);
    setModalOpen(true);
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    setSavingTable(true);
    try {
      const url = editingTable ? `/api/tables/${editingTable.id}` : '/api/tables';
      const method = editingTable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          table_number: Number(tableNumber),
          label: tableLabel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menyimpan meja.');
        return;
      }

      setModalOpen(false);
      fetchTables();
    } catch (err) {
      alert('Terjadi kesalahan.');
    } finally {
      setSavingTable(false);
    }
  };

  const handleRegenerateQr = async (id) => {
    if (!confirm('Apakah Anda ingin generate ulang token QR meja ini? Barcode lama tidak akan lagi aktif.')) return;
    try {
      const res = await fetch(`/api/tables/${id}/regenerate-qr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTables();
      }
    } catch (err) {
      alert('Gagal regenerate QR.');
    }
  };

  const handleDeleteTable = async (id) => {
    if (!confirm('Hapus meja ini dari sistem?')) return;
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTables();
      }
    } catch (err) {
      alert('Gagal menghapus meja.');
    }
  };

  const handleDownloadQr = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  // Cetak Standee Meja Mandiri (Pasti 1 Lembar, Tidak Kosong)
  const handlePrintStandee = () => {
    if (!selectedTableForPrint) return;

    // Buat iframe terisolasi agar tidak terpengaruh CSS halaman dashboard yang panjang
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const logoHtml = branding?.logo_url
      ? `<img src="${branding.logo_url}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; margin: 0 auto 10px auto; display: block;" />`
      : `<div style="width: 48px; height: 48px; border-radius: 14px; background-color: ${branding?.primary_color || '#78350F'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-size: 22px; font-weight: bold;">☕</div>`;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Standee Barcode - Meja ${selectedTableForPrint.table_number}</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 95vh;
              padding: 15px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .standee-card {
              width: 360px;
              max-width: 100%;
              background-color: #fffdf7;
              border: 4px solid #78350f;
              border-radius: 28px;
              padding: 28px 20px;
              text-align: center;
              box-shadow: none;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .cafe-name {
              font-size: 17px;
              font-weight: 900;
              text-transform: uppercase;
              color: #111827;
              letter-spacing: 0.05em;
              margin-bottom: 3px;
            }
            .subtitle {
              font-size: 10px;
              font-weight: 700;
              color: #92400e;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              margin-bottom: 16px;
            }
            .qr-wrapper {
              background-color: #ffffff;
              border: 2px solid #e5e7eb;
              border-radius: 20px;
              padding: 14px;
              display: inline-block;
              margin-bottom: 16px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .qr-wrapper img {
              width: 180px;
              height: 180px;
              display: block;
              margin: 0 auto;
            }
            .table-badge {
              background-color: #78350f;
              color: #ffffff;
              font-size: 18px;
              font-weight: 900;
              padding: 6px 22px;
              border-radius: 12px;
              display: inline-block;
              letter-spacing: 0.05em;
              margin-bottom: 14px;
            }
            .instructions {
              font-size: 11px;
              color: #4b5563;
              line-height: 1.4;
              padding: 0 8px;
            }
            .instructions strong {
              color: #1f2937;
            }
            .footer-note {
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px dashed #d1d5db;
              font-size: 10px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            ${logoHtml}
            <div class="cafe-name">${branding?.cafe_name || 'Kopi Senja Nusantara'}</div>
            <div class="subtitle">Scan Barcode untuk Pesan Mandiri</div>
            <div class="qr-wrapper">
              <img src="${selectedTableForPrint.qr_code_data_url}" alt="QR Meja ${selectedTableForPrint.table_number}" />
            </div>
            <div>
              <div class="table-badge">MEJA #${selectedTableForPrint.table_number}</div>
            </div>
            <p class="instructions">
              Arahkan kamera HP Anda ke barcode di atas untuk membuka daftar menu kami <strong>tanpa perlu install aplikasi</strong>.
            </p>
            <div class="footer-note">
              ${selectedTableForPrint.label || `Meja ${selectedTableForPrint.table_number}`} &bull; ${branding?.cafe_address || 'Cafe Ordering System'}
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Tunggu render sebelum membuka dialog print browser
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 350);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <QrCode size={26} className="text-amber-800" />
              <span>Generator QR & Barcode Meja</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Buat barcode/QR unik per meja pelanggan. URL otomatis meng-encode nomor meja tanpa perlu login.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 self-start"
            style={{ backgroundColor: branding?.primary_color || '#78350F' }}
          >
            <Plus size={16} />
            <span>Tambah Meja Cafe</span>
          </button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">
                      Meja #{table.table_number}
                    </h3>
                    <p className="text-xs text-gray-500">{table.label}</p>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                    Aktif
                  </span>
                </div>

                {/* QR Code Preview */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center my-3">
                  <img
                    src={table.qr_code_data_url}
                    alt={`QR Meja ${table.table_number}`}
                    className="w-36 h-36 object-contain bg-white p-2 rounded-xl shadow-xs"
                  />
                  <span className="text-[10px] font-mono text-gray-400 mt-2">
                    {table.qr_code_token}
                  </span>
                </div>

                <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl truncate">
                  <span className="font-bold block text-gray-500 text-[10px]">URL Pesan:</span>
                  <a
                    href={table.order_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-800 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>/order?table={table.table_number}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleDownloadQr(table.qr_code_data_url, `QR-Meja-${table.table_number}.png`)}
                    className="py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition flex items-center justify-center gap-1"
                  >
                    <Download size={13} />
                    <span>Unduh PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTableForPrint(table)}
                    className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold transition flex items-center justify-center gap-1"
                  >
                    <Printer size={13} />
                    <span>Cetak Tent</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => handleRegenerateQr(table.id)}
                    className="text-gray-400 hover:text-amber-800 flex items-center gap-1 text-[11px]"
                    title="Generate token QR baru"
                  >
                    <RefreshCw size={11} /> Reset QR
                  </button>

                  <div className="space-x-1">
                    <button
                      onClick={() => openEditModal(table)}
                      className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                      title="Edit Nama Meja"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Hapus Meja"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Table Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              {editingTable ? 'Edit Meja Cafe' : 'Tambah Meja Cafe'}
            </h2>
            <form onSubmit={handleSaveTable} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor Meja:</label>
                <input
                  type="number"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-black text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Label / Lokasi Meja:</label>
                <input
                  type="text"
                  required
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="Misal: Meja 1 (Outdoor Gazebo)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTable}
                  className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md"
                >
                  {savingTable ? 'Menyimpan...' : 'Simpan Meja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Table Tent Card / Standee Preview Modal */}
      {selectedTableForPrint && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 flex flex-col items-center text-center">
            <div className="w-full flex justify-end mb-2 no-print">
              <button
                onClick={() => setSelectedTableForPrint(null)}
                className="p-1 text-gray-400 hover:text-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Print Tent Card Preview */}
            <div
              id="printable-tent-card"
              className="border-4 border-amber-900 rounded-3xl p-6 w-full bg-amber-50/50 shadow-sm"
            >
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className="w-14 h-14 object-contain mx-auto mb-2"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center text-white"
                  style={{ backgroundColor: branding?.primary_color || '#78350F' }}
                >
                  <Coffee size={24} />
                </div>
              )}
              <h2 className="font-extrabold text-base uppercase text-gray-900 tracking-wider">
                {branding?.cafe_name || 'Kopi Senja Nusantara'}
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                Scan Barcode untuk Pesan
              </p>

              <div className="my-4 p-3 bg-white rounded-2xl shadow-inner inline-block border border-gray-200">
                <img
                  src={selectedTableForPrint.qr_code_data_url}
                  alt="QR"
                  className="w-40 h-40 object-contain mx-auto"
                />
              </div>

              <div className="bg-amber-900 text-white rounded-xl py-1.5 px-4 font-black text-lg inline-block">
                MEJA #{selectedTableForPrint.table_number}
              </div>

              <p className="text-[10px] text-gray-600 mt-3 leading-tight">
                Arahkan kamera HP Anda ke barcode di atas untuk membuka daftar menu kami tanpa perlu install aplikasi.
              </p>
            </div>

            <div className="mt-5 w-full flex flex-col sm:flex-row gap-2 no-print">
              <button
                type="button"
                onClick={() => handleDownloadQr(selectedTableForPrint.qr_code_data_url, `QR-Meja-${selectedTableForPrint.table_number}.png`)}
                className="py-2.5 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                title="Unduh file gambar QR Code (PNG)"
              >
                <Download size={14} />
                <span>Unduh PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrintStandee}
                className="flex-1 py-2.5 px-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition"
              >
                <Printer size={14} />
                <span>Cetak Standee (1 Lembar)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTableForPrint(null)}
                className="py-2.5 px-3 bg-gray-100 text-gray-600 hover:text-gray-800 rounded-xl font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
