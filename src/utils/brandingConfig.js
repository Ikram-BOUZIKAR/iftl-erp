// Build-time branding constants — safe to import anywhere (no React hook needed)
export const INSTITUTE_NAME = import.meta.env.VITE_DEFAULT_INSTITUTE_NAME || 'IFTL';
export const EMAIL_DOMAIN   = import.meta.env.VITE_EMAIL_DOMAIN || 'iftl.ma';
export const IS_DEMO        = import.meta.env.MODE === 'demo';
export const LOGO_URL       = import.meta.env.VITE_DEFAULT_LOGO_URL || '';

// Initials for text-only logo fallback (up to 3 chars)
export const INSTITUTE_INITIALS = INSTITUTE_NAME
  .split(/\s+/)
  .map(w => w[0])
  .join('')
  .slice(0, 3)
  .toUpperCase();
