import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query as fsQuery, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PORTAIL_DATA } from '../../data/portailData';

const BLUE  = '#005989';
const RED   = '#c8141b';
const PURPLE = '#5b21b6';

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findStudent(q) {
  const s = normalize(q);
  if (!s || s.length < 3) return null;
  return PORTAIL_DATA.find(x =>
    normalize(x.cin) === s || normalize(x.code) === s ||
    normalize(x.nom + x.prenom) === s || normalize(x.prenom + x.nom) === s
  ) || null;
}

function gradeColor(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return { text: '#94a3b8', bg: 'transparent' };
  if (n >= 10) return { text: '#166534', bg: '#dcfce7' };
  if (n >= 8)  return { text: '#92400e', bg: '#fef3c7' };
  return { text: '#991b1b', bg: '#fee2e2' };
}

// ── Icônes inline ─────────────────────────────────────────────────────────────
function IcoSearch() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>;
}
function IcoUser() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function IcoChevron() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>;
}

// ── Statut badge TS ───────────────────────────────────────────────────────────
function StatutBadge({ statut }) {
  const cfg = {
    'V':         { bg: '#dcfce7', fg: '#166534', label: 'Validé' },
    'NV':        { bg: '#fee2e2', fg: '#991b1b', label: 'Non validé' },
    'ABS':       { bg: '#fef3c7', fg: '#92400e', label: 'Absent' },
    'Admis':     { bg: '#dcfce7', fg: '#166534', label: 'Admis' },
    'Non Admis': { bg: '#fee2e2', fg: '#991b1b', label: 'Non admis' },
    'Rattrapage':{ bg: '#fef3c7', fg: '#92400e', label: 'Rattrapage' },
    '—':         { bg: '#f1f5f9', fg: '#64748b', label: 'En attente' },
    '':          { bg: '#f1f5f9', fg: '#64748b', label: 'En attente' },
  };
  const c = cfg[statut] || cfg['—'];
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: c.bg, color: c.fg }}>{c.label}</span>
  );
}

// ── Carte résultat TS ─────────────────────────────────────────────────────────
function ResultCard({ student }) {
  const hasMoy = student.moy && student.moy !== '—';
  const moyC = hasMoy ? gradeColor(student.moy) : null;

  const niveauCfg = {
    '1A TS': { bg: '#1d4ed8', label: '1A TS' },
    '2A TS': { bg: '#15803d', label: '2A TS' },
    'Licence CNAM': { bg: PURPLE, label: 'Licence CNAM' },
  };
  const niveau = niveauCfg[student.annee] || { bg: BLUE, label: student.annee };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mt-5 border border-slate-100">
      {/* En-tête */}
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${BLUE}, #0077b6)` }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white font-black text-base">
              {student.prenom?.[0]}{student.nom?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white font-black text-base leading-tight truncate">
                {student.prenom} {student.nom}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white"
                      style={{ background: niveau.bg }}>{niveau.label}</span>
                <span className="text-white/60 text-[11px]">{student.groupe}</span>
              </div>
            </div>
          </div>
          {student.statut_global && (
            <div className="shrink-0">
              <StatutBadge statut={student.statut_global} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-white/15">
          {[['Code', student.code || '—'], ['CIN', student.cin], ['Naissance', student.date]].map(([label, val]) => (
            <div key={label}>
              <p className="text-white/50 text-[10px] font-medium uppercase tracking-wide">{label}</p>
              <p className="text-white font-semibold text-[13px] mt-0.5 truncate">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Corps */}
      <div className="p-4">
        {hasMoy && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
               style={{ background: moyC.bg }}>
            <span className="text-sm font-semibold" style={{ color: moyC.text }}>Moyenne générale</span>
            <span className="text-xl font-black tabular-nums" style={{ color: moyC.text }}>
              {student.moy}<span className="text-xs font-normal opacity-60">/20</span>
            </span>
          </div>
        )}

        {student.modules?.length > 0 ? (
          <>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
              {student.modules.length} modules
            </p>
            <div className="divide-y divide-slate-50">
              {student.modules.map((m, i) => {
                const gc = m.grade && m.grade !== '—' ? gradeColor(m.grade) : null;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-700 truncate">{m.module}</p>
                      {m.coeff && <p className="text-[11px] text-slate-400">Coeff. {m.coeff}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {gc && (
                        <span className="text-[13px] font-black tabular-nums px-2 py-0.5 rounded-lg"
                              style={{ background: gc.bg, color: gc.text }}>{m.grade}</span>
                      )}
                      <StatutBadge statut={m.statut} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">Résultats en cours de publication</p>
            <p className="text-xs text-slate-400 mt-1">Revenez prochainement</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carte résultat Licence CNAM ───────────────────────────────────────────────
function LicenceResultCard({ nom, prenom, groupe, modules }) {
  const moyColor = (v) => v >= 10 ? { text: '#166534', bg: '#dcfce7' } : v >= 8 ? { text: '#92400e', bg: '#fef3c7' } : { text: '#991b1b', bg: '#fee2e2' };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mt-5 border border-slate-100">
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)` }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white font-black text-base">
            {prenom?.[0]}{nom?.[0]}
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">{prenom} {nom}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>Licence CNAM</span>
              <span className="text-white/60 text-[11px]">{groupe}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-white/50 text-[11px]">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Résultats partiels — moyenne générale et résultats finaux disponibles en octobre
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Module</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-12">ECTS</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-14">CTL</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-14">EFM</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-16">Moy.</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m, i) => {
              const hasMoy = m.moy !== null && m.moy !== undefined;
              const mc = hasMoy ? moyColor(Number(m.moy)) : null;
              return (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-slate-700 font-medium text-[12px] leading-snug">{m.moduleNom}</td>
                  <td className="px-3 py-3 text-center text-slate-400 font-medium">{m.coeff}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                    {m.ctl !== null && m.ctl !== undefined ? Number(m.ctl).toFixed(2) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                    {m.efm !== null && m.efm !== undefined ? Number(m.efm).toFixed(2) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasMoy ? (
                      <span className="font-black tabular-nums text-[13px] px-2 py-0.5 rounded-lg"
                            style={{ background: mc.bg, color: mc.text }}>
                        {Number(m.moy).toFixed(2)}
                      </span>
                    ) : <span className="text-slate-300 font-medium">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Champ de saisie ───────────────────────────────────────────────────────────
function SearchInput({ value, onChange, onKeyDown, placeholder, accentColor, uppercase = true }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 focus:outline-none transition-all"
      style={{
        border: `2px solid ${focused ? accentColor : '#e2e8f0'}`,
        boxShadow: focused ? `0 0 0 3px ${accentColor}18` : 'none',
        textTransform: uppercase ? 'uppercase' : 'none',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function PortailResultats() {
  const [tab, setTab] = useState('ts');

  const [query,    setQuery]    = useState('');
  const [searched, setSearched] = useState(false);
  const [result,   setResult]   = useState(null);

  const [codeCnam,    setCodeCnam]    = useState('');
  const [nomInput,    setNomInput]    = useState('');
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
    const nom  = nomInput.trim().toUpperCase();
    if (!code || !nom) return;
    setLicSearched(true);
    setLicLoading(true);
    setLicResult(null);
    setLicError('');
    try {
      const snap = await getDocs(
        fsQuery(collection(db, 'historique_notes'), where('studentCode', '==', code))
      );
      if (snap.empty) { setLicError('notfound'); return; }
      const docs = snap.docs.map(d => d.data());
      const storedNom = normalize(docs[0]?.nom || '');
      const inputNom  = normalize(nom);
      if (!storedNom || (!storedNom.includes(inputNom) && !inputNom.includes(storedNom))) {
        setLicError('nomMismatch'); return;
      }
      const sorted = docs.sort((a, b) => (a.moduleCode || '').localeCompare(b.moduleCode || ''));
      setLicResult({ nom: docs[0]?.nom || '', prenom: docs[0]?.prenom || '', groupe: docs[0]?.groupeLabel || '', modules: sorted });
    } catch { setLicError('error'); }
    finally { setLicLoading(false); }
  }, [codeCnam, nomInput]);

  const tabActive   = { background: '#fff', color: RED, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' };
  const tabInactive = { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' };

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>

      {/* ── En-tête ── */}
      <header style={{ background: `linear-gradient(160deg, #7f0d11 0%, ${RED} 50%, #e53935 100%)` }}>
        <div className="max-w-lg mx-auto px-4 pt-8 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-white flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/iftl-logo.svg" alt="IFTL" className="w-full h-full object-contain p-1.5" />
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">Portail Résultats</h1>
          <p className="text-white/65 text-sm mt-1">Année académique 2025–2026</p>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mt-5 p-1 rounded-2xl mx-auto max-w-xs"
               style={{ background: 'rgba(0,0,0,0.2)' }}>
            {[['ts', 'TS 1A / 2A'], ['licence', 'Licence CNAM']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all duration-200"
                style={tab === id ? tabActive : tabInactive}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-1">

        {/* ── Onglet TS ── */}
        {tab === 'ts' && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Technicien Spécialisé — 1ère & 2ème année</p>
              <div className="space-y-3">
                <SearchInput
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSearched(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="CIN (ex: BK12345) ou code (ex: TS0123)"
                  accentColor={RED}
                />
                <button onClick={handleSearch}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[.98]"
                  style={{ background: RED }}>
                  <IcoSearch />
                  Rechercher mes résultats
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Saisissez votre numéro CIN ou votre code apprenant
              </p>
            </div>

            {searched && !result && (
              <div className="mt-4 bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <IcoSearch />
                </div>
                <p className="font-bold text-slate-700">Aucun résultat trouvé</p>
                <p className="text-sm text-slate-400 mt-1">Vérifiez votre CIN ou code apprenant</p>
              </div>
            )}
            {result && <ResultCard student={result} />}
          </>
        )}

        {/* ── Onglet Licence CNAM ── */}
        {tab === 'licence' && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Licence Achats &amp; Supply Chain — CNAM Maroc</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Code CNAM</label>
                  <SearchInput
                    value={codeCnam}
                    onChange={e => { setCodeCnam(e.target.value); setLicSearched(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleLicenceSearch()}
                    placeholder="ex : MAR655197"
                    accentColor={PURPLE}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Nom de famille</label>
                  <SearchInput
                    value={nomInput}
                    onChange={e => { setNomInput(e.target.value); setLicSearched(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleLicenceSearch()}
                    placeholder="ex : BENALI"
                    accentColor={PURPLE}
                  />
                </div>
                <button onClick={handleLicenceSearch} disabled={licLoading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[.98] disabled:opacity-60"
                  style={{ background: PURPLE }}>
                  {licLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Recherche en cours…
                    </>
                  ) : (
                    <><IcoSearch />Consulter mes résultats</>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Identification sécurisée par code CNAM + nom de famille
              </p>
            </div>

            {licSearched && !licLoading && !licResult && (
              <div className="mt-4 bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                     style={{ background: licError === 'notfound' ? '#fee2e2' : '#fef3c7' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       style={{ color: licError === 'notfound' ? '#dc2626' : '#d97706' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={licError === 'notfound'
                        ? "M6 18L18 6M6 6l12 12"
                        : "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"} />
                  </svg>
                </div>
                <p className="font-bold text-slate-700">
                  {licError === 'nomMismatch' ? 'Nom incorrect pour ce code CNAM'
                   : licError === 'notfound'  ? 'Code CNAM introuvable'
                   : 'Erreur de connexion, réessayez'}
                </p>
                <p className="text-sm text-slate-400 mt-1">Vérifiez votre code CNAM et votre nom de famille</p>
              </div>
            )}
            {licResult && (
              <LicenceResultCard nom={licResult.nom} prenom={licResult.prenom}
                groupe={licResult.groupe} modules={licResult.modules} />
            )}
          </>
        )}

        {/* Pied de page */}
        <div className="py-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-5 h-5 rounded overflow-hidden bg-white flex items-center justify-center">
              <img src="/iftl-logo.svg" alt="" className="w-full object-contain" />
            </div>
            <p className="text-xs font-semibold text-slate-400">IFTL · 2025–2026</p>
          </div>
          <Link to="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:underline"
            style={{ color: BLUE }}>
            <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            Espace connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
