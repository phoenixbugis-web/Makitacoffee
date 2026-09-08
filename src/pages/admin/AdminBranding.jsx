import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { formatRupiah } from '../../utils/formatters';
import {
  Palette,
  Upload,
  RefreshCw,
  CheckCircle2,
  Coffee,
  Smartphone,
  Printer,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';

export const THEME_PRESETS = [
  {
    name: 'Modern Espresso (Default)',
    primary: '#78350F', // Warm amber brown
    accent: '#D97706',  // Amber
    bg: '#FFFBEB',      // Cream
    desc: 'Nuansa kopi hangat klasik yang menenangkan & mewah.'
  },
  {
    name: 'Matcha Zen Garden',
    primary: '#166534', // Forest/Matcha green
    accent: '#84CC16',  // Fresh lime
    bg: '#F0FDF4',      // Soft sage mint
    desc: 'Nuansa hijau teh matcha Jepang segar & natural.'
  },
  {
    name: 'Berry Sunset',
    primary: '#831843', // Deep rose berry
    accent: '#F43F5E',  // Pink/Rose
    bg: '#FFF1F2',      // Soft blush
    desc: 'Nuansa modern chic, manis, dan estetik kekinian.'
  },
  {
    name: 'Royal Velvet & Gold',
    primary: '#1E1B4B', // Midnight indigo
    accent: '#EAB308',  // Luxury gold
    bg: '#F8FAFC',      // Crisp light slate
    desc: 'Nuansa cafe premium berkelas dan elegan.'
  },
  {
    name: 'Minimalist Charcoal',
    primary: '#18181B', // Charcoal black
    accent: '#71717A',  // Zinc gray
    bg: '#FAFAFA',      // Minimal white
    desc: 'Gaya industrial minimalis modern perkotaan.'
  }
];

export default function AdminBranding() {
  const { token } = useAuth();
  const { branding, updateBranding, refreshBranding } = useBranding();

  // Form state
  const [form, setForm] = useState({
    cafe_name: branding?.cafe_name || 'Kopi Senja Nusantara',
    cafe_tagline: branding?.cafe_tagline || '',
    cafe_address: branding?.cafe_address || '',
    cafe_phone: branding?.cafe_phone || '',
    logo_url: branding?.logo_url || '',
    primary_color: branding?.primary_color || '#78350F',
    accent_color: branding?.accent_color || '#D97706',
    background_color: branding?.background_color || '#FFFBEB',
    paper_width: branding?.paper_width || '58mm',
    footer_message: branding?.footer_message || ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(branding?.logo_url || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (branding) {
      setForm({
        cafe_name: branding.cafe_name || 'Kopi Senja Nusantara',
        cafe_tagline: branding.cafe_tagline || '',
        cafe_address: branding.cafe_address || '',
        cafe_phone: branding.cafe_phone || '',
        logo_url: branding.logo_url || '',
        primary_color: branding.primary_color || '#78350F',
        accent_color: branding.accent_color || '#D97706',
        background_color: branding.background_color || '#FFFBEB',
        paper_width: branding.paper_width || '58mm',
        footer_message: branding.footer_message || ''
      });
      setLogoPreview(branding.logo_url || '');
    }
  }, [branding]);

  // Handle logo file selection with instant client-side preview
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply a preset theme
  const applyPreset = (preset) => {
    setForm(prev => ({
      ...prev,
      primary_color: preset.primary,
      accent_color: preset.accent,
      background_color: preset.bg
    }));
  };

  // Save branding changes to server
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      let finalLogoUrl = form.logo_url;

      // If a new logo file was uploaded, upload it first
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await fetch('/api/branding/logo', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (uploadRes.ok) {
          const uData = await uploadRes.json();
          finalLogoUrl = uData.logo_url;
        }
      }

      // Update remaining branding fields
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          logo_url: finalLogoUrl
        })
      });

      if (res.ok) {
        const updated = await res.json();
        updateBranding(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        alert('Gagal menyimpan branding.');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan pengaturan branding.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default branding
  const handleReset = async () => {
    if (!confirm('Kembalikan logo, nama, dan palet warna ke pengaturan default bawaan?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/branding/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const resetData = await res.json();
        updateBranding(resetData);
        setLogoFile(null);
        setLogoPreview('');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert('Gagal mereset branding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <Palette size={26} className="text-amber-800" />
              <span>Branding & Template Cafe (Logo & Warna)</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Sesuaikan identitas visual cafe Anda. Perubahan langsung tercermin di header pelanggan, dashboard staf, dan struk kasir.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Reset ke Default</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>Pengaturan branding berhasil disimpan dan telah diterapkan ke seluruh modul aplikasi secara global!</span>
          </div>
        )}

        {/* 2-Columns Grid: Form on Left, Live Interactive Previews on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ============================================================= */}
          {/* COLUMN 1: FORM PENGATURAN (Col 7) */}
          {/* ============================================================= */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <form onSubmit={handleSave} noValidate className="space-y-6">
              {/* 1. Cafe Identity */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Coffee size={16} className="text-amber-800" />
                  <span>Identitas & Informasi Cafe</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Nama Cafe:</label>
                    <input
                      type="text"
                      required
                      value={form.cafe_name}
                      onChange={(e) => setForm({ ...form, cafe_name: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-black text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Tagline Cafe:</label>
                    <input
                      type="text"
                      value={form.cafe_tagline}
                      onChange={(e) => setForm({ ...form, cafe_tagline: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nomor Telepon Cafe:</label>
                    <input
                      type="text"
                      value={form.cafe_phone}
                      onChange={(e) => setForm({ ...form, cafe_phone: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Format Lebar Kertas Struk:</label>
                    <select
                      value={form.paper_width}
                      onChange={(e) => setForm({ ...form, paper_width: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                    >
                      <option value="58mm">58mm (Printer Kasir Kompak)</option>
                      <option value="80mm">80mm (Printer Kasir Standar)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Alamat Cafe:</label>
                    <input
                      type="text"
                      value={form.cafe_address}
                      onChange={(e) => setForm({ ...form, cafe_address: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Pesan Footer Struk:</label>
                    <input
                      type="text"
                      value={form.footer_message}
                      onChange={(e) => setForm({ ...form, footer_message: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Logo Upload */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Upload size={16} className="text-amber-800" />
                  <span>Logo Cafe</span>
                </h3>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Coffee size={28} className="text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-900 hover:file:bg-amber-100 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 shrink-0">Atau URL / Path:</span>
                      <input
                        type="text"
                        value={form.logo_url}
                        onChange={(e) => {
                          setForm({ ...form, logo_url: e.target.value });
                          setLogoPreview(e.target.value);
                        }}
                        placeholder="https://.../logo.png atau /uploads/..."
                        className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, logo_url: '' });
                            setLogoFile(null);
                            setLogoPreview('');
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold shrink-0"
                          title="Hapus Logo"
                        >
                          Hapus Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Color Palette & Presets */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Palette size={16} className="text-amber-800" />
                  <span>Palet Warna Tema Cafe</span>
                </h3>

                {/* Preset Buttons */}
                <p className="text-xs text-gray-500 mb-3">
                  Pilih preset tema cepat atau sesuaikan warna secara manual lewat color picker di bawah:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {THEME_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-left transition flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-xs text-gray-900">{preset.name}</p>
                        <p className="text-[10px] text-gray-500">{preset.desc}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primary }} />
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accent }} />
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: preset.bg }} />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Color Pickers */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Warna Primer</label>
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="w-12 h-10 rounded-lg cursor-pointer mx-auto block border-0"
                    />
                    <span className="text-[10px] font-mono text-gray-500 mt-1 block uppercase">
                      {form.primary_color}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Warna Aksen</label>
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      className="w-12 h-10 rounded-lg cursor-pointer mx-auto block border-0"
                    />
                    <span className="text-[10px] font-mono text-gray-500 mt-1 block uppercase">
                      {form.accent_color}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Warna Latar</label>
                    <input
                      type="color"
                      value={form.background_color}
                      onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                      className="w-12 h-10 rounded-lg cursor-pointer mx-auto block border-0"
                    />
                    <span className="text-[10px] font-mono text-gray-500 mt-1 block uppercase">
                      {form.background_color}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-white shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  style={{ backgroundColor: form.primary_color || '#78350F' }}
                >
                  <Save size={18} />
                  <span>{saving ? 'Menyimpan Perubahan...' : 'Simpan & Terapkan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ============================================================= */}
          {/* COLUMN 2: LIVE INTERACTIVE PREVIEWS (Col 5) */}
          {/* ============================================================= */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-amber-700" />
              <h2 className="text-base font-bold text-gray-900">Live Preview Real-Time</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold uppercase">
                Pratinjau
              </span>
            </div>

            {/* Preview 1: Customer Mobile Screen Mockup */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-md">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                <Smartphone size={14} />
                <span>Tampilan Header Pelanggan</span>
              </div>

              <div
                className="rounded-2xl p-4 text-white shadow-sm transition-all"
                style={{ backgroundColor: form.primary_color }}
              >
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="w-10 h-10 rounded-xl object-contain bg-white/20 p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Coffee size={20} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm leading-tight">
                      {form.cafe_name || 'Nama Cafe Anda'}
                    </h4>
                    <p className="text-xs text-white/80 line-clamp-1">
                      {form.cafe_tagline || 'Tagline Cafe'}
                    </p>
                  </div>
                </div>

                {/* Simulated category pill & cart button */}
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                  <span
                    className="px-2.5 py-1 rounded-full font-bold text-[11px] text-gray-900"
                    style={{ backgroundColor: form.accent_color }}
                  >
                    Kopi Spesialti
                  </span>
                  <span className="text-[11px] text-white/90 font-mono">Meja #5 Terdeteksi</span>
                </div>
              </div>

              {/* Simulated Menu Card in Live Theme */}
              <div
                className="mt-3 p-3 rounded-2xl border transition-all"
                style={{ backgroundColor: form.background_color, borderColor: `${form.accent_color}40` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-gray-900">Kopi Susu Gula Aren</p>
                    <p className="text-[11px] text-gray-500">Rp 22.000</p>
                  </div>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Preview 2: Thermal Receipt Print Preview */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-md">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                <Printer size={14} />
                <span>Tampilan Struk Thermal ({form.paper_width})</span>
              </div>

              <div
                className="bg-white p-4 text-black font-thermal text-[11px] border border-dashed border-gray-400 mx-auto shadow-inner"
                style={{ width: form.paper_width === '58mm' ? '250px' : '320px' }}
              >
                <div className="text-center pb-2 border-b border-black border-dashed">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-10 h-10 object-contain mx-auto mb-1 filter grayscale contrast-200"
                    />
                  )}
                  <h4 className="font-bold uppercase text-xs">{form.cafe_name || 'NAMA CAFE'}</h4>
                  <p className="text-[9px]">{form.cafe_address || 'Alamat Cafe'}</p>
                  <p className="text-[9px]">Telp: {form.cafe_phone || '0812-xxx'}</p>
                </div>

                <div className="py-2 border-b border-black border-dashed space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Meja 4</span>
                    <span>#ORD-20260906-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Kopi Susu Senja</span>
                    <span>Rp 22.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Nasi Goreng Spesial</span>
                    <span>Rp 35.000</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-black border-dashed">
                    <span>TOTAL CASH:</span>
                    <span>Rp 57.000</span>
                  </div>
                </div>

                <div className="pt-2 text-center text-[9px] text-gray-600">
                  <p>{form.footer_message || 'Terima kasih atas kunjungan Anda!'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
