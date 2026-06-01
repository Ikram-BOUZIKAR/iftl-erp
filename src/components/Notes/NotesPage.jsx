import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import { generateBulletin } from '../../services/pdfService';

const TYPE_EVAL_STYLES = {
  controle: { cls: 'bg-sky-100 text-sky-700', label: 'Contrôle' },
  examen_session: { cls: 'bg-violet-100 text-violet-700', label: 'Examen Fin Module' },
  examen_rattrapage: { cls: 'bg-orange-100 text-orange-700', label: 'Rattrapage' },
  tp: { cls: 'bg-teal-100 text-teal-700', label: 'TP' },
  projet: { cls: 'bg-rose-100 text-rose-700', label: 'Projet' },
};

const TABS = [
  { key: 'evaluations', label: 'Évaluations' },
  { key: 'saisie', label: 'Saisie des notes' },
  { key: 'bulletins', label: 'Bulletins' },
];

const EMPTY_EVAL_FORM = {
  code: '',
  titre: '',
  type: 'controle',
  moduleId: '',
  groupeId: '',
  date: '',
  bareme: 20,
  coefficient: 1,
  sessionAcademique: 'S1',
};

function noteColor(note) {
  if (note === null || note === undefined) return 'text-slate-400';
  if (note >= 12) return 'text-emerald-600 font-semibold';
  if (note >= 10) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function noteBadge(note, absent) {
  if (absent) return 'bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium';
  if (note === null || note === undefined) return 'bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full text-xs';
  if (note >= 12) return 'bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold';
  if (note >= 10) return 'bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold';
  return 'bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold';
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

function Spinner() {
  return <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" />;
}

// ─── Tab: Évaluations ─────────────────────────────────────────────────────────

function EvaluationsTab({ evaluations, loadingEval, modules, groupes, onRefetch }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_EVAL_FORM);
  const [saving, setSaving] = useState(false);
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(EMPTY_EVAL_FORM); setEditing(null); setShowForm(true); };
  const openEdit = (ev) => {
    setForm({
      code: ev.code || '',
      titre: ev.titre || '',
      type: ev.type || 'controle',
      moduleId: ev.moduleId || '',
      groupeId: ev.groupeId || '',
      date: ev.date || '',
      bareme: ev.bareme ?? 20,
      coefficient: ev.coefficient ?? 1,
      sessionAcademique: ev.sessionAcademique || 'S1',
    });
    setEditing(ev);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, bareme: Number(form.bareme), coefficient: Number(form.coefficient) };
      if (editing) {
        await updateDoc(doc(db, 'evaluations', editing.id), { ...payload, updatedAt: new Date() });
        toast.success('Évaluation modifiée');
      } else {
        await addDoc(collection(db, 'evaluations'), { ...payload, createdAt: new Date() });
        toast.success('Évaluation créée');
      }
      setShowForm(false);
      onRefetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev) => {
    const ok = await confirm({
      title: 'Supprimer cette évaluation ?',
      message: `"${ev.titre}" et toutes les notes associées seront supprimées.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'evaluations', ev.id));
      toast.success('Évaluation supprimée');
      onRefetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = useMemo(() => evaluations.filter(ev => {
    if (filterGroupe && ev.groupeId !== filterGroupe) return false;
    if (filterModule && ev.moduleId !== filterModule) return false;
    return true;
  }), [evaluations, filterGroupe, filterModule]);

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterGroupe}
          onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Tous les modules</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
        </select>
        <button
          onClick={openAdd}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <PlusIcon />
          Nouvelle évaluation
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loadingEval ? (
          <div className="p-10 text-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">Aucune évaluation trouvée.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Module</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Barème</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(ev => {
                const typeStyle = TYPE_EVAL_STYLES[ev.type] || { cls: 'bg-slate-100 text-slate-600', label: ev.type };
                const mod = modules.find(m => m.id === ev.moduleId);
                const grp = groupes.find(g => g.id === ev.groupeId);
                return (
                  <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{ev.titre}</p>
                      {ev.code && <p className="text-xs text-slate-400 font-mono">{ev.code}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle.cls}`}>{typeStyle.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{mod ? `${mod.code} — ${mod.nom}` : '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{grp?.nom || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">
                      {ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">/{ev.bareme ?? 20} — coeff. {ev.coefficient ?? 1}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(ev)} className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(ev)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">{editing ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><CloseIcon /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code</label>
                  <input type="text" value={form.code} onChange={e => setField('code', e.target.value)}
                    placeholder="EV001"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Session</label>
                  <select value={form.sessionAcademique} onChange={e => setField('sessionAcademique', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                    <option value="S1">Semestre 1</option>
                    <option value="S2">Semestre 2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Titre *</label>
                <input type="text" value={form.titre} onChange={e => setField('titre', e.target.value)}
                  placeholder="Intitulé de l'évaluation" required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setField('type', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                    <option value="controle">Contrôle</option>
                    <option value="examen_session">Examen Fin Module</option>
                    <option value="examen_rattrapage">Rattrapage</option>
                    <option value="tp">TP</option>
                    <option value="projet">Projet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Module</label>
                  <select value={form.moduleId} onChange={e => setField('moduleId', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                    <option value="">— Sélectionner —</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Groupe</label>
                  <select value={form.groupeId} onChange={e => setField('groupeId', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                    <option value="">— Sélectionner —</option>
                    {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Barème</label>
                  <input type="number" min="1" value={form.bareme} onChange={e => setField('bareme', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Coefficient</label>
                  <input type="number" min="0" step="0.5" value={form.coefficient} onChange={e => setField('coefficient', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
                  {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Saisie des notes ────────────────────────────────────────────────────

function StudentHistoryModal({ student, evaluations, modules, onClose }) {
  const [allNotes, setAllNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    getDocs(query(collection(db, 'notes'), where('studentId', '==', student.id))).then(snap => {
      const ns = [];
      snap.forEach(d => ns.push({ id: d.id, ...d.data() }));
      setAllNotes(ns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student?.id]);

  const rows = allNotes.map(n => {
    const ev = evaluations.find(e => e.id === n.evaluationId);
    const mod = ev ? modules.find(m => m.id === ev.moduleId) : null;
    return { note: n.note, absent: n.absent, evalTitre: ev?.titre || n.evaluationId, modNom: mod ? `${mod.code} — ${mod.nom}` : ev?.moduleId || '—', type: ev?.type || '' };
  }).sort((a, b) => a.modNom.localeCompare(b.modNom));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <p className="font-bold text-slate-800">{student.prenom} {student.nom}</p>
            <p className="text-xs text-slate-400">{student.code} · {student.groupeId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Aucune note enregistrée.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left py-2 pr-3">Module</th>
                <th className="text-left py-2 pr-3">Évaluation</th>
                <th className="text-right py-2">Note</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 pr-3 text-slate-600 text-xs">{r.modNom}</td>
                    <td className="py-2 pr-3 text-slate-500 text-xs truncate max-w-[160px]">{r.evalTitre}</td>
                    <td className="py-2 text-right">
                      {r.absent
                        ? <span className="text-xs text-red-500 font-medium">Absent</span>
                        : r.note === null ? <span className="text-slate-300">—</span>
                        : <span className={`font-bold ${r.note >= 12 ? 'text-emerald-600' : r.note >= 10 ? 'text-amber-600' : 'text-red-600'}`}>{r.note}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SaisieTab({ evaluations, modules, groupes }) {
  const toast = useToast();
  const [selectedEvalId, setSelectedEvalId] = useState('');
  const [students, setStudents] = useState([]);
  const [notes, setNotes] = useState({}); // { studentId: { note, absent, commentaire } }
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);

  const selectedEval = evaluations.find(e => e.id === selectedEvalId);

  const fetchStudentsAndNotes = useCallback(async () => {
    if (!selectedEval?.groupeId) return;
    setLoadingStudents(true);
    try {
      const sq = query(collection(db, 'students'), where('groupeId', '==', selectedEval.groupeId));
      const snap = await getDocs(sq);
      const grpStudents = [];
      snap.forEach(d => grpStudents.push({ id: d.id, ...d.data() }));
      grpStudents.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      setStudents(grpStudents);

      // Fetch existing notes
      const nq = query(collection(db, 'notes'), where('evaluationId', '==', selectedEvalId));
      const nSnap = await getDocs(nq);
      const existing = {};
      nSnap.forEach(d => {
        const nd = d.data();
        existing[nd.studentId] = { id: d.id, note: nd.note ?? '', absent: nd.absent ?? false, commentaire: nd.commentaire ?? '' };
      });
      // Initialise missing students
      const init = {};
      for (const s of grpStudents) {
        init[s.id] = existing[s.id] || { note: '', absent: false, commentaire: '' };
      }
      setNotes(init);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedEvalId, selectedEval?.groupeId]);

  useEffect(() => {
    if (selectedEvalId) fetchStudentsAndNotes();
    else { setStudents([]); setNotes({}); }
  }, [selectedEvalId, fetchStudentsAndNotes]);

  const updateNote = (studentId, field, value) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleBulkSave = async () => {
    if (!selectedEvalId) return;
    setSaving(true);
    try {
      // Fetch existing notes to decide create vs update
      const nq = query(collection(db, 'notes'), where('evaluationId', '==', selectedEvalId));
      const nSnap = await getDocs(nq);
      const existingMap = {};
      nSnap.forEach(d => { existingMap[d.data().studentId] = d.id; });

      const batch = writeBatch(db);
      for (const s of students) {
        const entry = notes[s.id] || { note: '', absent: false, commentaire: '' };
        const noteVal = entry.absent ? null : (entry.note === '' ? null : Number(entry.note));
        const payload = {
          evaluationId: selectedEvalId,
          studentId: s.id,
          note: noteVal,
          absent: entry.absent,
          commentaire: entry.commentaire || '',
          updatedAt: new Date(),
        };
        if (existingMap[s.id]) {
          batch.update(doc(db, 'notes', existingMap[s.id]), payload);
        } else {
          const newRef = doc(collection(db, 'notes'));
          batch.set(newRef, { ...payload, createdAt: new Date() });
        }
      }
      await batch.commit();
      toast.success(`${students.length} note${students.length !== 1 ? 's' : ''} enregistrée${students.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const bareme = selectedEval?.bareme ?? 20;

  return (
    <div className="space-y-4">
      {/* Evaluation selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-60">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sélectionner une évaluation</label>
          <select
            value={selectedEvalId}
            onChange={e => setSelectedEvalId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">— Choisir une évaluation —</option>
            {evaluations.map(ev => {
              const grp = groupes.find(g => g.id === ev.groupeId);
              return (
                <option key={ev.id} value={ev.id}>
                  {ev.titre} {grp ? `(${grp.nom})` : ''} — {ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : 'sans date'}
                </option>
              );
            })}
          </select>
        </div>
        {selectedEval && (
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Barème : <strong className="text-slate-700">/{bareme}</strong></span>
            <span>Coeff. : <strong className="text-slate-700">{selectedEval.coefficient}</strong></span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_EVAL_STYLES[selectedEval.type]?.cls || 'bg-slate-100 text-slate-600'}`}>
              {TYPE_EVAL_STYLES[selectedEval.type]?.label || selectedEval.type}
            </span>
          </div>
        )}
      </div>

      {selectedEvalId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingStudents ? (
            <div className="p-10 text-center"><Spinner /></div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">Aucun apprenant dans ce groupe.</div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {students.length} apprenant{students.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={handleBulkSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
                >
                  <SaveIcon />
                  {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Apprenant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Note /{bareme}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Absent</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => {
                    const entry = notes[s.id] || { note: '', absent: false, commentaire: '' };
                    const noteNum = entry.note === '' ? null : Number(entry.note);
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${entry.absent ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setHistoryStudent(s)}
                            className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-1 py-0.5 transition-colors group text-left w-full"
                            title="Voir historique des notes"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#005989]/10 flex items-center justify-center text-xs font-bold text-[#005989] shrink-0">
                              {s.prenom?.[0]}{s.nom?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 group-hover:text-[#005989] transition-colors">{s.prenom} {s.nom}</p>
                              {s.cin && <p className="text-xs text-slate-400">{s.cin}</p>}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {!entry.absent && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={bareme}
                                step="0.25"
                                value={entry.note}
                                onChange={e => updateNote(s.id, 'note', e.target.value)}
                                className="w-20 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005989]"
                                placeholder="—"
                              />
                              {noteNum !== null && (
                                <span className={noteBadge(noteNum, false)}>{noteNum}</span>
                              )}
                            </div>
                          )}
                          {entry.absent && <span className="text-xs text-red-500 font-medium">Absent(e)</span>}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={entry.absent}
                            onChange={e => updateNote(s.id, 'absent', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 accent-[#005989]"
                          />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <input
                            type="text"
                            value={entry.commentaire}
                            onChange={e => updateNote(s.id, 'commentaire', e.target.value)}
                            placeholder="Commentaire facultatif"
                            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005989]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          evaluations={evaluations}
          modules={modules}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Bulletins ───────────────────────────────────────────────────────────

function BulletinsTab({ evaluations, modules, groupes }) {
  const toast = useToast();
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [bulletin, setBulletin] = useState([]); // [{ module, notes: [], moyenne }]
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingBulletin, setLoadingBulletin] = useState(false);

  useEffect(() => {
    if (!selectedGroupeId) { setStudents([]); setSelectedStudentId(''); return; }
    setLoadingStudents(true);
    const fetchStudents = async () => {
      try {
        const sq = query(collection(db, 'students'), where('groupeId', '==', selectedGroupeId));
        const snap = await getDocs(sq);
        const all = [];
        snap.forEach(d => all.push({ id: d.id, ...d.data() }));
        all.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        setStudents(all);
        setSelectedStudentId('');
        setBulletin([]);
      } catch (err) {
        toast.error('Erreur : ' + err.message);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedGroupeId]);

  useEffect(() => {
    if (!selectedStudentId) { setBulletin([]); return; }
    setLoadingBulletin(true);
    const fetchBulletin = async () => {
      try {
        const nq = query(collection(db, 'notes'), where('studentId', '==', selectedStudentId));
        const nSnap = await getDocs(nq);
        const studentNotes = [];
        nSnap.forEach(d => studentNotes.push({ id: d.id, ...d.data() }));

        // Group by module via evaluations
        const byModule = {};
        for (const n of studentNotes) {
          const ev = evaluations.find(e => e.id === n.evaluationId);
          if (!ev) continue;
          const mod = modules.find(m => m.id === ev.moduleId);
          const moduleKey = ev.moduleId || 'sans_module';
          const moduleName = mod ? `${mod.code} — ${mod.nom}` : 'Module inconnu';
          if (!byModule[moduleKey]) byModule[moduleKey] = { moduleName, coeff: mod?.coeff ?? 1, notes: [] };
          byModule[moduleKey].notes.push({
            evalTitre: ev.titre,
            evalType: ev.type,
            evalCoeff: ev.coefficient ?? 1,
            note: n.note,
            absent: n.absent,
            bareme: ev.bareme ?? 20,
          });
        }

        // Compute moyennes
        const result = Object.entries(byModule).map(([key, data]) => {
          const validNotes = data.notes.filter(n => !n.absent && n.note !== null);
          let moyenne = null;
          if (validNotes.length > 0) {
            const totalCoeff = validNotes.reduce((sum, n) => sum + n.evalCoeff, 0);
            if (totalCoeff > 0) {
              moyenne = validNotes.reduce((sum, n) => sum + ((n.note / n.bareme) * 20) * n.evalCoeff, 0) / totalCoeff;
            }
          }
          return { ...data, moduleKey: key, moyenne };
        });

        result.sort((a, b) => a.moduleName.localeCompare(b.moduleName));
        setBulletin(result);
      } catch (err) {
        toast.error('Erreur : ' + err.message);
      } finally {
        setLoadingBulletin(false);
      }
    };
    fetchBulletin();
  }, [selectedStudentId, evaluations, modules]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const generalMoyenne = useMemo(() => {
    const valid = bulletin.filter(b => b.moyenne !== null);
    if (valid.length === 0) return null;
    const totalCoeff = valid.reduce((sum, b) => sum + (b.coeff || 1), 0);
    if (totalCoeff === 0) return null;
    return valid.reduce((sum, b) => sum + b.moyenne * (b.coeff || 1), 0) / totalCoeff;
  }, [bulletin]);

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-52">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Groupe</label>
          <select
            value={selectedGroupeId}
            onChange={e => setSelectedGroupeId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">— Sélectionner un groupe —</option>
            {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
        </div>
        {selectedGroupeId && (
          <div className="flex-1 min-w-52">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Apprenant</label>
            {loadingStudents ? (
              <div className="h-10 flex items-center"><Spinner /></div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
              >
                <option value="">— Sélectionner un apprenant —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {selectedStudentId && (
        loadingBulletin ? (
          <div className="py-10 text-center"><Spinner /></div>
        ) : bulletin.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-500 text-sm">
            Aucune note trouvée pour cet apprenant.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Student header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#005989]/10 flex items-center justify-center text-sm font-bold text-[#005989] shrink-0">
                  {selectedStudent?.prenom?.[0]}{selectedStudent?.nom?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{selectedStudent?.prenom} {selectedStudent?.nom}</p>
                  <p className="text-xs text-slate-400">{groupes.find(g => g.id === selectedGroupeId)?.nom}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={() => generateBulletin(
                    selectedStudent,
                    groupes.find(g => g.id === selectedGroupeId)?.nom || '',
                    bulletin,
                    '2025-2026'
                  )}
                  title="Télécharger le bulletin PDF"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#005989] border border-[#005989]/30 rounded-xl hover:bg-[#005989]/10 transition-colors whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Bulletin PDF
                </button>
                {generalMoyenne !== null && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Moyenne générale</p>
                    <p className={`text-2xl font-bold ${noteColor(generalMoyenne)}`}>
                      {generalMoyenne.toFixed(2)}<span className="text-sm font-normal text-slate-400">/20</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Per-module notes */}
            {bulletin.map(b => (
              <div key={b.moduleKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">{b.moduleName}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">coeff. {b.coeff}</span>
                    {b.moyenne !== null ? (
                      <span className={noteBadge(b.moyenne, false)}>
                        moy. {b.moyenne.toFixed(2)}/20
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">pas de moyenne</span>
                    )}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Évaluation</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Note</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Note /20</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {b.notes.map((n, i) => {
                      const noteOn20 = (!n.absent && n.note !== null) ? (n.note / n.bareme) * 20 : null;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-700">{n.evalTitre}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_EVAL_STYLES[n.evalType]?.cls || 'bg-slate-100 text-slate-600'}`}>
                              {TYPE_EVAL_STYLES[n.evalType]?.label || n.evalType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {n.absent ? (
                              <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Absent(e)</span>
                            ) : n.note !== null ? (
                              <span className={noteBadge(noteOn20, false)}>{n.note}/{n.bareme}</span>
                            ) : (
                              <span className="text-xs text-slate-400">Non noté</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {noteOn20 !== null && (
                              <span className={`text-sm font-semibold ${noteColor(noteOn20)}`}>{noteOn20.toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [activeTab, setActiveTab] = useState('evaluations');
  const { data: groupes } = useGroupes();

  const [evaluations, setEvaluations] = useState([]);
  const [loadingEval, setLoadingEval] = useState(true);
  const [modules, setModules] = useState([]);

  const fetchEvaluations = useCallback(async () => {
    setLoadingEval(true);
    try {
      const snap = await getDocs(collection(db, 'evaluations'));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setEvaluations(data);
    } catch {
      // silent
    } finally {
      setLoadingEval(false);
    }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const q = query(collection(db, 'modules'), orderBy('code', 'asc'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setModules(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchEvaluations();
    fetchModules();
  }, [fetchEvaluations, fetchModules]);

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Notes & Évaluations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gestion des évaluations et saisie des notes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === t.key
                ? 'bg-white text-[#005989] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'evaluations' && (
        <EvaluationsTab
          evaluations={evaluations}
          loadingEval={loadingEval}
          modules={modules}
          groupes={groupes}
          onRefetch={fetchEvaluations}
        />
      )}
      {activeTab === 'saisie' && (
        <SaisieTab
          evaluations={evaluations}
          modules={modules}
          groupes={groupes}
        />
      )}
      {activeTab === 'bulletins' && (
        <BulletinsTab
          evaluations={evaluations}
          modules={modules}
          groupes={groupes}
        />
      )}
    </div>
  );
}
