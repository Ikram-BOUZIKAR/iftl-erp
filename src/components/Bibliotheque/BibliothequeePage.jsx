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

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES_RESSOURCE = ['Cours', 'TP', 'Examen', 'Livre', 'Vidéo', 'Article'];
const FILIERES = ['OTM', 'OFLP', 'AEL', 'ECOM', 'ADEE', 'LIC', 'Tous'];

const TYPE_STYLES = {
  'Cours':   { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  'TP':      { badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  'Examen':  { badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  'Livre':   { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  'Vidéo':   { badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  'Article': { badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeStyle(type) {
  return TYPE_STYLES[type] || { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
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

// ─── Resource Card ────────────────────────────────────────────────────────────

function ResourceCard({ ressource, onEdit, onDelete }) {
  const style = getTypeStyle(ressource.type);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
          {ressource.type}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          ressource.acces === 'public'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-slate-100 text-slate-500'
        }`}>
          {ressource.acces === 'public' ? 'Public' : 'Restreint'}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{ressource.titre}</h3>
        {ressource.auteur && (
          <p className="text-xs text-slate-500 mt-0.5">{ressource.auteur}</p>
        )}
        {ressource.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{ressource.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {ressource.filiere && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#005989]/10 text-[#005989]">
            {ressource.filiere}
          </span>
        )}
        {ressource.module && (
          <span className="text-xs text-slate-400 truncate max-w-32">{ressource.module}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(ressource)}
            className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <EditIcon />
          </button>
          <button
            onClick={() => onDelete(ressource)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <TrashIcon />
          </button>
        </div>
        {ressource.url && (
          <a
            href={ressource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#005989] text-white rounded-lg hover:bg-[#004a73] transition-colors"
          >
            <ExternalLinkIcon />
            Ouvrir
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Slide-in Panel (Add/Edit) ────────────────────────────────────────────────

const EMPTY_FORM = {
  titre: '', auteur: '', type: 'Cours', filiere: 'Tous',
  module: '', url: '', description: '', acces: 'public',
};

function RessourcePanel({ ressource, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(ressource ? { ...EMPTY_FORM, ...ressource } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      const data = {
        titre: form.titre.trim(),
        auteur: form.auteur.trim(),
        type: form.type,
        filiere: form.filiere,
        module: form.module.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        acces: form.acces,
      };
      if (ressource) {
        await updateDoc(doc(db, 'ressources', ressource.id), data);
        toast.success('Ressource modifiée');
      } else {
        await addDoc(collection(db, 'ressources'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Ressource ajoutée');
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
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md h-full shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">
            {ressource ? 'Modifier la ressource' : 'Ajouter une ressource'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Titre *</label>
            <input type="text" value={form.titre} onChange={e => set('titre', e.target.value)}
              required placeholder="Titre de la ressource"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Auteur</label>
            <input type="text" value={form.auteur} onChange={e => set('auteur', e.target.value)}
              placeholder="Nom de l'auteur"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                {TYPES_RESSOURCE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Filière</label>
              <select value={form.filiere} onChange={e => set('filiere', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Module</label>
            <input type="text" value={form.module} onChange={e => set('module', e.target.value)}
              placeholder="Ex: Transport international"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">URL</label>
            <input type="url" value={form.url} onChange={e => set('url', e.target.value)}
              placeholder="https://…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Courte description…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Accès</label>
            <select value={form.acces} onChange={e => set('acces', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
              <option value="public">Public</option>
              <option value="restreint">Restreint</option>
            </select>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : ressource ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BibliothequeePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [ressources, setRessources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');

  const loadRessources = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'ressources'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setRessources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRessources(); }, [loadRessources]);

  const handleDelete = async (r) => {
    const ok = await confirm({
      title: 'Supprimer cette ressource ?',
      message: `"${r.titre}" sera définitivement supprimée de la bibliothèque.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'ressources', r.id));
      toast.success('Ressource supprimée');
      loadRessources();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = ressources.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.titre?.toLowerCase().includes(q) || r.auteur?.toLowerCase().includes(q);
    const matchType    = !filterType    || r.type    === filterType;
    const matchFiliere = !filterFiliere || r.filiere === filterFiliere;
    return matchSearch && matchType && matchFiliere;
  });

  // KPIs
  const total    = ressources.length;
  const cours    = ressources.filter(r => r.type === 'Cours').length;
  const livresArt = ressources.filter(r => r.type === 'Livre' || r.type === 'Article').length;
  const videos   = ressources.filter(r => r.type === 'Vidéo').length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bibliothèque &amp; Ressources</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${ressources.length} ressource${ressources.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowPanel(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Ajouter ressource
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total ressources" value={total}     color="border-[#005989]" />
        <KpiCard label="Cours"            value={cours}     color="border-blue-400" />
        <KpiCard label="Livres / Articles" value={livresArt} color="border-emerald-400" />
        <KpiCard label="Vidéos"           value={videos}    color="border-purple-400" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Rechercher par titre, auteur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Tous les types</option>
            {TYPES_RESSOURCE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterFiliere} onChange={e => setFilterFiliere(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Toutes les filières</option>
            {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm mt-3">Chargement…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
            <BookOpenIcon />
          </div>
          <p className="text-slate-500 font-medium">Aucune ressource trouvée</p>
          <p className="text-slate-400 text-sm mt-1">
            {search || filterType || filterFiliere
              ? 'Modifiez vos filtres.'
              : 'Cliquez sur "Ajouter ressource" pour alimenter la bibliothèque.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ResourceCard
              key={r.id}
              ressource={r}
              onEdit={(item) => { setEditing(item); setShowPanel(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Slide-in Panel */}
      {showPanel && (
        <RessourcePanel
          ressource={editing}
          onClose={() => { setShowPanel(false); setEditing(null); }}
          onSaved={loadRessources}
        />
      )}
    </div>
  );
}
