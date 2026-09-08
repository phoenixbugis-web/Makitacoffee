import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext(null);

export const DEFAULT_BRANDING = {
  cafe_name: 'Kopi Senja Nusantara',
  cafe_tagline: 'Artisan Coffee & Comfort Food Indonesia',
  cafe_address: 'Jl. Malioboro No. 45, Danurejan, Yogyakarta',
  cafe_phone: '0812-3456-7890',
  logo_url: '',
  primary_color: '#78350F',
  accent_color: '#D97706',
  background_color: '#FFFBEB',
  paper_width: '58mm',
  footer_message: 'Terima kasih atas kunjungan Anda di Kopi Senja Nusantara! Simpan struk ini untuk promo berikutnya.'
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const applyColorsToRoot = (theme) => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.primary_color) root.style.setProperty('--brand-primary', theme.primary_color);
    if (theme.accent_color) root.style.setProperty('--brand-accent', theme.accent_color);
    if (theme.background_color) root.style.setProperty('--brand-bg', theme.background_color);
  };

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        if (data && data.cafe_name) {
          setBranding(data);
          applyColorsToRoot(data);
        }
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const updateBranding = (newBranding) => {
    setBranding(newBranding);
    applyColorsToRoot(newBranding);
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, refreshBranding: fetchBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
