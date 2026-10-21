import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useGroupes } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import { generateBulletin, generatePV } from '../../services/pdfService';
import { useBranding } from '../../contexts/BrandingContext';
import { useTranslation } from 'react-i18next';
import {
  calculerNouvelleFormule,
  getMention,
  calculerMoyennePassage,
  getDecisionPassage,
} from '../../utils/notesUtils';

// ── Helpers: group deduplication (hyphen vs en-dash) ─────────────────────────
function normalizeDash(str) {
  return (str || '').replace(/[–—]/g, '-').trim().toLowerCase();
}

// Returns all Firestore group IDs whose normalized name matches the given groupeId
function getAliasGroupIds(groupes, groupeId) {
  if (!groupeId || !groupes?.length) return [groupeId];
  const canon = groupes.find(g => g.id === groupeId);
  if (!canon) return [groupeId];
  const norm = normalizeDash(canon.nom);
  return groupes.filter(g => normalizeDash(g.nom) === norm).map(g => g.id);
}

// Deduplicated group list (one entry per normalized name, keeps first)
function uniqueByNorm(groupes) {
  const seen = new Map();
  (groupes || []).forEach(g => {
    const key = normalizeDash(g.nom);
    if (!seen.has(key)) seen.set(key, g);
  });
  return Array.from(seen.values());
}

// Fetch students from multiple group IDs, merging and deduplicating by id
async function fetchStudentsByGroupIds(groupIds) {
  const seen = new Set();
  const all = [];
  await Promise.all(
    [...new Set(groupIds)].map(async gId => {
      const snap = await getDocs(query(collection(db, 'students'), where('groupeId', '==', gId)));
      snap.forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); all.push({ id: d.id, ...d.data() }); }
      });
    })
  );
  return all.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
}

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
  { key: 'pv', label: 'PV du groupe' },
  { key: 'portail', label: '📥 Portail entrant' },
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
  const { t } = useTranslation();
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
          <option value="">{t('notes.all_groupes')}</option>
          {uniqueByNorm(groupes).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">{t('notes.all_modules')}</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
        </select>
        <button
          onClick={openAdd}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <PlusIcon />
          {t('notes.add_eval')}
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
              <h3 className="text-base font-bold text-slate-800">{editing ? t('common.edit') : t('notes.add_eval')}</h3>
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
                    {uniqueByNorm(groupes).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
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
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
                  {saving ? t('notes.saving') : editing ? t('common.edit') : t('common.add')}
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
    const studentCode = student.code || '';
    const byId = getDocs(query(collection(db, 'notes'), where('studentId', '==', student.id)));
    const byCode = studentCode && studentCode !== student.id
      ? getDocs(query(collection(db, 'notes'), where('studentId', '==', studentCode)))
      : Promise.resolve(null);
    Promise.all([byId, byCode]).then(([snapId, snapCode]) => {
      const seen = new Set();
      const ns = [];
      const add = (snap) => { if (!snap) return; snap.forEach(d => { if (seen.has(d.id)) return; seen.add(d.id); ns.push({ id: d.id, ...d.data() }); }); };
      add(snapId); add(snapCode);
      setAllNotes(ns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student?.id, student?.code]);

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
  const { t } = useTranslation();
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
      const grpStudents = await fetchStudentsByGroupIds(getAliasGroupIds(groupes, selectedEval.groupeId));
      setStudents(grpStudents);

      // Fetch existing notes
      const nq = query(collection(db, 'notes'), where('evaluationId', '==', selectedEvalId));
      const nSnap = await getDocs(nq);
      const existing = {};
      nSnap.forEach(d => {
        const nd = d.data();
        existing[nd.studentId] = { id: d.id, note: nd.note ?? '', absent: nd.absent ?? false, commentaire: nd.commentaire ?? '' };
      });
      // Initialise missing students — check both Firestore ID and student code (injected notes use code)
      const init = {};
      for (const s of grpStudents) {
        init[s.id] = existing[s.id] || existing[s.code] || { note: '', absent: false, commentaire: '' };
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
          {evaluations.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-600">
              Aucune évaluation disponible — créez-en une dans l'onglet <strong>Évaluations</strong>.
            </p>
          )}
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
                  {saving ? t('notes.saving') : t('notes.save_notes')}
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
        const all = await fetchStudentsByGroupIds(getAliasGroupIds(groupes, selectedGroupeId));
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
        const student = students.find(s => s.id === selectedStudentId);
        const studentCode = student?.code || '';
        const [snapById, snapByCode] = await Promise.all([
          getDocs(query(collection(db, 'notes'), where('studentId', '==', selectedStudentId))),
          studentCode && studentCode !== selectedStudentId
            ? getDocs(query(collection(db, 'notes'), where('studentId', '==', studentCode)))
            : Promise.resolve(null),
        ]);
        const seen = new Set();
        const studentNotes = [];
        const addSnap = (snap) => { if (!snap) return; snap.forEach(d => { if (seen.has(d.id)) return; seen.add(d.id); studentNotes.push({ id: d.id, ...d.data() }); }); };
        addSnap(snapById); addSnap(snapByCode);

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
  }, [selectedStudentId, students, evaluations, modules]);

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
            {uniqueByNorm(groupes).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
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
                    '2025-2026',
                    branding
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

// ─── PV Tab ───────────────────────────────────────────────────────────────────

function PvTab({ evaluations, modules, groupes }) {
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [students, setStudents] = useState([]);
  const [notesByStudent, setNotesByStudent] = useState({});
  const [groupeModules, setGroupeModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  const MENTIONS = { '≥16': 'Très Bien', '≥14': 'Bien', '≥12': 'Assez Bien', '≥10': 'Passable', '<10': 'Non Admis' };

  function getMoyenne(sNotes, moduleId) {
    const md = sNotes?.[moduleId];
    if (!md || md.moyenne === null || md.moyenne === undefined) return null;
    return md.moyenne;
  }

  function getMoyGen(sNotes, mods) {
    const valid = mods.map(m => ({ coeff: m.coeff ?? 1, moy: getMoyenne(sNotes, m.id) })).filter(x => x.moy !== null);
    const tc = valid.reduce((s, x) => s + x.coeff, 0);
    return tc > 0 ? valid.reduce((s, x) => s + x.moy * x.coeff, 0) / tc : null;
  }

  function mention(moy) {
    if (moy === null || moy === undefined) return '—';
    if (moy >= 16) return 'Très Bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez Bien';
    if (moy >= 10) return 'Passable';
    return 'Non Admis';
  }

  useEffect(() => {
    if (!selectedGroupeId) { setStudents([]); setNotesByStudent({}); setGroupeModules([]); return; }
    const load = async () => {
      setLoading(true);
      try {
        // Load students (resolving alias group IDs for hyphen/en-dash duplicates)
        const aliasIds = getAliasGroupIds(groupes, selectedGroupeId);
        const sts = await fetchStudentsByGroupIds(aliasIds);
        setStudents(sts);

        // Evaluations for this groupe (all alias IDs, no source filter)
        const grpEvals = evaluations.filter(e => aliasIds.includes(e.groupeId));
        const usedModuleIds = [...new Set(grpEvals.map(e => e.moduleId).filter(Boolean))];
        const usedMods = modules.filter(m => usedModuleIds.includes(m.id));
        setGroupeModules(usedMods);

        if (sts.length === 0 || grpEvals.length === 0) { setNotesByStudent({}); setLoading(false); return; }

        // Load all notes for these evaluations
        const evalIds = grpEvals.map(e => e.id);
        const notesMap = {};
        sts.forEach(s => { notesMap[s.id] = {}; });

        // Batch fetch notes per evaluation
        for (const ev of grpEvals) {
          const nSnap = await getDocs(query(collection(db, 'notes'), where('evaluationId', '==', ev.id)));
          nSnap.forEach(nd => {
            const n = nd.data();
            const sid = n.studentId;
            if (!notesMap[sid]) return;
            if (!notesMap[sid][ev.moduleId]) notesMap[sid][ev.moduleId] = { notes: [], moyenne: null };
            notesMap[sid][ev.moduleId].notes.push({
              type: ev.type, note: n.note ?? null, bareme: ev.bareme ?? 20,
              absent: n.absent ?? false, coeff: ev.coefficient ?? 1,
            });
          });
        }
        // Compute moyennes per module per student
        for (const sid of Object.keys(notesMap)) {
          for (const mid of Object.keys(notesMap[sid])) {
            const mdata = notesMap[sid][mid];
            const valid = mdata.notes.filter(n => !n.absent && n.note !== null);
            const tc = valid.reduce((s, n) => s + n.coeff, 0);
            mdata.moyenne = tc > 0 ? valid.reduce((s, n) => s + (n.note / n.bareme) * 20 * n.coeff, 0) / tc : null;
          }
        }
        setNotesByStudent(notesMap);
      } catch (err) {
        toast.error('Erreur chargement PV : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedGroupeId, evaluations, modules]);

  const groupe = groupes.find(g => g.id === selectedGroupeId);

  const admisCount = students.filter(s => {
    const moy = getMoyGen(notesByStudent[s.id], groupeModules);
    return moy !== null && moy >= 10;
  }).length;

  const handleGeneratePV = async () => {
    if (!groupe || students.length === 0) return;
    setGenerating(true);
    try {
      generatePV(groupe, students, groupeModules, notesByStudent, '2025-2026', branding);
    } catch (err) {
      toast.error('Erreur génération PV : ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-52">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Groupe</label>
          <select
            value={selectedGroupeId}
            onChange={e => setSelectedGroupeId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">— Sélectionner un groupe —</option>
            {uniqueByNorm(groupes).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
        </div>
        {selectedGroupeId && students.length > 0 && groupeModules.length > 0 && (
          <button
            onClick={handleGeneratePV}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#003d63] rounded-xl hover:bg-[#005989] transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {generating ? 'Génération…' : 'Télécharger PV PDF'}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <div className="py-10 text-center"><Spinner /></div>}

      {/* Summary */}
      {!loading && selectedGroupeId && students.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#003d63]">{students.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Apprenants</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{admisCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Admis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{students.length - admisCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Non Admis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {students.length > 0 ? ((admisCount / students.length) * 100).toFixed(0) : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Taux de réussite</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-600">{groupeModules.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Modules avec notes</p>
          </div>
        </div>
      )}

      {/* PV Table */}
      {!loading && selectedGroupeId && students.length > 0 && groupeModules.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#003d63] text-white">
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">N°</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Nom</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Prénom</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Code</th>
                  {groupeModules.map(m => (
                    <th key={m.id} className="px-2 py-3 text-center font-semibold whitespace-nowrap">
                      {m.code || m.nom}<br/>
                      <span className="font-normal opacity-75 text-[10px]">c.{m.coeff ?? 1}</span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Moy. Gén.</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Mention</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s, idx) => {
                  const sNotes = notesByStudent[s.id] || {};
                  const moyGen = getMoyGen(sNotes, groupeModules);
                  const dec = moyGen !== null ? (moyGen >= 10 ? 'Admis' : 'Non Admis') : '—';
                  return (
                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{s.nom}</td>
                      <td className="px-3 py-2 text-slate-700">{s.prenom}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">{s.codeApprenant || s.code || ''}</td>
                      {groupeModules.map(m => {
                        const moy = getMoyenne(sNotes, m.id);
                        return (
                          <td key={m.id} className="px-2 py-2 text-center">
                            {moy !== null ? (
                              <span className={`font-semibold ${moy >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {moy.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        {moyGen !== null ? (
                          <span className={`font-bold text-sm ${moyGen >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {moyGen.toFixed(2)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">{mention(moyGen)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dec === 'Admis' ? 'bg-emerald-100 text-emerald-700' : dec === 'Non Admis' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                          {dec}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && selectedGroupeId && students.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-500 text-sm">
          Aucun apprenant dans ce groupe.
        </div>
      )}

      {!loading && selectedGroupeId && students.length > 0 && groupeModules.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-sm">
          Aucune évaluation avec notes saisies pour ce groupe.
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { branding } = useBranding();
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
    } catch (err) {
      toast.error('Impossible de charger les évaluations : ' + err.message);
    } finally {
      setLoadingEval(false);
    }
  }, [toast]);

  const fetchModules = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'modules'));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.code || a.nom || '').localeCompare(b.code || b.nom || ''));
      setModules(data);
    } catch (err) {
      toast.error('Impossible de charger les modules : ' + err.message);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvaluations();
    fetchModules();
  }, [fetchEvaluations, fetchModules]);

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('notes.title')}</h1>
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
      {activeTab === 'pv' && (
        <PvTab
          evaluations={evaluations}
          modules={modules}
          groupes={groupes}
        />
      )}
      {activeTab === 'portail' && (
        <PortailEntrantTab />
      )}
    </div>
  );
}

// ── PORTAIL ENTRANT TAB ───────────────────────────────────────
function PortailEntrantTab() {
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(null);
  const [importing, setImporting]     = useState(null);
  const [rejecting, setRejecting]     = useState(null);
  const [filterStatut, setFilterStatut] = useState('en_attente');

  // Code d'accès management
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode]         = useState('');
  const [savingCode, setSavingCode]   = useState(false);
  const [codeLoaded, setCodeLoaded]   = useState(false);
  const [showCurrentCode, setShowCurrentCode] = useState(false);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'saisie_notes_portail'), orderBy('createdAt', 'desc')));
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const loadCode = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'portail_notes'));
      if (snap.exists()) setCurrentCode(snap.data().codeAcces || '');
      else setCurrentCode('');
    } catch (err) { console.error(err); }
    finally { setCodeLoaded(true); }
  };

  const handleSaveCode = async () => {
    const trimmed = newCode.trim();
    if (!trimmed) { toast.error('Saisissez un code non vide.'); return; }
    setSavingCode(true);
    try {
      await setDoc(doc(db, 'settings', 'portail_notes'), { codeAcces: trimmed }, { merge: true });
      setCurrentCode(trimmed);
      setNewCode('');
      toast.success('Code d\'accès mis à jour.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour : ' + (err.message || ''));
    } finally { setSavingCode(false); }
  };

  useEffect(() => { loadSubmissions(); loadCode(); }, []);

  const filtered = submissions.filter(s =>
    filterStatut === 'all' ? true : s.statut === filterStatut
  );

  const handleImport = async (sub) => {
    setImporting(sub.id);
    try {
      const evalRef = await addDoc(collection(db, 'evaluations'), {
        type:             sub.type,
        titre:            `${sub.type} — ${sub.moduleNom}`,
        code:             `${sub.type}-${sub.date || ''}-${(sub.moduleNom || '').split(/[\s\-–—]/)[0].toUpperCase().slice(0, 8)}`,
        moduleId:         sub.moduleId,
        moduleNom:        sub.moduleNom,
        groupeId:         sub.groupeId,
        sessionAcademique: sub.semestre,
        anneeAcademique:  sub.anneeAcademique || '2026-2027',
        bareme:           20,
        coefficient:      1,
        source:           'portail',
        intervenantNom:   sub.intervenantNom,
        date:             sub.date,
        createdAt:        serverTimestamp(),
      });

      const batch = writeBatch(db);
      (sub.notes || []).forEach(n => {
        if (!n.studentId) return;
        const ref = doc(collection(db, 'notes'));
        batch.set(ref, {
          evaluationId:   evalRef.id,
          studentId:      n.studentId,
          note:           n.note,
          absent:         n.absent || false,
          anneeAcademique: sub.anneeAcademique || '2026-2027',
          intervenantNom: sub.intervenantNom,
          createdAt:      serverTimestamp(),
          updatedAt:      serverTimestamp(),
        });
      });
      await batch.commit();

      await updateDoc(doc(db, 'saisie_notes_portail', sub.id), {
        statut: 'importé',
        importedAt: serverTimestamp(),
        evaluationId: evalRef.id,
      });
      toast.success('Notes importées avec succès dans le système.');
      loadSubmissions();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'import : ' + (err.message || ''));
    } finally { setImporting(null); }
  };

  const handleReject = async (subId) => {
    setRejecting(subId);
    try {
      await updateDoc(doc(db, 'saisie_notes_portail', subId), {
        statut: 'rejeté',
        rejectedAt: serverTimestamp(),
      });
      toast.success('Soumission rejetée.');
      loadSubmissions();
    } catch (err) {
      console.error(err);
      toast.error('Erreur.');
    } finally { setRejecting(null); }
  };

  const STATUT_STYLE = {
    en_attente: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
    importé:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Importé' },
    rejeté:     { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
  };

  const pending = submissions.filter(s => s.statut === 'en_attente').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Saisies reçues via le portail public</h3>
          <p className="text-sm text-slate-500">
            {pending > 0
              ? <><span className="font-bold text-amber-600">{pending}</span> soumission(s) en attente de validation</>
              : 'Toutes les soumissions ont été traitées'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter chips */}
          {[
            { key: 'en_attente', label: `En attente (${submissions.filter(s => s.statut === 'en_attente').length})` },
            { key: 'importé',    label: `Importés (${submissions.filter(s => s.statut === 'importé').length})` },
            { key: 'rejeté',     label: `Rejetés (${submissions.filter(s => s.statut === 'rejeté').length})` },
            { key: 'all',        label: 'Tout voir' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatut(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatut === f.key
                  ? 'bg-[#005989] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button onClick={loadSubmissions} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            ↻ Actualiser
          </button>
        </div>
      </div>

      {/* Lien portail + Code d'accès */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Lien */}
        <div className="bg-[#f0f7fc] border border-[#005989]/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🔗</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">Lien du portail public</p>
            <p className="text-xs text-slate-500 font-mono truncate">{window.location.origin}/portail-notes</p>
          </div>
          <button
            onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/portail-notes`); toast.success('Lien copié !'); }}
            className="shrink-0 px-3 py-1.5 bg-[#005989] text-white rounded-lg text-xs font-bold hover:bg-[#003c5a] transition-colors"
          >
            Copier
          </button>
        </div>

        {/* Code d'accès */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔐</span>
            <p className="font-semibold text-slate-800 text-sm">Code d'accès intervenants</p>
          </div>
          {codeLoaded && (
            <p className="text-xs text-slate-500 mb-2">
              Code actuel :{' '}
              {currentCode
                ? <span
                    className="font-mono font-bold text-[#005989] cursor-pointer select-all"
                    title="Cliquer pour afficher/masquer"
                    onClick={() => setShowCurrentCode(v => !v)}
                  >{showCurrentCode ? currentCode : '●'.repeat(Math.min(currentCode.length, 8))}</span>
                : <span className="italic text-amber-600">Aucun code — accès libre</span>
              }
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveCode()}
              placeholder={currentCode ? 'Nouveau code…' : 'Définir un code…'}
              className="flex-1 text-sm border border-amber-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
            />
            <button
              onClick={handleSaveCode}
              disabled={savingCode || !newCode.trim()}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {savingCode ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold">Aucune soumission {filterStatut !== 'all' ? `"${filterStatut}"` : ''}</p>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.map(sub => {
        const st = STATUT_STYLE[sub.statut] || STATUT_STYLE.en_attente;
        const isOpen = expanded === sub.id;
        const noteCount = (sub.notes || []).filter(n => !n.absent && n.note !== null && n.note !== undefined).length;
        const absentCount = (sub.notes || []).filter(n => n.absent).length;
        const createdLabel = sub.createdAt?.toDate
          ? sub.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';

        return (
          <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Card header */}
            <div
              className="p-4 flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setExpanded(isOpen ? null : sub.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-[#e8f4fb] flex items-center justify-center text-lg shrink-0">📝</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{sub.groupeNom}</span>
                  <span className="text-slate-400 text-xs">·</span>
                  <span className="text-slate-600 text-sm truncate max-w-[200px]">{sub.moduleNom}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                  <span className="text-xs text-slate-400">{sub.intervenantNom} · {sub.date}</span>
                  <span className="text-xs text-slate-400">{sub.type} · {sub.semestre}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">{createdLabel}</p>
                {sub.codeModification && (
                  <p className="text-xs font-mono font-bold text-[#005989] mt-0.5 cursor-pointer" title="Copier le code" onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(sub.codeModification); }}>
                    🔖 {sub.codeModification}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-[#005989]">{noteCount}</span> notes · <span className="font-semibold text-amber-600">{absentCount}</span> abs.
                </p>
              </div>
              <span className="text-slate-400 text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-slate-100">
                {/* Notes table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Apprenant</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Note / 20</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sub.notes || []).map((n, i) => (
                        <tr key={n.studentId || i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-slate-800">{n.nom} {n.prenom}</span>
                            {n.code && <span className="ml-2 text-xs text-slate-400">{n.code}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {n.absent
                              ? <span className="text-xs font-bold text-amber-600">ABS</span>
                              : <span className={`font-bold ${
                                  n.note === null ? 'text-slate-400'
                                  : n.note >= 10 ? 'text-emerald-600'
                                  : n.note >= 8  ? 'text-amber-600'
                                  : 'text-red-600'
                                }`}>{n.note !== null ? n.note : '—'}</span>
                            }
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {n.absent
                              ? <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Absent</span>
                              : n.note !== null
                                ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${n.note >= 10 ? 'bg-emerald-100 text-emerald-700' : n.note >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                    {n.note >= 10 ? 'Validé' : n.note >= 8 ? 'Rattrapage' : 'Non validé'}
                                  </span>
                                : <span className="text-xs text-slate-400">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                {sub.statut === 'en_attente' && (
                  <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-amber-700 font-medium">
                      ⚠ Cette saisie est en attente — vérifiez les données avant d'importer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(sub.id)}
                        disabled={rejecting === sub.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {rejecting === sub.id ? '…' : 'Rejeter'}
                      </button>
                      <button
                        onClick={() => handleImport(sub)}
                        disabled={importing === sub.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#005989] text-white hover:bg-[#003c5a] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {importing === sub.id
                          ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Import en cours…</>
                          : '✓ Valider & Importer'}
                      </button>
                    </div>
                  </div>
                )}
                {sub.statut === 'importé' && (
                  <div className="p-3 bg-emerald-50 border-t border-emerald-100">
                    <p className="text-xs text-emerald-700 font-medium text-center">
                      ✓ Notes intégrées dans le système · Évaluation ID : {sub.evaluationId || '—'}
                    </p>
                  </div>
                )}
                {sub.statut === 'rejeté' && (
                  <div className="p-3 bg-red-50 border-t border-red-100">
                    <p className="text-xs text-red-600 font-medium text-center">✗ Soumission rejetée</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
