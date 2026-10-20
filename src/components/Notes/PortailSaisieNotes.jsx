import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, addDoc,
  writeBatch, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../UI/Toast';

const ANNEE = '2026-2027';

const PORTAL_TYPES = [
  { value: 'CC',           label: 'Contrôle Continu (CC)' },
  { value: 'EFM',          label: 'Examen Final de Module (EFM)' },
  { value: 'EFF',          label: 'Examen de Fin de Formation (EFF)' },
  { value: 'RATTRAPAGE',   label: 'Rattrapage' },
  { value: 'PARTICIPATION', label: 'Participation / Discipline' },
  { value: 'TD',           label: 'Travaux Dirigés (TD)' },
  { value: 'SOUTENANCE',   label: 'Soutenance' },
];

function Spinner() {
  return <div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />;
}

function ArrowLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] bg-white';
const labelCls = 'block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5';

export default function PortailSaisieNotes() {
  const { userProfile } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [groupes, setGroupes] = useState([]);
  const [students, setStudents] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingGroupeData, setLoadingGroupeData] = useState(false);

  const [intervenantNom, setIntervenantNom] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedModuleNom, setSelectedModuleNom] = useState('');
  const [selectedType, setSelectedType] = useState('CC');
  const [selectedSemestre, setSelectedSemestre] = useState('S1');

  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill intervenant name from profile
  useEffect(() => {
    if (userProfile?.displayName) setIntervenantNom(userProfile.displayName);
    else if (userProfile?.prenom || userProfile?.nom) {
      setIntervenantNom([userProfile.prenom, userProfile.nom].filter(Boolean).join(' '));
    }
  }, [userProfile]);

  // Load all groupes on mount
  useEffect(() => {
    getDocs(collection(db, 'groupes')).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setGroupes(data);
    });
  }, []);

  const onGroupeChange = useCallback(async (groupeId) => {
    setSelectedGroupeId(groupeId);
    setSelectedModuleId('');
    setSelectedModuleNom('');
    setStudents([]);
    setModules([]);
    if (!groupeId) return;

    setLoadingGroupeData(true);
    try {
      const [studSnap, sessSnap] = await Promise.all([
        getDocs(query(collection(db, 'students'), where('groupeId', '==', groupeId))),
        getDocs(query(collection(db, 'sessions'), where('groupeId', '==', groupeId))),
      ]);

      const studs = studSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setStudents(studs);

      const modMap = new Map();
      sessSnap.docs.forEach(d => {
        const s = d.data();
        if (s.moduleId && (s.module || s.moduleNom) && !modMap.has(s.moduleId)) {
          modMap.set(s.moduleId, { id: s.moduleId, nom: s.module || s.moduleNom || s.moduleId });
        }
      });

      if (modMap.size === 0) {
        const modSnap = await getDocs(collection(db, 'modules'));
        modSnap.docs.forEach(d => {
          const m = d.data();
          const nom = [m.code, m.nom].filter(Boolean).join(' — ') || d.id;
          modMap.set(d.id, { id: d.id, nom });
        });
      }

      setModules(Array.from(modMap.values()).sort((a, b) => a.nom.localeCompare(b.nom)));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoadingGroupeData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (students.length > 0) {
      const init = {};
      students.forEach(s => { init[s.id] = { note: '', absent: false }; });
      setNotes(init);
    }
  }, [students]);

  const onModuleChange = (moduleId) => {
    setSelectedModuleId(moduleId);
    const mod = modules.find(m => m.id === moduleId);
    setSelectedModuleNom(mod?.nom || '');
  };

  const canProceed = selectedGroupeId && selectedModuleId && intervenantNom.trim() && date && students.length > 0;

  const setNote = (studentId, field, value) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleSave = async () => {
    const entries = Object.entries(notes).filter(([, v]) => v.absent || (v.note !== '' && v.note !== null));
    if (entries.length === 0) {
      toast.error('Aucune note saisie.');
      return;
    }

    const typeLabel = PORTAL_TYPES.find(t => t.value === selectedType)?.label || selectedType;
    setSaving(true);
    try {
      const evalRef = await addDoc(collection(db, 'evaluations'), {
        type: selectedType,
        titre: `${typeLabel} — ${selectedModuleNom}`,
        code: `${selectedType}-${selectedModuleId}-${Date.now()}`,
        moduleId: selectedModuleId,
        moduleNom: selectedModuleNom,
        groupeId: selectedGroupeId,
        sessionAcademique: selectedSemestre,
        anneeAcademique: ANNEE,
        bareme: 20,
        coefficient: 1,
        source: 'portail',
        intervenantNom: intervenantNom.trim(),
        date,
        createdAt: serverTimestamp(),
      });

      const batch = writeBatch(db);
      entries.forEach(([studentId, v]) => {
        const noteRef = doc(collection(db, 'notes'));
        batch.set(noteRef, {
          evaluationId: evalRef.id,
          studentId,
          note: v.absent ? null : (parseFloat(v.note) ?? 0),
          absent: Boolean(v.absent),
          anneeAcademique: ANNEE,
          intervenantNom: intervenantNom.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();

      setSaved(true);
      toast.success(`${entries.length} note(s) enregistrée(s) avec succès.`);
    } catch (err) {
      console.error(err);
      toast.error('Erreur : ' + (err.message || 'Inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSaved(false);
    setStep(1);
    setSelectedGroupeId('');
    setSelectedModuleId('');
    setSelectedModuleNom('');
    setStudents([]);
    setModules([]);
    setNotes({});
  };

  const selectedGroupe = groupes.find(g => g.id === selectedGroupeId);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Saisie des notes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Portail de saisie — tous niveaux et filières</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step >= n ? 'bg-[#005989] text-white' : 'bg-slate-200 text-slate-500'
            }`}>{n}</div>
            <span className={`text-sm font-medium ${step >= n ? 'text-slate-800' : 'text-slate-400'}`}>
              {n === 1 ? 'Configuration' : 'Saisie des notes'}
            </span>
            {n < 2 && <span className="text-slate-300 mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Config */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-700">Paramètres de l'évaluation</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Intervenant */}
            <div>
              <label className={labelCls}>Nom de l'Intervenant(e) <span className="text-red-500 normal-case font-normal">*</span></label>
              <input
                type="text"
                value={intervenantNom}
                onChange={e => setIntervenantNom(e.target.value)}
                className={inputCls}
                placeholder="Prénom NOM"
              />
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Date <span className="text-red-500 normal-case font-normal">*</span></label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Groupe */}
            <div>
              <label className={labelCls}>Groupe <span className="text-red-500 normal-case font-normal">*</span></label>
              <select
                value={selectedGroupeId}
                onChange={e => onGroupeChange(e.target.value)}
                className={inputCls}
              >
                <option value="">— Sélectionner un groupe —</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>

            {/* Module */}
            <div>
              <label className={labelCls}>Module <span className="text-red-500 normal-case font-normal">*</span></label>
              {loadingGroupeData ? (
                <div className="h-[42px] flex items-center"><Spinner /></div>
              ) : (
                <select
                  value={selectedModuleId}
                  onChange={e => onModuleChange(e.target.value)}
                  className={inputCls}
                  disabled={!selectedGroupeId}
                >
                  <option value="">— Sélectionner un module —</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              )}
              {selectedGroupeId && !loadingGroupeData && modules.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Aucun module trouvé pour ce groupe.</p>
              )}
            </div>

            {/* Type éval */}
            <div>
              <label className={labelCls}>Type d'évaluation <span className="text-red-500 normal-case font-normal">*</span></label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={inputCls}>
                {PORTAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Semestre */}
            <div>
              <label className={labelCls}>Semestre</label>
              <select value={selectedSemestre} onChange={e => setSelectedSemestre(e.target.value)} className={inputCls}>
                <option value="S1">Semestre 1</option>
                <option value="S2">Semestre 2</option>
                <option value="Annuel">Annuel</option>
              </select>
            </div>
          </div>

          {selectedGroupeId && students.length > 0 && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ {students.length} apprenant(s) trouvé(s) pour ce groupe.
            </p>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceed}
              className="px-5 py-2.5 text-sm font-semibold bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuer →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Saisie */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Config recap */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><span className="font-semibold text-slate-600">Groupe :</span> {selectedGroupe?.nom}</span>
            <span><span className="font-semibold text-slate-600">Module :</span> {selectedModuleNom}</span>
            <span><span className="font-semibold text-slate-600">Type :</span> {PORTAL_TYPES.find(t => t.value === selectedType)?.label}</span>
            <span><span className="font-semibold text-slate-600">Semestre :</span> {selectedSemestre}</span>
            <span><span className="font-semibold text-slate-600">Intervenant(e) :</span> {intervenantNom}</span>
            <span><span className="font-semibold text-slate-600">Date :</span> {date}</span>
          </div>

          {/* Notes table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Liste des apprenants — {students.length} apprenant(s)</h2>
              <span className="text-xs text-slate-400">Barème : 20</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Apprenant</th>
                  <th className="px-4 py-3 text-center w-28">Note / 20</th>
                  <th className="px-4 py-3 text-center w-20">Absent</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const entry = notes[s.id] || { note: '', absent: false };
                  return (
                    <tr key={s.id} className={`border-t border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-800">{s.nom} {s.prenom}</span>
                        {s.code && <span className="ml-2 text-xs text-slate-400">{s.code}</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          value={entry.note}
                          onChange={e => setNote(s.id, 'note', e.target.value)}
                          disabled={entry.absent}
                          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] disabled:opacity-40 disabled:bg-slate-100"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={entry.absent}
                          onChange={e => setNote(s.id, 'absent', e.target.checked)}
                          className="w-4 h-4 accent-[#005989] cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {saved && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
              <CheckIcon />
              Notes enregistrées avec succès !
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft /> Retour
            </button>
            {!saved ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <><Spinner /> Enregistrement…</>
                ) : (
                  <>Enregistrer les notes</>
                )}
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
              >
                Nouvelle saisie
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
