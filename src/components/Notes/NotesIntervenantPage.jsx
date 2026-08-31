import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection, query, where, getDocs, addDoc,
  writeBatch, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { EVAL_TYPES, NOTE_DEADLINES, deadlineInfo } from '../../utils/notesUtils';

const ANNEE = '2025-2026';

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoUpload() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>;
}
function IcoCheck() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>;
}
function IcoBack() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>;
}
function IcoBell() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>;
}
function IcoSave() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>;
}

// ── Deadline banner ────────────────────────────────────────────────────────────
function DeadlineBanner({ semestre }) {
  const s1 = deadlineInfo('S1');
  const s2 = deadlineInfo('S2');
  const active = semestre === 'S1' ? s1 : s2;

  if (!active) return null;

  const cls = active.overdue
    ? 'bg-red-50 border-red-200 text-red-800'
    : active.urgent
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-blue-50 border-blue-200 text-blue-700';

  const msg = active.overdue
    ? `Délai dépassé — notes ${semestre} devaient être saisies avant le ${active.label}.`
    : active.urgent
      ? `Rappel : notes ${semestre} à compléter avant le ${active.label} (J-${active.daysLeft}).`
      : `Échéance notes ${semestre} : ${active.label}.`;

  return (
    <div className={`flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl border mb-4 ${cls}`}>
      <IcoBell />
      <span>{msg}</span>
    </div>
  );
}

// ── Deadlines summary (shown before any selection) ────────────────────────────
function DeadlinesSummary() {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {['S1', 'S2'].map(sem => {
        const info = deadlineInfo(sem);
        if (!info) return null;
        const cls = info.overdue ? 'bg-red-50 border-red-200' : info.urgent ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
        const dot = info.overdue ? 'bg-red-500' : info.urgent ? 'bg-amber-500' : 'bg-green-500';
        return (
          <div key={sem} className={`rounded-xl border p-3 ${cls}`}>
            <p className="text-xs font-bold text-slate-600 mb-1">Semestre {sem}</p>
            <p className="text-[11px] text-slate-500">Avant le {info.label}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-[11px] font-semibold text-slate-700">
                {info.overdue ? 'Délai dépassé' : info.urgent ? `J-${info.daysLeft}` : `J-${info.daysLeft}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NotesIntervenantPage({ intervenantId, sessions, groupes }) {

  // ── Step 1 config state ───────────────────────────────────────────────────
  const [step,      setStep]      = useState('config');
  const [groupeId,  setGroupeId]  = useState('');
  const [moduleKey, setModuleKey] = useState('');
  const [semestre,  setSemestre]  = useState('S1');
  const [evalType,  setEvalType]  = useState('CC');

  // ── Step 2 saisie state ───────────────────────────────────────────────────
  const [students,         setStudents]         = useState([]);
  const [notes,            setNotes]            = useState({});
  const [existingSessions, setExistingSessions] = useState([]);
  const [loadingStudents,  setLoadingStudents]  = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [savedMsg,         setSavedMsg]         = useState('');
  const [error,            setError]            = useState('');
  const fileRef = useRef();

  // ── Derived options ───────────────────────────────────────────────────────
  const groupeOptions = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (s.groupeId && !map[s.groupeId]) {
        map[s.groupeId] = groupes.find(g => g.id === s.groupeId)?.nom || s.groupeNom || s.groupeId;
      }
    });
    return Object.entries(map)
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [sessions, groupes]);

  const moduleOptions = useMemo(() => {
    if (!groupeId) return [];
    const map = {};
    sessions
      .filter(s => s.groupeId === groupeId)
      .forEach(s => {
        const key = s.moduleId || s.module || '';
        if (key && !map[key]) {
          map[key] = { key, id: s.moduleId || '', nom: s.module || s.moduleId || '' };
        }
      });
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [sessions, groupeId]);

  const selectedModule = moduleOptions.find(m => m.key === moduleKey) || null;
  const selectedGroupe = groupeOptions.find(g => g.id === groupeId) || null;

  // Reset module when groupe changes
  useEffect(() => { setModuleKey(''); }, [groupeId]);

  // ── Proceed to saisie ─────────────────────────────────────────────────────
  const handleProceed = useCallback(async () => {
    if (!groupeId || !moduleKey) return;
    setStep('saisie');
    setLoadingStudents(true);
    setError('');
    try {
      // Load students in this groupe
      const studSnap = await getDocs(
        query(collection(db, 'students'), where('groupeId', '==', groupeId))
      );
      const list = studSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setStudents(list);

      // Load existing evaluations for this (groupe, module, type, semestre)
      const evSnap = await getDocs(
        query(collection(db, 'evaluations'), where('groupeId', '==', groupeId))
      );
      const existing = evSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e =>
          e.source === 'intervenant' &&
          e.type === evalType &&
          e.sessionAcademique === semestre &&
          (e.moduleId === selectedModule?.id || e.moduleNom === selectedModule?.nom)
        );
      setExistingSessions(existing);

      // Empty notes grid
      const init = {};
      list.forEach(s => { init[s.id] = { note: '', absent: false }; });
      setNotes(init);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStudents(false);
    }
  }, [groupeId, moduleKey, evalType, semestre, selectedModule]);

  // ── Session label ─────────────────────────────────────────────────────────
  const sessionLabel = evalType === 'CC'
    ? `CC-${existingSessions.length + 1}`
    : evalType;

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const nonEmpty = Object.entries(notes).filter(([, v]) => v.note !== '' || v.absent);
    if (nonEmpty.length === 0) { setError('Aucune note à enregistrer.'); return; }
    setSaving(true);
    setError('');
    try {
      // 1. Create evaluation doc
      const evalRef = await addDoc(collection(db, 'evaluations'), {
        type:             evalType,
        titre:            sessionLabel,
        code:             sessionLabel,
        moduleId:         selectedModule?.id  || '',
        moduleNom:        selectedModule?.nom || '',
        groupeId,
        sessionAcademique: semestre,
        anneeAcademique:  ANNEE,
        bareme:           20,
        coefficient:      1,
        source:           'intervenant',
        intervenantId,
        createdAt:        serverTimestamp(),
      });

      // 2. Batch-save notes
      const batch = writeBatch(db);
      let count = 0;
      for (const [studentId, { note, absent }] of Object.entries(notes)) {
        if (note === '' && !absent) continue;
        batch.set(doc(collection(db, 'notes')), {
          evaluationId:    evalRef.id,
          studentId,
          note:            absent ? null : Number(note),
          absent:          !!absent,
          anneeAcademique: ANNEE,
          intervenantId,
          createdAt:       serverTimestamp(),
          updatedAt:       serverTimestamp(),
        });
        count++;
      }
      await batch.commit();

      setSavedMsg(`${count} note${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''} (${sessionLabel}).`);
      setTimeout(() => setSavedMsg(''), 5000);

      // Update existing sessions + reset grid
      setExistingSessions(prev => [...prev, { id: evalRef.id, titre: sessionLabel }]);
      const reset = {};
      students.forEach(s => { reset[s.id] = { note: '', absent: false }; });
      setNotes(reset);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── CSV import ─────────────────────────────────────────────────────────────
  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) { setError('Fichier vide ou invalide.'); return; }
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().replace(/['"]/g, '').toLowerCase());

      const codeIdx  = ['code', 'code_etudiant', 'matricule'].reduce((f, k) => f >= 0 ? f : headers.indexOf(k), -1);
      const nomIdx   = headers.indexOf('nom');
      const prenomIdx = headers.indexOf('prenom');
      const noteIdx  = headers.indexOf('note');

      if (noteIdx < 0) { setError('Colonne "note" introuvable. Colonnes attendues : code, nom, prenom, note'); return; }

      const newNotes = { ...notes };
      let matched = 0;
      lines.slice(1).forEach(line => {
        const cells = line.split(sep).map(c => c.trim().replace(/['"]/g, ''));
        const rawNote = parseFloat(cells[noteIdx]?.replace(',', '.'));
        if (isNaN(rawNote)) return;
        const clamped = Math.min(20, Math.max(0, rawNote));

        let student = null;
        if (codeIdx >= 0) {
          const code = cells[codeIdx];
          student = students.find(s => s.code === code || s.studentCode === code || s.codeApprenant === code);
        }
        if (!student && nomIdx >= 0 && prenomIdx >= 0) {
          const nom   = cells[nomIdx]?.toLowerCase();
          const prenom = cells[prenomIdx]?.toLowerCase();
          student = students.find(s =>
            s.nom?.toLowerCase()   === nom &&
            s.prenom?.toLowerCase() === prenom
          );
        }
        if (student) { newNotes[student.id] = { note: String(clamped), absent: false }; matched++; }
      });
      setNotes(newNotes);
      setError(matched === 0 ? 'Aucun apprenant trouvé — vérifiez les colonnes code / nom / prenom.' : '');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const enteredCount = Object.values(notes).filter(v => v.note !== '' || v.absent).length;
  const evalTypeLabel = EVAL_TYPES.find(t => t.value === evalType)?.label || evalType;

  // ── CONFIG STEP ───────────────────────────────────────────────────────────
  if (step === 'config') {
    return (
      <div className="space-y-5">
        <DeadlinesSummary />

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-700 text-sm">Nouvelle saisie de notes</h2>

          {/* Groupe */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Groupe</label>
            <select
              value={groupeId}
              onChange={e => setGroupeId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Choisir un groupe —</option>
              {groupeOptions.map(g => (
                <option key={g.id} value={g.id}>{g.nom}</option>
              ))}
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Module</label>
            <select
              value={moduleKey}
              onChange={e => setModuleKey(e.target.value)}
              disabled={!groupeId}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
            >
              <option value="">— Choisir un module —</option>
              {moduleOptions.map(m => (
                <option key={m.key} value={m.key}>{m.nom}</option>
              ))}
            </select>
          </div>

          {/* Semestre + Type (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Semestre</label>
              <select
                value={semestre}
                onChange={e => setSemestre(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="S1">Semestre 1</option>
                <option value="S2">Semestre 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type d'évaluation</label>
              <select
                value={evalType}
                onChange={e => setEvalType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {EVAL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Formula reminder */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 leading-relaxed">
            <p className="font-bold mb-1">Calcul de la moyenne</p>
            <p>EFM × 60 % + moyenne(CC + Participation + TD + Soutenance) × 40 %</p>
            <p className="mt-0.5 text-blue-600">Note de Rattrapage remplace l'EFM si supérieure, plafonnée à 12/20.</p>
          </div>

          <button
            onClick={handleProceed}
            disabled={!groupeId || !moduleKey}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: '#005989' }}
          >
            Accéder à la saisie →
          </button>
        </div>
      </div>
    );
  }

  // ── SAISIE STEP ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setStep('config'); setStudents([]); setNotes({}); setExistingSessions([]); setError(''); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <IcoBack /> Retour
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs text-slate-500">Saisie des notes</span>
      </div>

      {/* Deadline banner */}
      <DeadlineBanner semestre={semestre} />

      {/* Context card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="text-slate-400">Groupe :</span> <span className="font-semibold text-slate-700">{selectedGroupe?.nom}</span></div>
          <div><span className="text-slate-400">Module :</span> <span className="font-semibold text-slate-700">{selectedModule?.nom}</span></div>
          <div><span className="text-slate-400">Semestre :</span> <span className="font-semibold text-slate-700">{semestre}</span></div>
          <div><span className="text-slate-400">Type :</span> <span className="font-semibold text-slate-700">{evalTypeLabel}</span></div>
        </div>

        {/* Existing sessions for this type */}
        {existingSessions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 mb-1.5">Séances déjà saisies pour ce type :</p>
            <div className="flex flex-wrap gap-2">
              {existingSessions.map(s => (
                <span key={s.id} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  ✓ {s.titre || s.code || s.type}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">
            Nouvelle session : <span className="text-[#005989]">{sessionLabel}</span>
          </span>
          <span className="text-xs text-slate-400">{students.length} apprenant{students.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Notes table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-600">
            {enteredCount}/{students.length} note{enteredCount > 1 ? 's' : ''} saisie{enteredCount > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <IcoUpload /> Importer CSV
            </button>
          </div>
        </div>

        {loadingStudents ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#005989', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="text-left px-4 py-2.5 w-8">#</th>
                  <th className="text-left px-4 py-2.5">Nom</th>
                  <th className="text-left px-4 py-2.5">Prénom</th>
                  <th className="text-left px-4 py-2.5 w-16">Code</th>
                  <th className="text-center px-4 py-2.5 w-28">Note /20</th>
                  <th className="text-center px-4 py-2.5 w-20">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((s, i) => {
                  const row = notes[s.id] || { note: '', absent: false };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-xs text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">{s.nom?.toUpperCase()}</td>
                      <td className="px-4 py-2 text-slate-600">{s.prenom}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 font-mono">{s.code || s.studentCode || '—'}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          value={row.note}
                          disabled={row.absent}
                          onChange={e => setNotes(prev => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], note: e.target.value },
                          }))}
                          placeholder="—"
                          className="w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.absent}
                          onChange={e => setNotes(prev => ({
                            ...prev,
                            [s.id]: { note: '', absent: e.target.checked },
                          }))}
                          className="w-4 h-4 rounded accent-red-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CSV format hint */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-400">
            Format CSV attendu : colonnes <code className="font-mono">code</code>, <code className="font-mono">nom</code>, <code className="font-mono">prenom</code>, <code className="font-mono">note</code> (séparateur , ou ;)
          </p>
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      {savedMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
          <IcoCheck /> {savedMsg}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || enteredCount === 0}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
        style={{ background: '#005989' }}
      >
        {saving ? (
          <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
        ) : (
          <IcoSave />
        )}
        {saving ? 'Enregistrement…' : `Enregistrer ${enteredCount > 0 ? `(${enteredCount} notes)` : ''}`}
      </button>
    </div>
  );
}
