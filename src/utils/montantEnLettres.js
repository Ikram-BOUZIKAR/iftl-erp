const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function lt100(n) {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return 'soixante-' + UNITS[10 + u];
  if (t === 8) return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + UNITS[u];
  if (t === 9) return 'quatre-vingt-' + UNITS[10 + u];
  if (u === 0) return TENS[t];
  if (u === 1) return TENS[t] + '-et-un';
  return TENS[t] + '-' + UNITS[u];
}

function lt1000(n) {
  if (n < 100) return lt100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const hWord = h === 1 ? 'cent' : UNITS[h] + ' cent' + (r === 0 ? 's' : '');
  return hWord + (r ? ' ' + lt100(r) : '');
}

export function montantEnLettres(montant) {
  const n = Math.floor(Number(montant) || 0);
  if (n === 0) return 'Zéro dirham';

  const parts = [];
  const millions = Math.floor(n / 1_000_000);
  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : lt1000(millions) + ' millions');
  }
  const thousands = Math.floor((n % 1_000_000) / 1000);
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : lt1000(thousands) + ' mille');
  }
  const remainder = n % 1000;
  if (remainder > 0) {
    parts.push(lt1000(remainder));
  }

  let result = parts.join(' ');
  result = result.charAt(0).toUpperCase() + result.slice(1);

  const centimes = Math.round((Number(montant) - n) * 100);
  if (centimes > 0) {
    result += ' et ' + lt100(centimes) + ' centime' + (centimes > 1 ? 's' : '');
  }
  result += ' dirhams';
  return result;
}
