import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
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

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES_RESSOURCE = ['Cours', 'TP', 'Examen', 'Livre', 'Vidéo', 'Article'];
const FILIERES = ['OTM', 'OFLP', 'AEL', 'ECOM', 'ADEE', 'LIC', 'Tous'];

const ACCEPTED_FILES = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp';

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
        {ressource.storageRef && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <UploadIcon />
            Fichier uploadé
          </p>
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

  // Upload state
  const [sourceMode, setSourceMode] = useState(
    ressource?.storageRef ? 'upload' : 'url'
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // 0–100 or null
  const fileInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const uploadFile = (file) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `bibliotheque/${timestamp}-${safeName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => reject(err),
        async () => {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          resolve({ downloadURL, storagePath });
        }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      let finalUrl = form.url?.trim() || '';
      let storageRef = ressource?.storageRef || '';

      if (sourceMode === 'upload' && selectedFile) {
        setUploadProgress(0);
        const { downloadURL, storagePath } = await uploadFile(selectedFile);
        finalUrl = downloadURL;
        storageRef = storagePath;
        setUploadProgress(null);
      }

      const data = {
        titre: form.titre.trim(),
        auteur: form.auteur.trim(),
        type: form.type,
        filiere: form.filiere,
        module: form.module.trim(),
        url: finalUrl,
        storageRef: storageRef,
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
      setUploadProgress(null);
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

          {/* Source: URL or Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Source du fichier</label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="radio"
                  name="sourceMode"
                  value="url"
                  checked={sourceMode === 'url'}
                  onChange={() => setSourceMode('url')}
                  className="accent-[#005989]"
                />
                Lien URL
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="radio"
                  name="sourceMode"
                  value="upload"
                  checked={sourceMode === 'upload'}
                  onChange={() => setSourceMode('upload')}
                  className="accent-[#005989]"
                />
                Uploader un fichier
              </label>
            </div>

            {sourceMode === 'url' ? (
              <input
                type="url"
                value={form.url}
                onChange={e => set('url', e.target.value)}
                placeholder="https://…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
              />
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#005989] hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#005989]/10 flex items-center justify-center text-[#005989]">
                      <UploadIcon />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-medium text-slate-800">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : ressource?.storageRef ? (
                      <div>
                        <p className="text-sm text-slate-600">Fichier déjà uploadé</p>
                        <p className="text-xs text-slate-400">Cliquer pour remplacer</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-slate-600">Cliquer pour sélectionner</p>
                        <p className="text-xs text-slate-400">PDF, PPT, DOC, XLS, images</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILES}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Progress bar */}
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Upload en cours…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-[#005989] transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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
          <button
            onClick={handleSubmit}
            disabled={saving || uploadProgress !== null}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60"
          >
            {uploadProgress !== null
              ? `Upload ${uploadProgress}%…`
              : saving
              ? 'Enregistrement…'
              : ressource ? 'Modifier' : 'Ajouter'}
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
      // Delete from Storage if uploaded file
      if (r.storageRef) {
        try {
          const storageRef = ref(storage, r.storageRef);
          await deleteObject(storageRef);
        } catch (storageErr) {
          // File may already be deleted; proceed
          console.warn('Storage delete warning:', storageErr.message);
        }
      }
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

      {/* Plateformes numériques partenaires */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Plateformes numériques
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ScholarVox */}
          <a
            href="https://international.scholarvox.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-shadow flex flex-col"
            style={{ background: 'linear-gradient(135deg, #e65c00 0%, #f9a825 100%)' }}
          >
            <div className="p-6 flex gap-4 items-start flex-1">
              <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(255,255,255,0.2)' }}>
                <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9">
                  <rect x="6" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.9"/>
                  <rect x="10" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.6"/>
                  <rect x="14" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.3"/>
                  <path d="M10 16h16M10 22h14M10 28h12" stroke="#e65c00" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-xl">ScholarVox</p>
                <p className="text-white/70 text-xs font-medium mt-0.5">Bibliothèque numérique internationale</p>
                <p className="text-white/80 text-sm mt-2 leading-relaxed">
                  Accès illimité à des milliers d'ouvrages académiques, manuels et ressources pédagogiques.
                </p>
              </div>
            </div>
            <div className="px-6 pb-5">
              <span className="inline-flex items-center gap-1.5 bg-white/15 group-hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Accéder au catalogue
              </span>
            </div>
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white opacity-5" />
          </a>

          {/* ALTISSIA */}
          <a
            href="https://learn.altissia.org/platform/login?interfaceLg=fr_FR"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-shadow flex flex-col"
            style={{ background: 'linear-gradient(135deg, #162a4a 0%, #1e3a6e 100%)' }}
          >
            <div className="p-6 flex gap-4 items-start flex-1">
              <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(157,196,31,0.2)' }}>
                <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9">
                  <rect x="8" y="8" width="32" height="32" rx="6" fill="#9dc41f" opacity="0.9"/>
                  <path d="M24 13 L33 35 M24 13 L15 35 M18.5 26 L29.5 26" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-xl tracking-wide">ALTISSIA</p>
                <p className="text-[#9dc41f] text-xs font-semibold mt-0.5 uppercase tracking-wider">Language empowers people</p>
                <p className="text-white/80 text-sm mt-2 leading-relaxed">
                  Apprenez et perfectionnez vos langues étrangères avec la plateforme e-learning interactive.
                </p>
              </div>
            </div>
            <div className="px-6 pb-5">
              <span className="inline-flex items-center gap-1.5 bg-white/10 group-hover:bg-white/20 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Accéder à la plateforme
              </span>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white opacity-5" />
          </a>
        </div>
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
