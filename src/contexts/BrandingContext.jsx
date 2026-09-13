import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';

const DEFAULT_BRANDING = {
  primaryColor: '#005989',
  accentColor: '#f5c845',
  logoURL: '',
  instituteName: '',
  layout: 'sidebar', // 'sidebar' | 'topnav' | 'saas'
};

const BrandingContext = createContext(null);

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function darken(hex, amount = 20) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lighten(hex, amount = 220) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function applyBrandingVars(branding) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', branding.primaryColor);
  root.style.setProperty('--brand-primary-dark', darken(branding.primaryColor, 20));
  root.style.setProperty('--brand-primary-light', lighten(branding.primaryColor, 220));
  root.style.setProperty('--brand-primary-rgb', hexToRgb(branding.primaryColor));
  root.style.setProperty('--brand-accent', branding.accentColor);
  root.style.setProperty('--brand-accent-dark', darken(branding.accentColor, 20));
}

export function BrandingProvider({ children }) {
  const [branding, setBrandingState] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'branding'))
      .then(snap => {
        if (snap.exists()) {
          const data = { ...DEFAULT_BRANDING, ...snap.data() };
          setBrandingState(data);
          applyBrandingVars(data);
        } else {
          applyBrandingVars(DEFAULT_BRANDING);
        }
      })
      .catch(() => applyBrandingVars(DEFAULT_BRANDING))
      .finally(() => setLoading(false));
  }, []);

  const saveBranding = useCallback(async (newBranding) => {
    await setDoc(doc(db, 'settings', 'branding'), {
      ...newBranding,
      updatedAt: new Date(),
    });
    setBrandingState(newBranding);
    applyBrandingVars(newBranding);
  }, []);

  const uploadLogo = useCallback(async (file) => {
    const storageRef = ref(storage, `branding/logo_${Date.now()}.${file.name.split('.').pop()}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, saveBranding, uploadLogo, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used inside BrandingProvider');
  return ctx;
}

export default BrandingProvider;
