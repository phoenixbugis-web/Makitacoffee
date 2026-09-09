import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useBranding } from '../context/BrandingContext';
import { playCashierDing } from '../utils/audio';
import {
  Coffee,
  QrCode,
  Camera,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Lock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Zap,
  ZapOff
} from 'lucide-react';

export default function CustomerScanner() {
  const { branding } = useBranding();
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Manual table selector state
  const [tables, setTables] = useState([]);
  const [showManualTableModal, setShowManualTableModal] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);

  // Fetch tables list
  useEffect(() => {
    async function loadTables() {
      try {
        const res = await fetch('/api/tables');
        if (res.ok) {
          const data = await res.json();
          setTables(data || []);
        }
      } catch (err) {
        console.error('Failed to load tables list:', err);
      } finally {
        setLoadingTables(false);
      }
    }
    loadTables();
  }, []);

  // Initialize and start scanner on mount
  useEffect(() => {
    let isMounted = true;
    const scannerId = "qr-reader-container";

    // Create Html5Qrcode instance
    const html5QrCode = new Html5Qrcode(scannerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    });
    scannerRef.current = html5QrCode;

    async function initCamera() {
      try {
        setCameraError('');
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment (back) camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('environment')
          );
          const activeCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(activeCamId);

          await html5QrCode.start(
            activeCamId,
            {
              fps: 15,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.75);
                return { width: qrboxSize, height: qrboxSize };
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              if (isMounted) onScanSuccess(decodedText);
            },
            () => {
              // Ignore per-frame scan failures
            }
          );

          if (isMounted) {
            setIsScanning(true);
            // Check torch capability
            try {
              const capabilities = html5QrCode.getRunningTrackCapabilities();
              if (capabilities && capabilities.torch) {
                setHasTorch(true);
              }
            } catch (e) {
              setHasTorch(false);
            }
          }
        } else {
          // Fallback to camera facingMode environment
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              if (isMounted) onScanSuccess(decodedText);
            },
            () => {}
          );
          if (isMounted) setIsScanning(true);
        }
      } catch (err) {
        console.warn('Camera initiation failed:', err);
        if (isMounted) {
          setIsScanning(false);
          if (err.name === 'NotAllowedError' || String(err).includes('Permission')) {
            setCameraError('Izin kamera tidak diberikan. Silakan izinkan akses kamera di browser Anda.');
          } else {
            setCameraError('Kamera tidak dapat diakses otomatis (terutama jika menggunakan browser yang membatasi akses kamera pada IP lokal). Anda bisa memilih nomor meja manual di bawah.');
          }
        }
      }
    }

    // Short delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      initCamera();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch((e) => {
          console.warn('Error stopping scanner:', e);
        });
      }
    };
  }, []);

  // Handle successful QR code decode
  const onScanSuccess = (decodedText) => {
    if (!decodedText || scannedSuccess) return;
    setScannedSuccess(true);
    setScannedData(decodedText);

    // Audio & Haptic feedback
    playCashierDing();
    if (navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch (e) {}
    }

    // Stop camera feed
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }

    // Process scanned text
    setTimeout(() => {
      handleRedirectFromScanned(decodedText);
    }, 600);
  };

  const handleRedirectFromScanned = (text) => {
    try {
      // 1. Full URL (e.g. http://192.168.1.4:3001/order?table=2&token=TBL-02-XXX)
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const parsed = new URL(text);
        const tableNum = parsed.searchParams.get('table');
        const token = parsed.searchParams.get('token');
        if (tableNum) {
          navigate(`/order?table=${tableNum}${token ? `&token=${token}` : ''}`);
          return;
        }
      }

      // 2. Relative path /order?table=...
      if (text.startsWith('/order')) {
        navigate(text);
        return;
      }

      // 3. Token match (TBL-...)
      if (text.startsWith('TBL-')) {
        const found = tables.find(t => t.qr_code_token === text);
        if (found) {
          navigate(`/order?table=${found.table_number}&token=${found.qr_code_token}`);
          return;
        }
      }

      // 4. Raw number (e.g. "3")
      if (!isNaN(text) && Number(text) > 0) {
        navigate(`/order?table=${Number(text)}`);
        return;
      }

      // Fallback
      if (text.includes('table=')) {
        const match = text.match(/table=(\d+)/);
        if (match && match[1]) {
          navigate(`/order?table=${match[1]}`);
          return;
        }
      }

      alert(`Barcode terbaca: "${text}". Meja tidak ditemukan, silakan pilih nomor meja Anda secara manual.`);
      setScannedSuccess(false);
    } catch (err) {
      console.error('Failed to parse QR text:', err);
      setScannedSuccess(false);
    }
  };

  // Switch camera front/back
  const handleSwitchCamera = async () => {
    if (!cameras || cameras.length <= 1 || !scannerRef.current) return;
    try {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex];
      setSelectedCameraId(nextCam.id);

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        nextCam.id,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => onScanSuccess(decodedText),
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Handle image upload scanning
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;
    try {
      const decoded = await scannerRef.current.scanFile(file, true);
      onScanSuccess(decoded);
    } catch (err) {
      alert('Tidak menemukan Barcode QR yang jelas pada gambar tersebut. Pastikan foto tegak dan cukup cahaya.');
    }
  };

  // Direct manual table pick
  const handleSelectTable = (tbl) => {
    navigate(`/order?table=${tbl.table_number}&token=${tbl.qr_code_token}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="px-4 py-4 sm:py-6 flex items-center justify-between border-b border-neutral-900 bg-neutral-950/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.cafe_name}
              className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-neutral-800"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: branding?.primary_color || '#78350F' }}
            >
              <Coffee size={22} />
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
              {branding?.cafe_name || 'Makita Coffee'}
            </h1>
            <p className="text-[11px] text-amber-400/90 font-medium">
              Pindai Barcode QR Meja Anda
            </p>
          </div>
        </div>

        {/* Manual Table Button */}
        <button
          type="button"
          onClick={() => setShowManualTableModal(true)}
          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-200 transition flex items-center gap-1.5"
        >
          <QrCode size={14} className="text-amber-400" />
          <span>Pilih Meja</span>
        </button>
      </header>

      {/* Main Scanner Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 max-w-lg mx-auto w-full relative">
        {/* Scanner Card */}
        <div className="w-full relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl aspect-square max-w-[340px] sm:max-w-[380px] flex items-center justify-center">
          {/* Html5Qrcode video container */}
          <div
            id="qr-reader-container"
            className="w-full h-full object-cover"
            style={{ minHeight: '300px' }}
          />

          {/* Scanner Overlay Graphics */}
          {isScanning && !scannedSuccess && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Darkened Vignette */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px]"></div>

              {/* Target Scan Box */}
              <div className="relative w-60 h-60 sm:w-64 sm:h-64 rounded-2xl border-2 border-amber-400/40 bg-transparent flex items-center justify-center">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg"></div>

                {/* Animated Laser Scan Bar */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan"></div>

                {/* Center Crosshair */}
                <div className="w-2 h-2 rounded-full bg-amber-400/80 animate-ping"></div>
              </div>

              <div className="absolute bottom-4 px-4 py-1.5 bg-black/75 backdrop-blur-md rounded-full border border-neutral-700 text-[11px] font-medium text-amber-200">
                Arahkan kamera tepat ke barcode meja
              </div>
            </div>
          )}

          {/* Scan Success State */}
          {scannedSuccess && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 z-30">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/40 animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-bold text-white">Barcode Terverifikasi!</h3>
              <p className="text-xs text-emerald-200 mt-1">Membuka menu pemesanan...</p>
            </div>
          )}

          {/* Camera Error / Fallback State */}
          {cameraError && !isScanning && (
            <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
                <Camera size={28} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Akses Kamera Belum Aktif</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed mb-4 max-w-xs">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => setShowManualTableModal(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition transform active:scale-95"
              >
                Pilih Nomor Meja Anda Sekarang
              </button>
            </div>
          )}
        </div>

        {/* Quick Scanner Action Controls */}
        <div className="mt-6 flex items-center gap-3">
          {/* Flip camera button */}
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl text-neutral-300 hover:text-white transition active:scale-95"
              title="Ganti Kamera"
            >
              <RefreshCw size={18} />
            </button>
          )}

          {/* Torch toggle button */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-3 border rounded-2xl transition active:scale-95 ${
                torchOn
                  ? 'bg-amber-500 text-neutral-950 border-amber-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
              }`}
              title="Lampu Flash"
            >
              {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
            </button>
          )}

          {/* Upload Image Barcode Button */}
          <label className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer flex items-center gap-2 active:scale-95">
            <ImageIcon size={16} className="text-amber-400" />
            <span>Unggah Foto QR</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>

        {/* Alternative Button to Select Table */}
        <div className="mt-8 w-full">
          <button
            type="button"
            onClick={() => setShowManualTableModal(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <QrCode size={16} />
              </span>
              <span>Atau Langsung Pilih Nomor Meja</span>
            </div>
            <ChevronRight size={16} className="text-amber-200 group-hover:translate-x-1 transition" />
          </button>
        </div>
      </main>

      {/* Footer Area: Discreet Staff Portal Link */}
      <footer className="px-4 py-4 border-t border-neutral-900 flex items-center justify-between text-neutral-500 text-[11px] max-w-lg mx-auto w-full">
        <span>© {new Date().getFullYear()} {branding?.cafe_name || 'Makita Coffee'}</span>
        
        {/* Hidden / Discreet Staff Portal Link (Tidak mencolok untuk pelanggan) */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-300 transition py-1 px-2 rounded-lg hover:bg-neutral-900"
        >
          <Lock size={12} />
          <span>Portal Staf</span>
        </Link>
      </footer>

      {/* Manual Table Selector Modal */}
      {showManualTableModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coffee size={18} className="text-amber-400" />
                  <span>Pilih Nomor Meja Anda</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Klik nomor meja tempat Anda duduk saat ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualTableModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Tables Grid */}
            <div className="py-4 overflow-y-auto flex-1">
              {loadingTables ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Memuat daftar meja...
                </div>
              ) : tables.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Belum ada meja yang terdaftar.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {tables.map((tbl) => (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => handleSelectTable(tbl)}
                      className="p-4 rounded-2xl bg-neutral-800 hover:bg-amber-600 hover:text-white text-neutral-200 border border-neutral-700/60 hover:border-amber-500 transition flex flex-col items-center justify-center gap-1 group transform active:scale-95 shadow-md"
                    >
                      <span className="text-xl font-extrabold text-white group-hover:scale-110 transition">
                        {tbl.table_number}
                      </span>
                      <span className="text-[10px] text-neutral-400 group-hover:text-amber-100 font-medium line-clamp-1">
                        {tbl.label || `Meja ${tbl.table_number}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowManualTableModal(false)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl transition"
              >
                Kembali ke Kamera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
