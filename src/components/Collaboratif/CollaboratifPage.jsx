import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLONNES = [
  { id: 'a_faire',  label: 'À faire',   headerCls: 'border-slate-300 bg-slate-50',  dotCls: 'bg-slate-400' },
  { id: 'en_cours', label: 'En cours',  headerCls: 'border-blue-200 bg-blue-50',    dotCls: 'bg-blue-500' },
  { id: 'termine',  label: 'Terminé',   headerCls: 'border-emerald-200 bg-emerald-50', dotCls: 'bg-emerald-500' },
];

const PRIORITES = {
  haute:   { label: 'Haute',   cls: 'bg-red-100 text-red-700' },
  normale: { label: 'Normale', cls: 'bg-blue-100 text-blue-700' },
  basse:   { label: 'Basse',   cls: 'bg-slate-100 text-slate-600' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return null;
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 border-l-4 ${color}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ tache, onClick }) {
  const prio = PRIORITES[tache.priorite] || PRIORITES.normale;
  const overdue = isOverdue(tache.echeance);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-[#005989]/30 transition-all space-y-2.5"
    >
      {/* Title + priority */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{tache.titre}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${prio.cls}`}>
          {prio.label}
        </span>
      </div>

      {/* Description preview */}
      {tache.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{tache.description}</p>
      )}

      {/* Assignee + due date */}
      <div className="flex items-center gap-3 flex-wrap">
        {tache.assigneNom && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <UserIcon />{tache.assigneNom}
          </span>
        )}
        {tache.echeance && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
            overdue
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <CalendarIcon />
            {formatDate(tache.echeance)}
          </span>
        )}
      </div>

      {/* Tags */}
      {tache.tags && tache.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tache.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[#005989]/10 text-[#005989] font-medium">
              {tag}
            </span>
          ))}
          {tache.tags.length > 3 && (
            <span className="text-xs text-slate-400">+{tache.tags.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Tache Form / Detail Panel ────────────────────────────────────────────────

const EMPTY_FORM = {
  titre: '', description: '', priorite: 'normale',
  statut: 'a_faire', assigneNom: '', echeance: '', tagsInput: '',
};

function TachePanel({ tache, defaultStatut, onClose, onSaved, onDelete }) {
  const toast = useToast();
  const [form, setForm] = useState(
    tache
      ? { ...EMPTY_FORM, ...tache, tagsInput: (tache.tags || []).join(', ') }
      : { ...EMPTY_FORM, statut: defaultStatut || 'a_faire' }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const parseTags = (str) =>
    str.split(',').map(t => t.trim()).filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      const data = {
        titre: form.titre.trim(),
        description: form.description.trim(),
        priorite: form.priorite,
        statut: form.statut,
        assigneNom: form.assigneNom.trim(),
        echeance: form.echeance || null,
        tags: parseTags(form.tagsInput),
      };
      if (tache) {
        await updateDoc(doc(db, 'taches', tache.id), data);
        toast.success('Tâche modifiée');
      } else {
        await addDoc(collection(db, 'taches'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Tâche créée');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {tache ? 'Détail de la tâche' : 'Nouvelle tâche'}
          </h2>
          <div className="flex items-center gap-2">
            {tache && (
              <button
                onClick={() => onDelete(tache)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer"
              >
                <TrashIcon />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Titre *</label>
            <input type="text" value={form.titre} onChange={e => set('titre', e.target.value)}
              required placeholder="Titre de la tâche"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Détails de la tâche…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priorité</label>
              <select value={form.priorite} onChange={e => set('priorite', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                <option value="haute">Haute</option>
                <option value="normale">Normale</option>
                <option value="basse">Basse</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigné à</label>
              <input type="text" value={form.assigneNom} onChange={e => set('assigneNom', e.target.value)}
                placeholder="Nom"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Échéance</label>
              <input type="date" value={form.echeance} onChange={e => set('echeance', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tags <span className="text-slate-400 font-normal">(séparés par des virgules)</span>
            </label>
            <input type="text" value={form.tagsInput} onChange={e => set('tagsInput', e.target.value)}
              placeholder="formation, urgent, admin"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
            {form.tagsInput && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tagsInput.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#005989]/10 text-[#005989] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : tache ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CollaboratifPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultStatut, setDefaultStatut] = useState('a_faire');

  const loadTaches = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'taches'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTaches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTaches(); }, [loadTaches]);

  const handleOpenNew = (statut) => {
    setEditing(null);
    setDefaultStatut(statut);
    setShowPanel(true);
  };

  const handleOpenEdit = (tache) => {
    setEditing(tache);
    setDefaultStatut(tache.statut);
    setShowPanel(true);
  };

  const handleDelete = async (tache) => {
    const ok = await confirm({
      title: 'Supprimer cette tâche ?',
      message: `"${tache.titre}" sera définitivement supprimée.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'taches', tache.id));
      toast.success('Tâche supprimée');
      setShowPanel(false);
      setEditing(null);
      loadTaches();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const byStatut = (statut) => taches.filter(t => t.statut === statut);
  const aFaire   = byStatut('a_faire');
  const enCours  = byStatut('en_cours');
  const termines = byStatut('termine');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Espace collaboratif</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${taches.length} tâche${taches.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => handleOpenNew('a_faire')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Nouvelle tâche
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="À faire"    value={aFaire.length}   color="border-slate-400" />
        <KpiCard label="En cours"   value={enCours.length}  color="border-blue-400" />
        <KpiCard label="Terminées"  value={termines.length} color="border-emerald-500" />
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm mt-3">Chargement…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLONNES.map(col => {
            const colTaches = byStatut(col.id);
            return (
              <div key={col.id} className={`rounded-2xl border ${col.headerCls} overflow-hidden flex flex-col`}>
                {/* Column header */}
                <div className={`px-4 py-3 border-b ${col.headerCls} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotCls}`} />
                    <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/80 text-slate-600 border border-slate-200">
                      {colTaches.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenNew(col.id)}
                    className="p-1 text-slate-400 hover:text-[#005989] hover:bg-white rounded-lg transition-colors"
                    title={`Ajouter dans "${col.label}"`}
                  >
                    <PlusIcon />
                  </button>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-2.5 flex-1 min-h-32">
                  {colTaches.length === 0 ? (
                    <div className="py-6 text-center">
                      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center mx-auto mb-2 text-slate-300">
                        <KanbanIcon />
                      </div>
                      <p className="text-xs text-slate-400">Aucune tâche</p>
                    </div>
                  ) : (
                    colTaches.map(t => (
                      <TaskCard
                        key={t.id}
                        tache={t}
                        onClick={() => handleOpenEdit(t)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-in Panel */}
      {showPanel && (
        <TachePanel
          tache={editing}
          defaultStatut={defaultStatut}
          onClose={() => { setShowPanel(false); setEditing(null); }}
          onSaved={loadTaches}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
