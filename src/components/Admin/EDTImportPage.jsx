import { useState, useEffect, useRef } from 'react';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { collection, getDocs, writeBatch, doc, Timestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';

const ANNEE = '2026-2027';
const ACADEMIC_START_2026 = new Date(2026, 8, 21); // 2026-09-21 (Monday)
const ACADEMIC_START_2025 = new Date(2025, 8, 22); // 2025-09-22 reference

// Jours fériés 2026-2027 (civils + religieux prévisionnels)
const JOURS_FERIES_2026_2027 = new Set([
  // Civils fin 2026
  '2026-10-31', // Fête de l'Unité
  '2026-11-06', // Marche Verte
  '2026-11-18', // Fête de l'Indépendance
  // Civils 2027
  '2027-01-01', // Nouvel An grégorien
  '2027-01-11', // Manifeste de l'Indépendance
  '2027-01-14', // Nouvel An amazigh
  '2027-05-01', // Fête du Travail
  '2027-07-30', // Fête du Trône
  '2027-08-14', // Récupération de Oued Eddahab
  '2027-08-20', // Révolution du Roi et du Peuple
  '2027-08-21', // Fête de la Jeunesse
  // Religieux prévisionnels
  '2027-03-10', // Aïd al-Fitr J1
  '2027-03-11', // Aïd al-Fitr J2
  '2027-05-17', // Aïd al-Adha J1
  '2027-05-18', // Aïd al-Adha J2
  '2027-05-19', // Aïd al-Adha J3
  '2027-06-06', // Nouvel An hégirien (1er Moharram)
  '2027-08-15', // Aïd al-Mawlid
]);

// Périodes de vacances scolaires 2026-2027
const VACANCES_2026_2027 = [
  { label: 'Vacances mi-trim. 1',  start: '2026-12-06', end: '2026-12-13' },
  { label: 'Vacances semestrielles', start: '2027-01-24', end: '2027-01-31' },
  { label: 'Ramadan 2027 (prévis.)', start: '2027-02-17', end: '2027-03-18' },
  { label: 'Vacances mi-trim. 3',  start: '2027-03-21', end: '2027-03-28' },
  { label: 'Vacances mi-trim. 4',  start: '2027-05-09', end: '2027-05-16' },
];

function isBlockedDate(dateStr) {
  if (JOURS_FERIES_2026_2027.has(dateStr)) return true;
  const d = new Date(dateStr);
  for (const v of VACANCES_2026_2027) {
    if (d >= new Date(v.start) && d <= new Date(v.end)) return true;
  }
  return false;
}

const SLOTS = [
  { start: '09:00', end: '10:30', colModule: 5, colSalle: 6 },
  { start: '10:45', end: '12:15', colModule: 7, colSalle: 8 },
  { start: '13:15', end: '14:45', colModule: 10, colSalle: 11 },
  { start: '15:00', end: '16:30', colModule: 12, colSalle: 13 },
];
const DAY_NAMES = { lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5 };
const VACATION_KEYWORDS = ['vacance', 'ferie', 'ramadan'];
const SALLE_MAP = {
  'GS 01': 'Grande Salle 01', 'GS01': 'Grande Salle 01',
  'GS 02': 'Grande Salle 02', 'GS02': 'Grande Salle 02',
};
const SKIP_MODULE_KW = ['vacance', 'bonne fete', 'bonne année', 'jour féri', 'congé', 'bonne  fete'];
const SKIP_GROUPE_KW = ['vacance', 'ferie', 'bonne', 'jour ferié', 'jour ferie'];

function normSalle(s) {
  if (!s || s === 'None') return '';
  const t = String(s).trim();
  return SALLE_MAP[t] || t;
}

function parseIntervenant(text) {
  const m = text.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

function cleanModule(text) {
  return text
    .replace(/\([^)]+\)\s*$/, '')
    .replace(/\s*[-–]\s*(EFM|rattrapage|Examen|révision|revision|EFF|CC)\s*.*$/i, '')
    .replace(/\n/g, ' ')
    .trim();
}

function parseEDT(workbook) {
  const weekSheets = workbook.SheetNames.filter(n =>
    /^S\d+/.test(n) &&
    !['S0-DEBUT', 'S99-FIN', 'SUIVI MH Auto', 'SUIVI MH Bilan Trimest 1', 'Calculs MH'].includes(n)
  );

  const results = [];
  for (const sheetName of weekSheets) {
    const ws = workbook.Sheets[sheetName];
    const rows = xlsxUtils.sheet_to_json(ws, { header: 1, defval: null });

    // Find week start date from col A
    let weekDate = null;
    for (const row of rows) {
      const v = row[0];
      if (v instanceof Date) { weekDate = v; break; }
      if (typeof v === 'number' && v > 40000) {
        // Excel serial date
        weekDate = xlsxUtils.serial_to_date(v);
        break;
      }
    }
    if (!weekDate) continue;

    const weekNum = Math.round((weekDate - ACADEMIC_START_2025) / (7 * 86400000));
    const isVacation = VACATION_KEYWORDS.some(k => sheetName.toLowerCase().includes(k));

    let dayOffset = null;
    let currentDayNum = null;

    for (const row of rows) {
      const dayName = row[2];
      const dayNum = row[3];
      const groupe = row[4];

      if (dayName && typeof dayName === 'string') {
        const dn = dayName.trim().toLowerCase();
        if (DAY_NAMES[dn] !== undefined) {
          dayOffset = DAY_NAMES[dn];
          currentDayNum = dayNum;
        }
      }

      if (!groupe || typeof groupe !== 'string' || dayOffset === null) continue;
      const gr = groupe.trim();
      if (!gr || SKIP_GROUPE_KW.some(k => gr.toLowerCase().includes(k))) continue;
      if (/^(groupe|day|semaine)\s*$/i.test(gr)) continue;

      for (const slot of SLOTS) {
        const modRaw = row[slot.colModule];
        const salleRaw = row[slot.colSalle];
        if (!modRaw || typeof modRaw !== 'string') continue;
        const mod = modRaw.replace(/\n/g, ' ').trim();
        if (!mod || mod.length < 3) continue;
        if (SKIP_MODULE_KW.some(k => mod.toLowerCase().includes(k))) continue;

        results.push({
          weekNum,
          dayOffset,
          slot: slot.start,
          slotEnd: slot.end,
          groupe: gr,
          module: cleanModule(mod),
          moduleRaw: mod,
          salle: normSalle(salleRaw),
          intervenant: parseIntervenant(mod),
          isVacation,
        });
      }
    }
  }
  return results;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fuzzyMatchGroupe(edtName, groupes) {
  const n = normalize(edtName);
  // exact on nom
  let found = groupes.find(g => normalize(g.nom) === n);
  if (found) return found.id;
  // partial
  found = groupes.find(g => n.includes(normalize(g.nom)) || normalize(g.nom).includes(n));
  return found?.id || null;
}

function fuzzyMatchIntervenant(edtStr, intervenants) {
  if (!edtStr) return null;
  const n = normalize(edtStr);
  let found = intervenants.find(i => {
    const full = normalize(i.prenom + i.nom);
    const rev = normalize(i.nom + i.prenom);
    return n.includes(normalize(i.nom)) || full.includes(n) || rev.includes(n) || n.includes(full);
  });
  return found?.id || null;
}

export default function EDTImportPage() {
  const toast = useToast();
  const fileRef = useRef();
  const [step, setStep] = useState(0); // 0=upload, 1=mapping, 2=preview, 3=done
  const [edtSessions, setEdtSessions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [intervenants, setIntervenants] = useState([]);
  const [groupeMap, setGroupeMap] = useState({}); // edtName → groupeId
  const [vacationWeeks, setVacationWeeks] = useState(new Set());
  const [skipVacation, setSkipVacation] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filename, setFilename] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [gSnap, iSnap] = await Promise.all([
        getDocs(query(collection(db, 'groupes'), orderBy('nom'))),
        getDocs(query(collection(db, 'intervenants'), orderBy('nom'))),
      ]);
      const gs = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const is = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroupes(gs);
      setIntervenants(is);
    };
    loadData().catch(console.error);
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    const buf = await file.arrayBuffer();
    const wb = xlsxRead(buf, { type: 'array', cellDates: true });
    const sessions = parseEDT(wb);
    setEdtSessions(sessions);

    // Auto-build initial groupeMap
    const uniqueGroups = [...new Set(sessions.map(s => s.groupe))];
    const initMap = {};
    for (const gr of uniqueGroups) {
      initMap[gr] = fuzzyMatchGroupe(gr, groupes.length ? groupes : []) || '';
    }
    setGroupeMap(initMap);

    // Detect vacation weeks
    const vw = new Set(sessions.filter(s => s.isVacation).map(s => s.weekNum));
    setVacationWeeks(vw);

    setStep(1);
  };

  const [skipFeries, setSkipFeries] = useState(true);

  const previewSessions = edtSessions.filter(s => {
    if (skipVacation && s.isVacation) return false;
    if (!groupeMap[s.groupe]) return false;
    return true;
  }).map(s => {
    const date = addDays(ACADEMIC_START_2026, s.weekNum * 7 + s.dayOffset);
    const dateStr = toDateStr(date);
    return {
      ...s,
      date: dateStr,
      groupeId: groupeMap[s.groupe],
      intervenantId: fuzzyMatchIntervenant(s.intervenant, intervenants),
      isBlocked: skipFeries && isBlockedDate(dateStr),
    };
  }).filter(s => !s.isBlocked);

  // Deduplicate: same date+groupeId+heureDebut
  const deduped = [];
  const seen = new Set();
  for (const s of previewSessions) {
    const key = `${s.date}|${s.groupeId}|${s.slot}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(s); }
  }

  const handleImport = async () => {
    if (!deduped.length) return;
    setImporting(true);
    setProgress({ done: 0, total: deduped.length });
    try {
      const chunks = [];
      for (let i = 0; i < deduped.length; i += 400) chunks.push(deduped.slice(i, i + 400));
      let done = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const s of chunk) {
          const ref = doc(collection(db, 'sessions'));
          batch.set(ref, {
            groupeId: s.groupeId,
            intervenantId: s.intervenantId || null,
            module: s.module,
            moduleId: null,
            type: 'cours',
            date: Timestamp.fromDate(new Date(s.date)),
            heureDebut: s.slot,
            heureFin: s.slotEnd,
            salle: s.salle || '',
            statut: 'planifiee',
            anneeAcademique: ANNEE,
            createdAt: Timestamp.now(),
          });
        }
        await batch.commit();
        done += chunk.length;
        setProgress({ done, total: deduped.length });
      }
      toast.success(`${deduped.length} séances importées pour ${ANNEE}`);
      setStep(3);
    } catch (err) {
      toast.error('Erreur import : ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const uniqueEdtGroups = [...new Set(edtSessions.map(s => s.groupe))].sort();
  const dateRange = deduped.length
    ? { min: deduped[0].date, max: deduped[deduped.length - 1].date }
    : null;
  const unmapped = uniqueEdtGroups.filter(g => !groupeMap[g]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import EDT — {ANNEE}</h1>
        <p className="text-slate-500 text-sm mt-0.5">Importer l'emploi du temps depuis un fichier Excel</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {['Fichier', 'Mapping groupes', 'Prévisualisation', 'Terminé'].map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              step === i ? 'bg-[#005989] text-white' : step > i ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step > i ? 'bg-emerald-500 text-white' : step === i ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
              }`}>{step > i ? '✓' : i + 1}</span>
              {label}
            </div>
            {i < 3 && <div className={`w-8 h-0.5 ${step > i ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <p className="font-semibold text-slate-700 mb-1">Sélectionner le fichier EDT Excel</p>
          <p className="text-sm text-slate-400 mb-6">Format : EDT20252026_TS_1ATS_VF.xlsx</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current.click()}
            className="px-6 py-2.5 bg-[#005989] text-white rounded-xl font-semibold text-sm hover:bg-[#004a73] transition-colors">
            Choisir le fichier Excel
          </button>
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-left max-w-md mx-auto">
            <p className="text-xs font-semibold text-blue-700 mb-1">ℹ️ Ce que cet outil fait :</p>
            <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
              <li>Lit l'EDT 2025-2026 et décale les dates à 2026-2027</li>
              <li>Année académique démarre le <strong>21 sept. 2026</strong></li>
              <li>Crée une session Firestore par créneau/groupe</li>
              <li>Statut initial : Planifiée</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 1: Group mapping */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800">Fichier : {filename}</p>
                <p className="text-sm text-slate-500">{edtSessions.length} créneaux trouvés · {uniqueEdtGroups.length} groupes à mapper</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="skipVac" checked={skipVacation} onChange={e => setSkipVacation(e.target.checked)}
                    className="rounded" />
                  <label htmlFor="skipVac" className="text-sm text-slate-600">Ignorer semaines vacances Excel ({vacationWeeks.size} sem.)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="skipFer" checked={skipFeries} onChange={e => setSkipFeries(e.target.checked)}
                    className="rounded" />
                  <label htmlFor="skipFer" className="text-sm text-slate-600">Ignorer jours fériés & vacances 2026-2027</label>
                </div>
              </div>
            </div>

            {groupes.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-700">
                Chargement des groupes Firestore…
              </div>
            ) : (
              <div className="space-y-2">
                {uniqueEdtGroups.map(gr => (
                  <div key={gr} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{gr}</p>
                      <p className="text-xs text-slate-400">
                        {edtSessions.filter(s => s.groupe === gr && (!skipVacation || !s.isVacation)).length} créneaux
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <select
                      value={groupeMap[gr] || ''}
                      onChange={e => setGroupeMap(prev => ({ ...prev, [gr]: e.target.value }))}
                      className={`text-sm border rounded-lg px-2 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 ${
                        groupeMap[gr] ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'
                      }`}>
                      <option value="">— Non mappé —</option>
                      {groupes.map(g => (
                        <option key={g.id} value={g.id}>{g.nom}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {unmapped.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              ⚠️ {unmapped.length} groupe(s) non mappé(s) — leurs créneaux seront ignorés lors de l'import.
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Retour
            </button>
            <button onClick={() => setStep(2)}
              className="px-6 py-2 text-sm font-bold text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors">
              Prévisualiser ({deduped.length} séances) →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-[#005989]">{deduped.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Séances à créer</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-sm font-bold text-slate-700">{dateRange?.min || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Première séance</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-sm font-bold text-slate-700">{dateRange?.max || '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Dernière séance</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">Aperçu des 30 premières séances</p>
              <span className="text-xs text-slate-400">Année académique : {ANNEE}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Créneau</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Groupe</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Module</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Salle</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Intervenant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deduped.slice(0, 30).map((s, i) => {
                    const g = groupes.find(x => x.id === s.groupeId);
                    const inv = intervenants.find(x => x.id === s.intervenantId);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 font-mono">
                          {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{s.slot}–{s.slotEnd}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{g?.nom || '?'}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{s.module}</td>
                        <td className="px-3 py-2 text-slate-500">{s.salle}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {inv ? `${inv.prenom} ${inv.nom}` : s.intervenant ? <span className="text-amber-600">{s.intervenant.slice(0, 25)}</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {deduped.length > 30 && (
              <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 text-center border-t border-slate-100">
                + {deduped.length - 30} séances supplémentaires non affichées
              </div>
            )}
          </div>

          {importing && (
            <div className="bg-white rounded-xl border border-[#005989]/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#005989]">Import en cours…</span>
                <span className="text-sm text-slate-500">{progress.done}/{progress.total}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-[#005989] h-2 rounded-full transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep(1)} disabled={importing}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
              Retour
            </button>
            <button onClick={handleImport} disabled={importing || !deduped.length}
              className="px-6 py-2.5 text-sm font-bold text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors disabled:opacity-60">
              {importing ? 'Import…' : `Importer ${deduped.length} séances →`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-emerald-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <p className="font-bold text-slate-800 text-lg mb-1">Import terminé !</p>
          <p className="text-slate-500 text-sm mb-6">
            {deduped.length} séances créées pour l'année académique <strong>{ANNEE}</strong>
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => { setStep(0); setEdtSessions([]); setFilename(''); }}
              className="px-5 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Nouvel import
            </button>
            <a href="/planning" className="px-5 py-2 text-sm font-bold text-white bg-[#005989] rounded-xl hover:bg-[#004a73] transition-colors">
              Voir le planning →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
