import React, { useState } from 'react';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { useBranding } from '../context/BrandingContext';
import { Printer, X, CheckCircle2 } from 'lucide-react';

export default function ThermalReceipt({
  type = 'customer', // 'customer' | 'kitchen' | 'void' | 'z_report'
  data = null,
  onClose = () => {}
}) {
  const { branding } = useBranding();
  const [paperWidth, setPaperWidth] = useState(branding?.paper_width || '58mm');
  const [isPrinted, setIsPrinted] = useState(false);

  if (!data) return null;

  const handlePrint = () => {
    setIsPrinted(true);
    window.print();
  };

  const is58mm = paperWidth === '58mm';
  const containerWidthClass = is58mm ? 'max-w-[320px]' : 'max-w-[420px]';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-200 w-full max-w-lg">
        {/* Header Toolbar (hidden on print) */}
        <div className="no-print p-4 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-sm">Cetak Struk Thermal</span>
            <div className="flex bg-white rounded-lg p-0.5 border border-gray-300 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition ${is58mm ? 'bg-amber-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition ${!is58mm ? 'bg-amber-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                80mm
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Printer size={15} /> Cetak Struk
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Thermal Paper Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-gray-200/70 flex justify-center items-center">
          <div
            id="printable-receipt"
            className={`bg-white p-4 text-black font-thermal text-xs shadow-md border border-dashed border-gray-300 mx-auto transition-all ${containerWidthClass}`}
            style={{ width: is58mm ? '280px' : '380px' }}
          >
            {/* ------------------------------------------------------------- */}
            {/* 1. CUSTOMER RECEIPT */}
            {/* ------------------------------------------------------------- */}
            {type === 'customer' && (
              <div>
                <div className="text-center pb-2 border-b border-black border-dashed">
                  {branding?.logo_url && (
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="w-12 h-12 object-contain mx-auto mb-1 filter grayscale contrast-200"
                    />
                  )}
                  <h1 className="font-bold text-sm sm:text-base uppercase tracking-wider">{branding?.cafe_name || 'KOPI SENJA NUSANTARA'}</h1>
                  <p className="text-[10px] leading-tight text-gray-700">{branding?.cafe_tagline}</p>
                  <p className="text-[10px] leading-tight text-gray-700 mt-0.5">{branding?.cafe_address}</p>
                  <p className="text-[10px] leading-tight text-gray-700">Telp: {branding?.cafe_phone}</p>
                </div>

                <div className="py-2 text-[11px] border-b border-black border-dashed space-y-0.5">
                  <div className="flex justify-between">
                    <span>No. Order:</span>
                    <span className="font-bold">{data.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Meja:</span>
                    <span className="font-bold">{data.table_label || `Meja ${data.table_number}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span>{formatDateTime(data.created_at || new Date())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{data.payment?.confirmed_by_name || data.cashier_name || 'Kasir'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="py-2 border-b border-black border-dashed">
                  <div className="space-y-1.5">
                    {data.items?.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between font-bold">
                          <span className="line-clamp-1">{item.item_name}</span>
                          <span>{formatRupiah(item.item_price * item.quantity)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-700">
                          <span>{item.quantity} x {formatRupiah(item.item_price)}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[9px] italic text-gray-600 pl-1">
                            * {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculations */}
                <div className="py-2 text-[11px] space-y-1 border-b border-black border-dashed">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(data.subtotal || data.total_amount)}</span>
                  </div>
                  {Number(data.discount_amount) > 0 && (
                    <div className="flex justify-between font-bold text-black">
                      <span>Diskon ({data.discounts?.[0]?.category_name || 'Manual'}):</span>
                      <span>- {formatRupiah(data.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-black border-dashed">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(data.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-1">
                    <span>Metode Bayar:</span>
                    <span className="font-bold uppercase">CASH (TUNAI)</span>
                  </div>
                  {data.payment && (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span>Diterima:</span>
                        <span>{formatRupiah(data.payment.amount_received)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Kembalian:</span>
                        <span>{formatRupiah(data.payment.change_given)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Message */}
                <div className="pt-3 text-center text-[10px] space-y-1">
                  <p className="font-semibold">{branding?.footer_message || 'Terima kasih atas kunjungan Anda!'}</p>
                  <p className="text-[9px] text-gray-600">Wifi Cafe: CafeSenja | Pass: ngopidulu</p>
                  <p className="text-[8px] text-gray-400">=== CETAKAN STRUK RESMI ===</p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2. KITCHEN TICKET */}
            {/* ------------------------------------------------------------- */}
            {type === 'kitchen' && (
              <div>
                <div className="text-center pb-2 border-b-2 border-black">
                  <h1 className="font-extrabold text-base tracking-widest">*** TIKET DAPUR ***</h1>
                  <div className="text-lg font-black my-1 bg-black text-white p-1">
                    {data.table_label || `MEJA ${data.table_number}`}
                  </div>
                  <p className="text-xs font-bold">Order: {data.order_number}</p>
                  <p className="text-[10px]">{formatDateTime(data.created_at || new Date())}</p>
                </div>

                <div className="py-2 border-b-2 border-black space-y-2">
                  {data.items?.map((item, idx) => (
                    <div key={idx} className="border-b border-gray-300 pb-1">
                      <div className="flex items-start justify-between">
                        <span className="font-black text-sm uppercase">{item.item_name}</span>
                        <span className="font-black text-base px-2 py-0.5 bg-black text-white rounded">
                          x{item.quantity}
                        </span>
                      </div>
                      {item.notes ? (
                        <div className="text-xs font-bold text-black underline mt-0.5">
                          NOTE: {item.notes}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center text-[10px] font-bold">
                  Status: SUDAH DIBAYAR CASH
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 3. VOID / REFUND SLIP */}
            {/* ------------------------------------------------------------- */}
            {(type === 'void' || type === 'refund') && (
              <div>
                <div className="text-center pb-2 border-b-2 border-black">
                  <h1 className="font-extrabold text-sm uppercase">
                    *** SLIP {type === 'void' ? 'VOID ORDER' : 'REFUND CASH'} ***
                  </h1>
                  <p className="font-bold mt-1">Order #{data.order_number}</p>
                  <p className="text-[10px]">{formatDateTime(new Date())}</p>
                </div>

                <div className="py-2 text-[11px] space-y-1 border-b border-black border-dashed">
                  <div className="flex justify-between">
                    <span>Meja:</span>
                    <span className="font-bold">{data.table_label || `Meja ${data.table_number}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diproses Oleh:</span>
                    <span>{data.processed_by || 'Kasir/Admin'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumlah / Nilai:</span>
                    <span className="font-bold">{formatRupiah(data.amount || data.total_amount)}</span>
                  </div>
                  <div className="pt-1">
                    <span className="font-bold">Alasan:</span>
                    <p className="italic bg-gray-100 p-1 mt-0.5">{data.reason || 'Tidak ada keterangan'}</p>
                  </div>
                </div>

                <div className="pt-3 text-center text-[9px] text-gray-500">
                  Dokumen audit internal cafe.
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 4. Z-REPORT (TUTUP BUKU SHIFT) */}
            {/* ------------------------------------------------------------- */}
            {type === 'z_report' && (
              <div>
                <div className="text-center pb-2 border-b border-black border-dashed">
                  <h1 className="font-bold text-sm uppercase tracking-wider">{branding?.cafe_name || 'KOPI SENJA'}</h1>
                  <h2 className="font-extrabold text-xs mt-1">LAPORAN TUTUP BUKU (Z-REPORT)</h2>
                  <p className="text-[10px]">Shift ID: #{data.shift?.id}</p>
                  <p className="text-[10px]">Kasir: {data.shift?.cashier_name}</p>
                  <p className="text-[9px]">Buka: {formatDateTime(data.shift?.opened_at)}</p>
                  <p className="text-[9px]">Tutup: {formatDateTime(data.shift?.closed_at || new Date())}</p>
                </div>

                <div className="py-2 text-[11px] space-y-1 border-b border-black border-dashed">
                  <div className="flex justify-between">
                    <span>Modal Awal Kasir:</span>
                    <span>{formatRupiah(data.summary?.starting_cash || data.shift?.starting_cash)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total Penjualan Cash:</span>
                    <span>{formatRupiah(data.summary?.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>Jumlah Transaksi:</span>
                    <span>{data.summary?.total_orders} transaksi</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Total Refund:</span>
                    <span>- {formatRupiah(data.summary?.total_refund)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Total Void:</span>
                    <span>{formatRupiah(data.summary?.total_void)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Total Diskon Diberikan:</span>
                    <span>{formatRupiah(data.summary?.total_discount)}</span>
                  </div>
                </div>

                {/* Cash Reconciliation */}
                <div className="py-2 text-[11px] space-y-1.5 border-b border-black border-dashed bg-gray-50 p-2">
                  <div className="flex justify-between font-bold">
                    <span>Kas Seharusnya Ada:</span>
                    <span>{formatRupiah(data.summary?.expected_cash)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kas Fisik Dihitung:</span>
                    <span>{formatRupiah(data.summary?.ending_cash_actual || data.shift?.ending_cash_actual)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-black">
                    <span>SELISIH KAS:</span>
                    <span className={Number(data.summary?.cash_difference) < 0 ? 'text-red-600' : 'text-emerald-700'}>
                      {Number(data.summary?.cash_difference) === 0
                        ? 'PAS (Rp 0)'
                        : formatRupiah(data.summary?.cash_difference)}
                    </span>
                  </div>
                </div>

                {/* Discount Breakdown */}
                {data.discount_breakdown && data.discount_breakdown.length > 0 && (
                  <div className="py-2 border-b border-black border-dashed text-[10px]">
                    <span className="font-bold">Rincian Diskon:</span>
                    {data.discount_breakdown.map((disc, idx) => (
                      <div key={idx} className="flex justify-between mt-0.5">
                        <span>{disc.category_name} ({disc.count}x):</span>
                        <span>{formatRupiah(disc.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 text-center text-[9px] text-gray-500">
                  <p>Dicetak pada {formatDateTime(new Date())}</p>
                  <p>Tanda Tangan Kasir: ___________________</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info (hidden on print) */}
        <div className="no-print p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>Format ESC/POS Thermal Printer ({paperWidth})</span>
          {isPrinted && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 size={14} /> Dokumen terkirim ke printer
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
