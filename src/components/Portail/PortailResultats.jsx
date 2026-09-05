import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PORTAIL_DATA } from '../../data/portailData';

const BRAND = { blue: '#005989', yellow: '#f5c845', red: '#c8141b', green: '#c8d45d', orange: '#d75930' };

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findStudent(query) {
  const q = normalize(query);
  if (!q || q.length < 3) return null;
  return PORTAIL_DATA.find(s =>
    normalize(s.cin) === q ||
    normalize(s.code) === q ||
    normalize(s.nom + s.prenom) === q ||
    normalize(s.prenom + s.nom) === q
  ) || null;
}

function StatutBadge({ statut, large }) {
  const cfg = {
    'V':        { bg: '#d4edda', fg: '#155724', brd: '#b8dfc5', label: 'Validé' },
    'NV':       { bg: '#fddede', fg: '#721c24', brd: '#f5b8bb', label: 'Non validé' },
    'ABS':      { bg: '#fff3cd', fg: '#856404', brd: '#ffc107', label: 'ABS' },
    'Admis':    { bg: '#d4edda', fg: '#155724', brd: '#b8dfc5', label: 'Admis' },
    'Non Admis':{ bg: '#fddede', fg: '#721c24', brd: '#f5b8bb', label: 'Non Admis' },
    'Rattrapage':{ bg: '#fff3cd', fg: '#856404', brd: '#ffc107', label: 'Rattrapage' },
    '—':        { bg: '#f3f4f6', fg: '#6b7280', brd: '#e5e7eb', label: 'En attente' },
    '':         { bg: '#f3f4f6', fg: '#6b7280', brd: '#e5e7eb', label: 'En attente' },
  };
  const c = cfg[statut] || cfg['—'];
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`}
      style={{ background: c.bg, color: c.fg, border: `1px solid ${c.brd}` }}
    >
      {c.label}
    </span>
  );
}

function NiveauBadge({ annee }) {
  const cfg = {
    '1A TS':       { bg: '#1565C0', label: '1A TS' },
    '2A TS':       { bg: '#2E7D32', label: '2A TS' },
    'Licence CNAM':{ bg: '#6D4C41', label: 'Licence CNAM' },
  };
  const c = cfg[annee] || { bg: BRAND.blue, label: annee };
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: c.bg }}>
      {c.label}
    </span>
  );
}

function ResultCard({ student }) {
  const hasGrades = student.modules?.some(m => m.grade && m.grade !== '—');
  const hasMoy = student.moy && student.moy !== '—';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, #003d63 100%)` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white text-lg font-bold">
                {student.prenom?.[0]}{student.nom?.[0]}
              </span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">
                {student.prenom} {student.nom}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <NiveauBadge annee={student.annee} />
                <span className="text-white/70 text-xs">{student.groupe}</span>
              </div>
            </div>
          </div>
          {student.statut_global && (
            <div className="shrink-0 mt-1">
              <StatutBadge statut={student.statut_global} large />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-white/60 text-xs">Code</p>
            <p className="text-white font-semibold text-sm">{student.code || '—'}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">CIN</p>
            <p className="text-white font-semibold text-sm">{student.cin}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Naissance</p>
            <p className="text-white font-semibold text-sm">{student.date}</p>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="p-5">
        {hasMoy && (
          <div className="mb-4 p-3 rounded-xl flex items-center justify-between"
               style={{ background: '#f0f9ff', border: `1px solid ${BRAND.blue}30` }}>
            <span className="font-semibold text-sm" style={{ color: BRAND.blue }}>Moyenne générale</span>
            <span className="text-xl font-black" style={{ color: BRAND.blue }}>{student.moy}/20</span>
          </div>
        )}

        {student.modules?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Modules ({student.modules.length})
            </p>
            {student.modules.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.module}</p>
                  {m.coeff && <p className="text-xs text-slate-400">Coeff. {m.coeff}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {m.grade && m.grade !== '—' && (
                    <span className="text-sm font-bold text-slate-700 tabular-nums w-10 text-right">
                      {m.grade}
                    </span>
                  )}
                  <StatutBadge statut={m.statut} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">Aucun résultat disponible</p>
        )}

        {!hasGrades && !hasMoy && (
          <div className="mt-3 p-3 rounded-xl text-center"
               style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-sm font-medium" style={{ color: '#92400e' }}>
              Les résultats de cette session sont en cours de publication
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortailResultats() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setSearched(true);
    setResult(findStudent(query.trim()));
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const stats = {
    total: PORTAIL_DATA.length,
    niveaux: [...new Set(PORTAIL_DATA.map(s => s.annee))],
  };

  return (
    <div className="min-h-screen" style={{ background: '#eef1f6' }}>
      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, #9e0f14 0%, ${BRAND.red} 60%, #d94f55 100%)` }}>
        <div className="max-w-2xl mx-auto px-5 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
               style={{ background: BRAND.yellow }}>
            <span className="font-black text-base" style={{ color: BRAND.blue }}>IF</span>
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">Portail Résultats</h1>
          <p className="text-white/75 text-sm mt-1">Institut — Année académique 2025-2026</p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {stats.niveaux.map(n => (
              <span key={n} className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.25)' }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-b-2xl shadow-lg px-6 py-6 -mt-px">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
                  style={{ background: BRAND.red }}>
              🔍
            </span>
            Rechercher vos résultats
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSearched(false); }}
              onKeyDown={handleKeyDown}
              placeholder="Numéro CIN ou code apprenant (ex: TS0123)"
              className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold tracking-wide bg-slate-50 focus:outline-none transition-all"
              style={{ textTransform: 'uppercase' }}
              onFocus={e => { e.target.style.borderColor = BRAND.red; e.target.style.boxShadow = `0 0 0 3px ${BRAND.red}18`; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              onClick={handleSearch}
              className="px-5 py-3 rounded-xl text-white font-bold text-sm transition-all"
              style={{ background: BRAND.red }}
              onMouseEnter={e => e.target.style.background = '#9e0f14'}
              onMouseLeave={e => e.target.style.background = BRAND.red}
            >
              Rechercher
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Saisissez votre CIN (ex: BK12345) ou votre code apprenant (ex: TS0123, MAR123456)
          </p>
        </div>

        {/* Result */}
        {searched && !result && (
          <div className="mt-6 bg-white rounded-2xl p-6 text-center shadow">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-slate-700">Aucun résultat trouvé</p>
            <p className="text-sm text-slate-400 mt-1">
              Vérifiez votre CIN ou code apprenant et réessayez
            </p>
          </div>
        )}

        {result && <ResultCard student={result} />}

        {/* Stats footer */}
        <div className="mt-8 mb-6 text-center">
          <p className="text-xs text-slate-400">
            {stats.total} apprenants · {stats.niveaux.join(', ')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Données intégrées · Année académique 2025-2026
          </p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold transition-colors"
                style={{ color: BRAND.blue }}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
