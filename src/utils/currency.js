export const DEVISES = [
  { code: 'MAD', symbol: 'DH',   locale: 'fr-MA', label: 'Dirham marocain (MAD)' },
  { code: 'EUR', symbol: '€',    locale: 'fr-FR', label: 'Euro (EUR)' },
  { code: 'USD', symbol: '$',    locale: 'en-US', label: 'Dollar américain (USD)' },
  { code: 'XOF', symbol: 'FCFA', locale: 'fr-SN', label: 'Franc CFA – UEMOA (XOF)' },
  { code: 'XAF', symbol: 'FCFA', locale: 'fr-CM', label: 'Franc CFA – BEAC (XAF)' },
  { code: 'TND', symbol: 'DT',   locale: 'fr-TN', label: 'Dinar tunisien (TND)' },
  { code: 'DZD', symbol: 'DA',   locale: 'fr-DZ', label: 'Dinar algérien (DZD)' },
];

function getDevise(code) {
  return DEVISES.find(d => d.code === (code || 'MAD')) || DEVISES[0];
}

export function formatCurrency(amount, deviseCode = 'MAD') {
  if (amount == null || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  const d = getDevise(deviseCode);
  return new Intl.NumberFormat(d.locale, { minimumFractionDigits: 0 }).format(num) + ' ' + d.symbol;
}

export function getCurrencySymbol(deviseCode = 'MAD') {
  return getDevise(deviseCode).symbol;
}
