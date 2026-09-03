import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateReleve1A, generateReleve2A } from '../../services/pdfService';
import { useToast } from '../UI/Toast';

const ANNEE_1A = '2025-2026';
const ANNEE_2A = '2025-2026';

const FILIERE_LABELS = {
  OTM:  'Transport Multimodal et Logistique Internationale',
  ECOM: 'E-Commerce, Marketing Digital et Distribution',
  AEL:  'Logistique Industrielle et Pilotage des Flux',
  OFLP: 'Gestionnaire des opérations logistiques et d\'entrepôt',
  ADEE: 'Diagnostic et Maintenance des Véhicules de Transport',
  LE:   'Logistique d\'entreposage',
  CTRM: 'Conducteur(rice) en transport routier : Option Marchandises',
  CTRP: 'Conducteur(rice) en transport routier : Option Personnes',
  CNAM: 'Licence Professionnelle Logistique (CNAM)',
  MAINT:'Technicien(ne) de Maintenance Industrielle',
};

// Map module names to codes using Firestore modules collection
function buildCodeIndex(modules) {
  const idx = {};
  for (const m of modules) {
    const key = (m.nom || '').toLowerCase().trim();
    if (!idx[key]) idx[key] = m.code || m.id || null;
  }
  return idx;
}

function inputCls() {
  return 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989] bg-white';
}

export default function RelevesPage() {
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [bulletins, setBulletins] = useState([]); // 1A
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [annee, setAnnee]     = useState('1A');
  const [generating, setGenerating] = useState(false);

  // For 2A: manual missing notes
  const [moy1A,    setMoy1A]    = useState('');
  const [moyStage, setMoyStage] = useState('');
  const [moyEFF,   setMoyEFF]   = useState('');

  // 2A notes from Firestore
  const [notes2A,    setNotes2A]    = useState([]);
  const [evals2A,    setEvals2A]    = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sSnap, mSnap, bSnap] = await Promise.all([
          getDocs(query(collection(db, 'students'), orderBy('nom', 'asc'))),
          getDocs(collection(db, 'modules')),
          getDocs(collection(db, 'bulletins')),
        ]);
        setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setAllModules(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setBulletins(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // When a student is selected + 2A mode, fetch their 2A notes
  useEffect(() => {
    if (!selected || annee !== '2A') { setNotes2A([]); setEvals2A([]); return; }
    let cancelled = false;
    setLoadingNotes(true);
    async function fetch2A() {
      try {
        const [nSnap, evSnap] = await Promise.all([
          getDocs(query(collection(db, 'notes'), where('studentId', '==', selected.codeApprenant || selected.id))),
          getDocs(collection(db, 'evaluations')),
        ]);
        if (cancelled) return;
        setNotes2A(nSnap.docs.filter(d => (d.data().evaluationId || '').includes('2A')).map(d => ({ id: d.id, ...d.data() })));
        setEvals2A(evSnap.docs.filter(d => d.id.includes('2A')).map(d => ({ id: d.id, ...d.data() })));
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    }
    fetch2A();
    return () => { cancelled = true; };
  }, [selected, annee]);

  // Auto-fill moy1A from bulletins when student selected
  useEffect(() => {
    if (!selected) { setMoy1A(''); setMoyStage(''); setMoyEFF(''); return; }
    const code = selected.codeApprenant || selected.id;
    const bul = bulletins.find(b => b.studentCode === code || b.studentId === code);
    if (bul?.moyenneGenerale) setMoy1A(String(bul.moyenneGenerale));
    else setMoy1A('');
  }, [selected, bulletins]);

  const codeIndex = useMemo(() => buildCodeIndex(allModules), [allModules]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students.slice(0, 50);
    const q = search.toLowerCase();
    return students.filter(s =>
      (s.nom || '').toLowerCase().includes(q) ||
      (s.prenom || '').toLowerCase().includes(q) ||
      (s.codeApprenant || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [students, search]);

  // Build 1A modules list for selected student
  const modules1A = useMemo(() => {
    if (!selected || annee !== '1A') return [];
    const code = selected.codeApprenant || selected.id;
    const bul = bulletins.find(b => b.studentCode === code || b.studentId === code);
    if (!bul?.modules) return [];
    return bul.modules.map(m => ({
      ref: codeIndex[(m.nom || '').toLowerCase().trim()] || '—',
      nom: m.nom,
      note: m.note,
      coeff: m.coefficient || m.coeff || 1,
    }));
  }, [selected, annee, bulletins, codeIndex]);

  const bulletin1A = useMemo(() => {
    if (!selected) return null;
    const code = selected.codeApprenant || selected.id;
    return bulletins.find(b => b.studentCode === code || b.studentId === code) || null;
  }, [selected, bulletins]);

  // Build 2A modules list from notes + evaluations
  const modules2A = useMemo(() => {
    if (!selected || annee !== '2A' || !notes2A.length) return [];
    const evalMap = {};
    for (const ev of evals2A) evalMap[ev.id] = ev;
    return notes2A.map(n => {
      const ev = evalMap[n.evaluationId] || {};
      const modDoc = allModules.find(m => m.id === ev.moduleId);
      return {
        ref: ev.moduleId || '—',
        nom: modDoc?.nom || ev.moduleId || n.evaluationId,
        note: n.note,
        coeff: modDoc?.coeff || modDoc?.coefficient || ev.coefficient || 2,
      };
    }).sort((a, b) => (a.ref || '').localeCompare(b.ref || ''));
  }, [selected, annee, notes2A, evals2A, allModules]);

  const moy2A = useMemo(() => {
    if (!modules2A.length) return null;
    const valid = modules2A.filter(m => m.note !== null && m.note !== undefined);
    const sumCoeff = valid.reduce((s, m) => s + m.coeff, 0);
    return sumCoeff > 0 ? valid.reduce((s, m) => s + m.note * m.coeff, 0) / sumCoeff : null;
  }, [modules2A]);

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const code = selected.codeApprenant || selected.id;
      const bul = bulletins.find(b => b.studentCode === code || b.studentId === code);
      const info = {
        anneeAcademique: ANNEE_1A,
        filiere: bul?.filiere || selected.filiere || '',
        groupe: bul?.groupe || selected.groupeId || '',
      };
      const studentData = {
        nom: selected.nom,
        prenom: selected.prenom,
        codeApprenant: selected.codeApprenant,
        cin: selected.cin,
        dateNaissance: selected.dateNaissance,
        sexe: selected.sexe,
      };

      if (annee === '1A') {
        if (!modules1A.length) { showToast('Aucune note 1A trouvée pour cet apprenant', 'error'); return; }
        generateReleve1A(studentData, info, modules1A, {
          moyenneGenerale: bul?.moyenneGenerale,
          mention: bul?.mention,
          decision: bul?.decision === 'admis' ? 'ADMIS(E)' : bul?.decision === 'non_admis' ? 'NON ADMIS(E)' : undefined,
        });
        showToast('Relevé 1A généré', 'success');
      } else {
        if (!modules2A.length) { showToast('Aucune note 2A trouvée pour cet apprenant', 'error'); return; }
        const info2A = { ...info, anneeAcademique: ANNEE_2A };
        generateReleve2A(studentData, info2A, modules2A, {
          moy2A,
          moy1A:    moy1A    ? parseFloat(moy1A)    : null,
          moyStage: moyStage ? parseFloat(moyStage) : null,
          moyEFF:   moyEFF   ? parseFloat(moyEFF)   : null,
        });
        showToast('Relevé 2A généré', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Erreur lors de la génération', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = selected && (annee === '1A' ? modules1A.length > 0 : modules2A.length > 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Relevés de Notes</h1>
        <p className="text-sm text-slate-500 mt-1">Génération PDF des relevés annuels 1A TS et de fin de formation 2A TS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student selection */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">1. Sélectionner l'apprenant</h2>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Nom, prénom ou code…"
              className={inputCls()}
            />
            {loading ? (
              <p className="text-sm text-slate-400 mt-3">Chargement…</p>
            ) : (
              <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
                {filtered.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${selected?.id === s.id ? 'bg-blue-50 font-semibold text-[#005989]' : 'text-slate-700'}`}
                  >
                    <span className="font-mono text-xs text-slate-400 mr-2">{s.codeApprenant || s.id}</span>
                    {s.nom} {s.prenom}
                    <span className="ml-1 text-xs text-slate-400">{s.niveau || ''}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">Aucun résultat</p>}
              </div>
            )}
          </div>

          {/* Type selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">2. Type de relevé</h2>
            <div className="flex gap-2">
              {['1A', '2A'].map(a => (
                <button key={a} onClick={() => setAnnee(a)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${annee === a ? 'bg-[#005989] text-white border-[#005989]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  Relevé {a} TS
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview + inputs */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              {/* Student summary card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#005989] text-white flex items-center justify-center font-bold text-sm">
                    {(selected.nom || '')[0]}{(selected.prenom || '')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selected.nom} {selected.prenom}</p>
                    <p className="text-xs text-slate-500">{selected.codeApprenant || selected.id} · {selected.cin || '—'} · {selected.dateNaissance || '—'}</p>
                    {bulletin1A && <p className="text-xs text-slate-400 mt-0.5">Filière 1A : {bulletin1A.filiere} | Gr. {bulletin1A.groupe} | Moy. 1A : {bulletin1A.moyenneGenerale?.toFixed(2)}</p>}
                  </div>
                </div>
              </div>

              {/* 1A Preview */}
              {annee === '1A' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <h2 className="text-sm font-bold text-slate-700 mb-3">Aperçu — Modules 1A</h2>
                  {modules1A.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2">Aucun bulletin 1A trouvé pour cet apprenant.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Réf.</th>
                              <th className="px-3 py-2 text-left font-semibold">Module</th>
                              <th className="px-3 py-2 text-center font-semibold">Note /20</th>
                              <th className="px-3 py-2 text-center font-semibold">Coef.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {modules1A.map((m, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-3 py-1.5 font-mono text-slate-400">{m.ref}</td>
                                <td className="px-3 py-1.5 text-slate-700">{m.nom}</td>
                                <td className={`px-3 py-1.5 text-center font-semibold ${m.note < 10 ? 'text-red-600' : 'text-[#005989]'}`}>{m.note?.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-center text-slate-500">{m.coeff}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {bulletin1A && (
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-slate-500">Moyenne générale : <strong className="text-slate-800">{bulletin1A.moyenneGenerale?.toFixed(2)}/20</strong></span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${bulletin1A.decision === 'admis' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {bulletin1A.decision === 'admis' ? 'ADMIS(E)' : 'NON ADMIS(E)'} — {bulletin1A.mention}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 2A Preview + inputs */}
              {annee === '2A' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                  <h2 className="text-sm font-bold text-slate-700">Aperçu — Modules 2A</h2>

                  {loadingNotes ? (
                    <p className="text-sm text-slate-400">Chargement des notes 2A…</p>
                  ) : modules2A.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2">Aucune note 2A trouvée pour cet apprenant dans le PV importé.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Réf.</th>
                            <th className="px-3 py-2 text-left font-semibold">Module</th>
                            <th className="px-3 py-2 text-center font-semibold">Note /20</th>
                            <th className="px-3 py-2 text-center font-semibold">Coef.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {modules2A.map((m, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-mono text-slate-400">{m.ref}</td>
                              <td className="px-3 py-1.5 text-slate-700">{m.nom}</td>
                              <td className={`px-3 py-1.5 text-center font-semibold ${m.note < 10 ? 'text-red-600' : 'text-[#005989]'}`}>{m.note?.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-center text-slate-500">{m.coeff}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Weighted average inputs */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Notes complémentaires pour calcul final</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Moy. 1ère année (20%)</label>
                        <input type="number" min="0" max="20" step="0.01" value={moy1A}
                          onChange={e => setMoy1A(e.target.value)}
                          placeholder="ex: 13.58"
                          className={inputCls()} />
                        {bulletin1A && <p className="text-xs text-[#005989] mt-0.5">Auto: {bulletin1A.moyenneGenerale?.toFixed(2)}</p>}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Stage / Insertion (30%)</label>
                        <input type="number" min="0" max="20" step="0.01" value={moyStage}
                          onChange={e => setMoyStage(e.target.value)}
                          placeholder="ex: 14.00"
                          className={inputCls()} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Examen Fin Formation (20%)</label>
                        <input type="number" min="0" max="20" step="0.01" value={moyEFF}
                          onChange={e => setMoyEFF(e.target.value)}
                          placeholder="ex: 14.00"
                          className={inputCls()} />
                      </div>
                    </div>

                    {/* Computed passage average preview */}
                    {moy2A !== null && moy1A && moyStage && moyEFF && (
                      <div className="mt-3 bg-slate-50 rounded-xl p-3 text-sm">
                        <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 mb-2">
                          <span>2A × 30% = {(moy2A * 0.3).toFixed(2)}</span>
                          <span>1A × 20% = {(parseFloat(moy1A) * 0.2).toFixed(2)}</span>
                          <span>Stage × 30% = {(parseFloat(moyStage) * 0.3).toFixed(2)}</span>
                          <span>EFF × 20% = {(parseFloat(moyEFF) * 0.2).toFixed(2)}</span>
                        </div>
                        <p className="font-bold text-slate-800">
                          Moyenne de Passage : {(moy2A * 0.3 + parseFloat(moy1A) * 0.2 + parseFloat(moyStage) * 0.3 + parseFloat(moyEFF) * 0.2).toFixed(2)}/20
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="w-full py-3 bg-[#005989] text-white rounded-2xl font-bold text-sm hover:bg-[#004a73] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {generating ? 'Génération…' : `Télécharger Relevé ${annee} TS — ${selected.nom} ${selected.prenom}`}
              </button>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Sélectionnez un apprenant pour prévisualiser et générer son relevé de notes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
