import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../../i18n/index.js';

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'ar', flag: '🇲🇦', label: 'ع' },
];

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language || 'fr';

  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
      {LANGS.map(({ code, flag, label }) => (
        <button
          key={code}
          onClick={() => setAppLanguage(code)}
          title={code === 'fr' ? 'Français' : code === 'en' ? 'English' : 'العربية'}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
            transition-all duration-150
            ${current === code
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'}
          `}
        >
          {!compact && <span>{flag}</span>}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
