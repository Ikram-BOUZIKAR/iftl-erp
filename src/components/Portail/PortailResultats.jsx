import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query as fsQuery, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
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

// ── Licence CNAM result card ────────────────────────────────────────────────
const CNAM_COLOR = '#4A148C';

function LicenceResultCard({ nom, prenom, groupe, modules }) {
  const validMods = modules.filter(m => m.moy !== null && m.moy !== undefined);
  const totalCoeff = validMods.reduce((s, m) => s + (Number(m.coeff) || 1), 0);
  const moyGen = totalCoeff > 0
    ? validMods.reduce((s, m) => s + Number(m.moy) * (Number(m.coeff) || 1), 0) / totalCoeff
    : null;

  const moyColor = (v) => v >= 10 ? '#166534' : v >= 8 ? '#92400e' : '#991b1b';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-6 max-w-2xl mx-auto">
      <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${CNAM_COLOR}, #7B1FA2)` }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white text-lg font-bold">{prenom?.[0]}{nom?.[0]}</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{prenom} {nom}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                      style={{ background: 'rgba(255,255,255,0.2)' }}>Licence CNAM</span>
                <span className="text-white/70 text-xs">{groupe}</span>
              </div>
            </div>
          </div>
          {moyGen !== null && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-white leading-none">
                {moyGen.toFixed(2)}<span className="text-xs font-normal text-white/60 ml-1">/20</span>
              </p>
              <p className="text-white/60 text-xs mt-0.5">Moy. pondérée</p>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-4 py-2.5 text-left font-medium">Module</th>
              <th className="px-3 py-2.5 text-center font-medium w-12">Coef.</th>
              <th className="px-3 py-2.5 text-center font-medium w-14">CTL</th>
              <th className="px-3 py-2.5 text-center font-medium w-14">EFM</th>
              <th className="px-3 py-2.5 text-center font-medium w-16">Moy.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {modules.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5 text-slate-700 font-medium">{m.moduleNom}</td>
                <td className="px-3 py-2.5 text-center text-slate-400">{m.coeff}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                  {m.ctl !== null && m.ctl !== undefined ? Number(m.ctl).toFixed(2) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                  {m.efm !== null && m.efm !== undefined ? Number(m.efm).toFixed(2) : '—'}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums font-bold"
                    style={{ color: m.moy !== null ? moyColor(Number(m.moy)) : '#cbd5e1' }}>
                  {m.moy !== null && m.moy !== undefined ? Number(m.moy).toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PortailResultats() {
  const [tab, setTab] = useState('ts');

  // TS tab state
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState(null);

  // Licence tab state
  const [codeCnam, setCodeCnam]     = useState('');
  const [nomInput, setNomInput]     = useState('');
  const [licSearched, setLicSearched] = useState(false);
  const [licLoading,  setLicLoading]  = useState(false);
  const [licResult,   setLicResult]   = useState(null);
  const [licError,    setLicError]    = useState('');

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setSearched(true);
    setResult(findStudent(query.trim()));
  }, [query]);

  const handleLicenceSearch = useCallback(async () => {
    const code = codeCnam.trim().toUpperCase();
    const nom   = nomInput.trim().toUpperCase();
    if (!code || !nom) return;
    setLicSearched(true);
    setLicLoading(true);
    setLicResult(null);
    setLicError('');
    try {
      const snap = await getDocs(
        fsQuery(collection(db, 'historique_notes'), where('studentCode', '==', code))
      );
      if (snap.empty) { setLicError('notfound'); setLicLoading(false); return; }
      const docs = snap.docs.map(d => d.data());
      const storedNom = normalize(docs[0]?.nom || '');
      const inputNom  = normalize(nom);
      if (!storedNom || (!storedNom.includes(inputNom) && !inputNom.includes(storedNom))) {
        setLicError('nomMismatch');
        setLicLoading(false);
        return;
      }
      const sorted = docs.sort((a, b) => (a.moduleCode || '').localeCompare(b.moduleCode || ''));
      setLicResult({
        nom:    docs[0]?.nom    || '',
        prenom: docs[0]?.prenom || '',
        groupe: docs[0]?.groupeLabel || '',
        modules: sorted,
      });
    } catch { setLicError('error'); }
    finally { setLicLoading(false); }
  }, [codeCnam, nomInput]);

  const stats = { total: PORTAIL_DATA.length };

  const TAB_BTN = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className="px-5 py-2 rounded-full text-sm font-bold transition-all"
      style={tab === id
        ? { background: BRAND.red, color: '#fff' }
        : { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)' }}
    >
      {label}
    </button>
  );

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
          <div className="flex justify-center gap-2 mt-5">
            {TAB_BTN('ts',      'TS 1A / 2A')}
            {TAB_BTN('licence', 'Licence CNAM')}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4">
        {/* ── TS tab ── */}
        {tab === 'ts' && (
          <>
            <div className="bg-white rounded-b-2xl shadow-lg px-6 py-6 -mt-px">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ background: BRAND.red }}>🔍</span>
                Rechercher vos résultats
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSearched(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Numéro CIN (ex: BK12345) ou code (ex: TS0123)"
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold tracking-wide bg-slate-50 focus:outline-none transition-all"
                  style={{ textTransform: 'uppercase' }}
                  onFocus={e => { e.target.style.borderColor = BRAND.red; e.target.style.boxShadow = `0 0 0 3px ${BRAND.red}18`; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
                <button onClick={handleSearch}
                  className="px-5 py-3 rounded-xl text-white font-bold text-sm"
                  style={{ background: BRAND.red }}>
                  Rechercher
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Saisissez votre CIN ou code apprenant</p>
            </div>
            {searched && !result && (
              <div className="mt-6 bg-white rounded-2xl p-6 text-center shadow">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold text-slate-700">Aucun résultat trouvé</p>
                <p className="text-sm text-slate-400 mt-1">Vérifiez votre CIN ou code apprenant</p>
              </div>
            )}
            {result && <ResultCard student={result} />}
          </>
        )}

        {/* ── Licence CNAM tab ── */}
        {tab === 'licence' && (
          <>
            <div className="bg-white rounded-b-2xl shadow-lg px-6 py-6 -mt-px">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
                      style={{ background: CNAM_COLOR }}>🔍</span>
                Consulter vos résultats — Licence CNAM
              </label>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Code CNAM</p>
                  <input
                    type="text"
                    value={codeCnam}
                    onChange={e => { setCodeCnam(e.target.value); setLicSearched(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleLicenceSearch()}
                    placeholder="ex : MAR655197"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold tracking-wide bg-slate-50 focus:outline-none transition-all"
                    style={{ textTransform: 'uppercase' }}
                    onFocus={e => { e.target.style.borderColor = CNAM_COLOR; e.target.style.boxShadow = `0 0 0 3px ${CNAM_COLOR}22`; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Nom de famille</p>
                  <input
                    type="text"
                    value={nomInput}
                    onChange={e => { setNomInput(e.target.value); setLicSearched(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleLicenceSearch()}
                    placeholder="ex : BENALI"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold tracking-wide bg-slate-50 focus:outline-none transition-all"
                    style={{ textTransform: 'uppercase' }}
                    onFocus={e => { e.target.style.borderColor = CNAM_COLOR; e.target.style.boxShadow = `0 0 0 3px ${CNAM_COLOR}22`; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <button
                  onClick={handleLicenceSearch}
                  disabled={licLoading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                  style={{ background: CNAM_COLOR }}
                >
                  {licLoading ? 'Recherche en cours…' : 'Consulter mes résultats'}
                </button>
              </div>
            </div>

            {licSearched && !licLoading && !licResult && (
              <div className="mt-6 bg-white rounded-2xl p-6 text-center shadow">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold text-slate-700">
                  {licError === 'nomMismatch'
                    ? 'Le nom saisi ne correspond pas à ce code CNAM'
                    : licError === 'notfound'
                    ? 'Aucun résultat trouvé pour ce code CNAM'
                    : 'Une erreur est survenue, veuillez réessayer'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Vérifiez votre code CNAM et votre nom de famille
                </p>
              </div>
            )}

            {licResult && (
              <LicenceResultCard
                nom={licResult.nom}
                prenom={licResult.prenom}
                groupe={licResult.groupe}
                modules={licResult.modules}
              />
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 mb-6 text-center">
          <p className="text-xs text-slate-400">Année académique 2025-2026</p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold transition-colors"
                style={{ color: BRAND.blue }}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
