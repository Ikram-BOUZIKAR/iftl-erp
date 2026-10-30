import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection, doc, getDocs, query, where, writeBatch, addDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import {
  calculerMoyenneModule1ATS,
  calculerMoyenneUELicence,
  getStatutModule,
  ECTS_LICENCE,
  calculerMoyenneGeneraleLicence,
} from '../../utils/notesUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const R2 = v => (v === null || v === undefined) ? null : Math.round(v * 100) / 100;
const n2s = v => (v === null || v === undefined || v === '') ? '' : String(v).replace('.', ',');
const s2n = s => { if (s === '' || s === null || s === undefined) return null; const v = parseFloat(String(s).replace(',', '.')); return isNaN(v) ? null : v; };

function statutBadge(statut) {
  if (statut === 'valide')    return 'bg-emerald-100 text-emerald-700';
  if (statut === 'rachat')    return 'bg-amber-100 text-amber-700';
  if (statut === 'non_valide') return 'bg-red-100 text-red-600';
  return 'bg-slate-100 text-slate-400';
}
function statutLabel(statut) {
  if (statut === 'valide')    return 'Validé';
  if (statut === 'rachat')    return 'Rachat';
  if (statut === 'non_valide') return 'Non validé';
  return '—';
}
function moyColor(moy) {
  if (moy === null) return 'text-slate-400';
  if (moy >= 10) return 'text-emerald-600 font-semibold';
  if (moy >= 9)  return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
}

const PROGRAMMES = [
  { value: '1A_TS',       label: '1ère année TS' },
  { value: '2A_TS',       label: '2ème année TS' },
  { value: 'licence_cnam', label: 'Licence CNAM' },
];

const UES_LICENCE = [
  'CFA109','LTR112','ESC118','LTR135','LTR126','LTR113','ESC121','LTR143','ANG320','TED001','UAM10K',
];

const EVAL_TYPES_META = ['CC', 'EFM', 'RATTRAPAGE'];

function makeDefaultMeta(type, mod, semestre) {
  return {
    titre: `${type} — ${mod?.code || ''} — ${semestre}`,
    coefficient: type === 'EFM' ? (mod?.coefficient ?? 1) : 1,
  };
}

// ─── Paste parser ──────────────────────────────────────────────────────────────

function parsePaste(text) {
  return text.trim().split('\n').map(line =>
    line.split('\t').map(c => c.trim().replace(',', '.'))
  ).filter(row => row.some(Boolean));
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function NotesImportTab({ modules, groupes }) {
  const toast = useToast();

  const [programme, setProgramme]   = useState('1A_TS');
  const [groupeId, setGroupeId]     = useState('');
  const [moduleId, setModuleId]     = useState('');
  const [semestre, setSemestre]     = useState('S1');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [rows, setRows]             = useState([]);
  const [showPaste, setShowPaste]   = useState(false);
  const [pasteText, setPasteText]   = useState('');
  const [showEvalMeta, setShowEvalMeta] = useState(false);
  const [evalMeta, setEvalMeta]     = useState({ CC: {}, EFM: {}, RATTRAPAGE: {} });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dupWarn, setDupWarn] = useState(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);

  const isLicence = programme === 'licence_cnam';
  const selectedModule = modules?.find(m => m.id === moduleId);

  // Sync evalMeta defaults when module/semestre changes
  useEffect(() => {
    if (!selectedModule && !semestre) return;
    setEvalMeta({
      CC:         makeDefaultMeta('CC', selectedModule, semestre),
      EFM:        makeDefaultMeta('EFM', selectedModule, semestre),
      RATTRAPAGE: makeDefaultMeta('RATTRAPAGE', selectedModule, semestre),
    });
  }, [selectedModule, semestre]);

  const loadStudents = useCallback(async () => {
    if (!groupeId) return;
    setLoadingStudents(true);
    try {
      const snap = await getDocs(query(collection(db, 'students'), where('groupeId', '==', groupeId)));
      const students = [];
      snap.forEach(d => students.push({ id: d.id, ...d.data() }));
      students.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setRows(students.map(s => ({
        studentId: s.id,
        code: s.code || s.codeApprenant || '',
        nom: s.nom || '',
        prenom: s.prenom || '',
        cc: '', efm: '', rattrapage: '',
      })));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingStudents(false);
    }
  }, [groupeId]);

  useEffect(() => { if (groupeId) loadStudents(); else setRows([]); }, [groupeId, loadStudents]);

  const rowsWithCalc = useMemo(() => rows.map(r => {
    let moy = null;
    if (isLicence) {
      moy = calculerMoyenneUELicence(r.cc, r.efm, r.rattrapage, selectedModule?.code || '');
    } else {
      moy = calculerMoyenneModule1ATS(r.cc, r.efm, r.rattrapage);
    }
    return { ...r, moy: R2(moy), statut: getStatutModule(R2(moy)) };
  }), [rows, isLicence, selectedModule]);

  const stats = useMemo(() => {
    const withMoy = rowsWithCalc.filter(r => r.moy !== null);
    if (!withMoy.length) return null;
    const avg = R2(withMoy.reduce((s, r) => s + r.moy, 0) / withMoy.length);
    const valide = withMoy.filter(r => r.statut === 'valide').length;
    const rachat = withMoy.filter(r => r.statut === 'rachat').length;
    const nonVal = withMoy.filter(r => r.statut === 'non_valide').length;
    return { avg, valide, rachat, nonVal, total: withMoy.length };
  }, [rowsWithCalc]);

  const setCell = (idx, field, val) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));

  const clearRow = (idx) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, cc: '', efm: '', rattrapage: '' } : r));

  // ─── Import coller depuis Excel ─────────────────────────────────────────────

  const applyPaste = () => {
    const parsed = parsePaste(pasteText);
    if (!parsed.length) { toast.error('Aucune donnée à coller.'); return; }
    setRows(prev => prev.map(r => {
      const match = parsed.find(row =>
        row[0] && (
          r.code.toLowerCase() === row[0].toLowerCase() ||
          r.studentId.toLowerCase() === row[0].toLowerCase()
        )
      );
      if (!match) return r;
      return { ...r, cc: match[1] || r.cc, efm: match[2] || r.efm, rattrapage: match[3] || r.rattrapage };
    }));
    setShowPaste(false);
    setPasteText('');
    toast.success(`${parsed.length} ligne(s) importée(s) depuis le presse-papiers.`);
  };

  // Reset dup state when selection changes
  useEffect(() => { setDupWarn(null); setDupConfirmed(false); }, [moduleId, groupeId, semestre]);

  // ─── Vérification doublons ───────────────────────────────────────────────────

  const checkDuplicates = async () => {
    if (!moduleId || !groupeId) return null;
    const found = [];
    let total = 0;
    for (const type of EVAL_TYPES_META) {
      const evalSnap = await getDocs(query(
        collection(db, 'evaluations'),
        where('moduleId', '==', moduleId),
        where('groupeId', '==', groupeId),
        where('type', '==', type),
        where('sessionAcademique', '==', semestre),
      ));
      for (const evalDoc of evalSnap.docs) {
        const notesSnap = await getDocs(query(
          collection(db, 'notes'),
          where('evaluationId', '==', evalDoc.id),
        ));
        if (notesSnap.size > 0) {
          found.push({ type, count: notesSnap.size });
          total += notesSnap.size;
        }
      }
    }
    return total > 0 ? { types: found, total } : null;
  };

  // ─── Suppression des notes importées ────────────────────────────────────────

  const handleDelete = async () => {
    if (!moduleId || !groupeId) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      let noteCount = 0;
      for (const type of EVAL_TYPES_META) {
        const evalSnap = await getDocs(query(
          collection(db, 'evaluations'),
          where('moduleId', '==', moduleId),
          where('groupeId', '==', groupeId),
          where('type', '==', type),
          where('sessionAcademique', '==', semestre),
        ));
        for (const evalDoc of evalSnap.docs) {
          const notesSnap = await getDocs(query(
            collection(db, 'notes'),
            where('evaluationId', '==', evalDoc.id),
          ));
          notesSnap.forEach(d => { batch.delete(d.ref); noteCount++; });
        }
      }
      await batch.commit();
      toast.success(`${noteCount} note(s) supprimée(s).`);
      setConfirmDelete(false);
      await loadStudents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Sauvegarde Firestore ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!moduleId || !groupeId) { toast.error('Sélectionnez un module et un groupe.'); return; }
    const filled = rowsWithCalc.filter(r => r.cc !== '' || r.efm !== '' || r.rattrapage !== '');
    if (!filled.length) { toast.error('Aucune note à enregistrer.'); return; }

    if (!dupConfirmed) {
      setSaving(true);
      let dups = null;
      try {
        dups = await checkDuplicates();
      } catch (err) {
        toast.error('Erreur vérification doublons : ' + err.message);
        setSaving(false);
        return;
      }
      setSaving(false);
      if (dups) {
        setDupWarn(dups);
        return;
      }
    }
    setDupConfirmed(false);
    setDupWarn(null);

    setSaving(true);
    try {
      const evalIds = {};
      for (const type of EVAL_TYPES_META) {
        const q = query(
          collection(db, 'evaluations'),
          where('moduleId', '==', moduleId),
          where('groupeId', '==', groupeId),
          where('type', '==', type),
          where('sessionAcademique', '==', semestre),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          evalIds[type] = snap.docs[0].id;
        } else {
          const meta = evalMeta[type] || makeDefaultMeta(type, selectedModule, semestre);
          const newEval = await addDoc(collection(db, 'evaluations'), {
            titre:  meta.titre  || makeDefaultMeta(type, selectedModule, semestre).titre,
            code:   `IMPORT_${type}_${selectedModule?.code || moduleId}_${semestre}`,
            type,
            moduleId,
            groupeId,
            sessionAcademique: semestre,
            bareme: 20,
            coefficient: s2n(meta.coefficient) ?? makeDefaultMeta(type, selectedModule, semestre).coefficient,
            createdAt: serverTimestamp(),
            importedAt: serverTimestamp(),
          });
          evalIds[type] = newEval.id;
        }
      }

      const existingNotes = {};
      for (const [type, evalId] of Object.entries(evalIds)) {
        const snap = await getDocs(query(collection(db, 'notes'), where('evaluationId', '==', evalId)));
        existingNotes[type] = {};
        snap.forEach(d => { existingNotes[type][d.data().studentId] = d.id; });
      }

      const batch = writeBatch(db);
      const now = new Date();
      for (const r of filled) {
        const pairs = [
          { type: 'CC', val: s2n(r.cc) },
          { type: 'EFM', val: s2n(r.efm) },
          { type: 'RATTRAPAGE', val: s2n(r.rattrapage) },
        ];
        for (const { type, val } of pairs) {
          if (val === null) continue;
          const evalId = evalIds[type];
          const payload = { evaluationId: evalId, studentId: r.studentId, note: val, absent: false, commentaire: '', updatedAt: now };
          const existing = existingNotes[type][r.studentId];
          if (existing) {
            batch.update(doc(db, 'notes', existing), payload);
          } else {
            batch.set(doc(collection(db, 'notes')), { ...payload, createdAt: now });
          }
        }
      }
      await batch.commit();
      toast.success(`${filled.length} étudiant(s) enregistré(s).`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  const col = 'text-xs font-bold text-slate-500 uppercase tracking-wide text-right';
  const inp = 'w-20 text-sm text-right border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#005989]';

  return (
    <div className="space-y-4">

      {/* Config bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Programme</label>
            <select value={programme} onChange={e => { setProgramme(e.target.value); setModuleId(''); }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005989]">
              {PROGRAMMES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Groupe</label>
            <select value={groupeId} onChange={e => { setGroupeId(e.target.value); setModuleId(''); }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005989]">
              <option value="">— Sélectionner —</option>
              {(groupes || []).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              {isLicence ? 'UE / Module' : 'Module'}
            </label>
            <select value={moduleId} onChange={e => setModuleId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005989]">
              <option value="">— Sélectionner —</option>
              {isLicence
                ? UES_LICENCE.map(code => {
                    const m = (modules || []).find(x => x.code === code);
                    return <option key={code} value={m?.id || code}>{code}{m ? ` — ${m.nom}` : ''}</option>;
                  })
                : (modules || []).map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)
              }
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Session</label>
            <select value={semestre} onChange={e => setSemestre(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005989]">
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="Annuel">Annuel</option>
            </select>
          </div>
        </div>

        {/* Formule info */}
        <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
          {isLicence
            ? <>CTL × 0,25 + max(EFM, min(Ratt, 12)) × 0,75 · LTR126 : relèvement à 10 si 9 ≤ moy &lt; 10</>
            : <>Formule universelle : <strong>CC × 0,4 + EFM × 0,6</strong> · Si Ratt &gt; EFM : CC × 0,4 + Ratt × 0,6</>
          }
        </div>

        {/* Paramètres évaluations */}
        <div className="mt-3">
          <button onClick={() => setShowEvalMeta(v => !v)}
            className="text-xs font-semibold text-[#005989] hover:underline flex items-center gap-1">
            {showEvalMeta ? '▲' : '▼'} Paramètres des évaluations (titre, coefficient)
          </button>
          {showEvalMeta && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EVAL_TYPES_META.map(type => (
                <div key={type} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">{type}</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Titre</label>
                      <input type="text"
                        value={evalMeta[type]?.titre ?? ''}
                        onChange={e => setEvalMeta(m => ({ ...m, [type]: { ...m[type], titre: e.target.value } }))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#005989]"
                        placeholder={makeDefaultMeta(type, selectedModule, semestre).titre}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Coefficient</label>
                      <input type="number" min="0" step="0.5"
                        value={evalMeta[type]?.coefficient ?? ''}
                        onChange={e => setEvalMeta(m => ({ ...m, [type]: { ...m[type], coefficient: e.target.value } }))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#005989]"
                        placeholder={makeDefaultMeta(type, selectedModule, semestre).coefficient}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats résumé */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Moy. classe', val: stats.avg?.toFixed(2), sub: `sur ${stats.total} notes` },
            { label: 'Validé', val: stats.valide, sub: `${Math.round(stats.valide/stats.total*100)} %`, cls: 'text-emerald-600' },
            { label: 'Rachat', val: stats.rachat, sub: `${Math.round(stats.rachat/stats.total*100)} %`, cls: 'text-amber-600' },
            { label: 'Non validé', val: stats.nonVal, sub: `${Math.round(stats.nonVal/stats.total*100)} %`, cls: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 text-center">
              <div className={`text-2xl font-bold ${s.cls || 'text-[#005989]'}`}>{s.val}</div>
              <div className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-700 flex-1">
          {rows.length > 0 ? `${rows.length} étudiant(s) — ${selectedModule?.code || '—'} · ${semestre}` : 'Sélectionnez un groupe pour charger les étudiants'}
        </span>
        {rows.length > 0 && moduleId && (
          !confirmDelete
            ? (
              <button onClick={() => setConfirmDelete(true)}
                className="text-sm px-3 py-1.5 border border-red-200 rounded-xl text-red-600 hover:bg-red-50 transition">
                🗑 Supprimer notes importées
              </button>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-red-600 font-medium">Confirmer la suppression ?</span>
                <button onClick={handleDelete} disabled={saving}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40">
                  Oui, supprimer
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                  Annuler
                </button>
              </span>
            )
        )}
        <button onClick={() => setShowPaste(v => !v)}
          className="text-sm px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition">
          📋 Coller depuis Excel
        </button>
        <button onClick={handleSave} disabled={saving || !rows.length || !moduleId}
          className="text-sm px-4 py-1.5 bg-[#005989] text-white font-semibold rounded-xl hover:bg-[#004a73] disabled:opacity-40 transition">
          {saving ? 'Enregistrement…' : '💾 Enregistrer'}
        </button>
      </div>

      {/* Duplicate warning */}
      {dupWarn && !dupConfirmed && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">Notes déjà enregistrées pour ce module / groupe / session</p>
            <p className="text-amber-700 text-xs mt-1">
              {dupWarn.types.map(t => `${t.type} : ${t.count} note(s)`).join(' · ')} — Total : <strong>{dupWarn.total} note(s)</strong>
            </p>
            <p className="text-amber-600 text-xs mt-1.5">
              En continuant, les notes existantes seront <strong>remplacées</strong> par les nouvelles valeurs.
              Pour repartir de zéro, utilisez d'abord <em>Supprimer notes importées</em>.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setDupWarn(null); setDupConfirmed(false); }}
                className="px-4 py-1.5 text-sm border border-amber-300 rounded-xl text-amber-700 hover:bg-amber-100 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => { setDupConfirmed(true); setTimeout(handleSave, 0); }}
                className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-colors"
              >
                Remplacer quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone de collage */}
      {showPaste && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Coller depuis Excel</p>
          <p className="text-xs text-slate-500">Colonnes attendues (séparées par tabulation) : Code apprenant | CC | EFM | Rattrapage</p>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={6}
            placeholder={"TS0001\t14\t12\t\nTS0002\t11\t8\t15"}
            className="w-full text-sm font-mono border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none"
          />
          <div className="flex gap-3">
            <button onClick={() => { setShowPaste(false); setPasteText(''); }}
              className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button onClick={applyPaste} disabled={!pasteText.trim()}
              className="px-4 py-2 text-sm bg-[#005989] text-white font-semibold rounded-xl hover:bg-[#004a73] disabled:opacity-40 transition">
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Nom Prénom</th>
                  <th className={`px-4 py-3 ${col}`}>{isLicence ? 'CTL' : 'CC'}</th>
                  <th className={`px-4 py-3 ${col}`}>EFM</th>
                  <th className={`px-4 py-3 ${col}`}>Rattrapage</th>
                  <th className={`px-4 py-3 ${col}`}>Moy</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Statut</th>
                  <th className="px-2 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-sm">Chargement…</td></tr>
                ) : rowsWithCalc.map((r, i) => (
                  <tr key={r.studentId} className={`border-b border-slate-50 hover:bg-slate-50/50 transition ${r.moy !== null && r.moy < 9 ? 'bg-red-50/30' : r.moy !== null && r.moy < 10 ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-2 text-slate-500 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{r.nom} {r.prenom}</td>
                    <td className="px-4 py-2">
                      <input type="text" inputMode="decimal" value={n2s(r.cc)}
                        onChange={e => setCell(i, 'cc', e.target.value)}
                        className={inp} placeholder="—" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" inputMode="decimal" value={n2s(r.efm)}
                        onChange={e => setCell(i, 'efm', e.target.value)}
                        className={inp} placeholder="—" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" inputMode="decimal" value={n2s(r.rattrapage)}
                        onChange={e => setCell(i, 'rattrapage', e.target.value)}
                        className={`${inp} ${r.rattrapage !== '' ? 'border-amber-300 bg-amber-50' : ''}`} placeholder="—" />
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-base ${moyColor(r.moy)}`}>
                      {r.moy !== null ? r.moy.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {r.statut && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statutBadge(r.statut)}`}>
                          {statutLabel(r.statut)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {(r.cc !== '' || r.efm !== '' || r.rattrapage !== '') && (
                        <button onClick={() => clearRow(i)}
                          title="Effacer les notes de cette ligne"
                          className="text-slate-300 hover:text-red-400 text-xs leading-none transition">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!groupeId && (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-400 text-sm">
          Sélectionnez un programme, un groupe et un module pour commencer l'import.
        </div>
      )}
    </div>
  );
}
