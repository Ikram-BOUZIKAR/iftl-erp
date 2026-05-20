import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import { useGroupes } from '../../hooks/useData';

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

function StarIcon({ filled }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-amber-400' : 'text-slate-300'}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES_ANNONCE = [
  { value: 'info', label: 'Information', badgeClass: 'bg-blue-100 text-blue-700', dotClass: 'bg-blue-500' },
  { value: 'urgent', label: 'Urgent', badgeClass: 'bg-red-100 text-red-700 animate-pulse', dotClass: 'bg-red-500' },
  { value: 'evenement', label: 'Événement', badgeClass: 'bg-emerald-100 text-emerald-700', dotClass: 'bg-emerald-500' },
  { value: 'administratif', label: 'Administratif', badgeClass: 'bg-slate-100 text-slate-600', dotClass: 'bg-slate-400' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isExpired(annonce) {
  if (!annonce.expirationDate) return false;
  return new Date(annonce.expirationDate) < new Date();
}

function getTypeInfo(value) {
  return TYPES_ANNONCE.find(t => t.value === value) || TYPES_ANNONCE[0];
}

function TypeBadge({ type }) {
  const info = getTypeInfo(type);
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.badgeClass}`}>
      {info.label}
    </span>
  );
}

// ─── Annonce Form (Slide-down, not modal) ─────────────────────────────────────

const EMPTY_FORM = {
  titre: '',
  contenu: '',
  type: 'info',
  expirationDate: '',
  pinned: false,
  cibleGroupes: [],
  cibleRoles: [],
};

function AnnonceForm({ groupes, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleGroupe = (id) => {
    setForm(f => ({
      ...f,
      cibleGroupes: f.cibleGroupes.includes(id)
        ? f.cibleGroupes.filter(g => g !== id)
        : [...f.cibleGroupes, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.contenu.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'annonces'), {
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        type: form.type,
        auteurId: null,
        auteurNom: 'Administration IFTL',
        datePublication: new Date().toISOString(),
        expirationDate: form.expirationDate || null,
        cibleGroupes: form.cibleGroupes,
        cibleRoles: form.cibleRoles,
        pinned: form.pinned,
        vues: 0,
      });
      toast.success('Annonce publiée');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-2">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-800">Nouvelle annonce</h2>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <CloseIcon />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Titre *</label>
          <input
            type="text"
            value={form.titre}
            onChange={e => set('titre', e.target.value)}
            required
            placeholder="Titre de l'annonce"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
            >
              {TYPES_ANNONCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'expiration</label>
            <input
              type="date"
              value={form.expirationDate}
              onChange={e => set('expirationDate', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Contenu *</label>
          <textarea
            value={form.contenu}
            onChange={e => set('contenu', e.target.value)}
            required
            rows={4}
            placeholder="Rédigez le contenu de l'annonce…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none"
          />
        </div>

        {/* Cible groupes */}
        {groupes.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Groupes ciblés <span className="text-slate-400 font-normal">(laisser vide = tous les groupes)</span>
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              {groupes.map(g => (
                <label
                  key={g.id}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    form.cibleGroupes.includes(g.id)
                      ? 'bg-[#005989] text-white border-[#005989]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#005989]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.cibleGroupes.includes(g.id)}
                    onChange={() => toggleGroupe(g.id)}
                  />
                  {g.nom}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => set('pinned', !form.pinned)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.pinned ? 'bg-[#005989]' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.pinned ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-700 font-medium flex items-center gap-1">
              <StarIcon filled={form.pinned} />
              Épingler cette annonce
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Publication…' : 'Publier l\'annonce'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Annonce List Item ────────────────────────────────────────────────────────

function AnnonceListItem({ annonce, selected, onClick }) {
  const expired = isExpired(annonce);
  const typeInfo = getTypeInfo(annonce.type);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected
          ? 'border-[#005989] bg-blue-50'
          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
      } ${expired ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={`font-semibold text-sm truncate ${expired ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {annonce.pinned && <StarIcon filled={true} />}{' '}
          {annonce.titre}
        </p>
        {annonce.pinned && <StarIcon filled={true} />}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <TypeBadge type={annonce.type} />
        <span className="text-xs text-slate-400">
          {annonce.datePublication ? formatDate(annonce.datePublication.split?.('T')[0] || annonce.datePublication) : ''}
        </span>
      </div>
      {expired && <p className="text-xs text-red-400 mt-1">Expirée</p>}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AnnoncesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: groupes } = useGroupes();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadAnnonces = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'annonces'), orderBy('datePublication', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort: pinned first, then by date
      list.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.datePublication) - new Date(a.datePublication);
      });
      setAnnonces(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnnonces(); }, [loadAnnonces]);

  const handleTogglePin = async (annonce) => {
    try {
      await updateDoc(doc(db, 'annonces', annonce.id), { pinned: !annonce.pinned });
      toast.success(annonce.pinned ? 'Annonce désépinglée' : 'Annonce épinglée');
      const updated = { ...annonce, pinned: !annonce.pinned };
      if (selected?.id === annonce.id) setSelected(updated);
      loadAnnonces();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleDelete = async (annonce) => {
    const ok = await confirm({
      title: 'Supprimer cette annonce ?',
      message: `"${annonce.titre}" sera définitivement supprimée.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'annonces', annonce.id));
      toast.success('Annonce supprimée');
      if (selected?.id === annonce.id) setSelected(null);
      loadAnnonces();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleFormSaved = () => {
    loadAnnonces();
    setShowForm(false);
  };

  const expired = selected ? isExpired(selected) : false;
  const selectedTypeInfo = selected ? getTypeInfo(selected.type) : null;

  const getGroupeNom = (id) => groupes.find(g => g.id === id)?.nom || id;

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Annonces &amp; Communications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${annonces.length} annonce${annonces.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          {showForm ? <CloseIcon /> : <PlusIcon />}
          {showForm ? 'Fermer' : 'Nouvelle annonce'}
        </button>
      </div>

      {/* Slide-down form */}
      {showForm && (
        <AnnonceForm
          groupes={groupes}
          onClose={() => setShowForm(false)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Main content: left list + right detail */}
      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-96">
        {/* Left panel: list */}
        <div className="w-1/3 min-w-56 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Toutes les annonces</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : annonces.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-400 text-sm">Aucune annonce</p>
              </div>
            ) : (
              annonces.map(a => (
                <AnnonceListItem
                  key={a.id}
                  annonce={a}
                  selected={selected?.id === a.id}
                  onClick={() => setSelected(a)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel: detail */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <MegaphoneIcon />
                </div>
                <p className="text-slate-500 font-medium">Sélectionnez une annonce</p>
                <p className="text-slate-400 text-sm mt-1">Cliquez sur une annonce dans la liste pour en voir le détail.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className={`px-6 py-4 border-b border-slate-100 flex-shrink-0 ${expired ? 'bg-slate-50 opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {selected.pinned && <StarIcon filled={true} />}
                      <TypeBadge type={selected.type} />
                      {expired && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-500">Expirée</span>
                      )}
                    </div>
                    <h2 className={`text-lg font-bold ${expired ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {selected.titre}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-400">
                        {selected.auteurNom || 'Administration'}
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        Publié le {formatDate(selected.datePublication?.split?.('T')[0] || selected.datePublication)}
                      </span>
                      {selected.expirationDate && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">
                            Expire le {formatDate(selected.expirationDate)}
                          </span>
                        </>
                      )}
                      {selected.vues > 0 && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{selected.vues} vue{selected.vues !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePin(selected)}
                      title={selected.pinned ? 'Désépingler' : 'Épingler'}
                      className={`p-2 rounded-lg border transition-colors ${
                        selected.pinned
                          ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
                          : 'border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-400 hover:bg-amber-50'
                      }`}
                    >
                      <StarIcon filled={selected.pinned} />
                    </button>
                    <button
                      onClick={() => handleDelete(selected)}
                      className="p-2 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cibles */}
              {(selected.cibleGroupes?.length > 0 || selected.cibleRoles?.length > 0) && (
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold">Ciblé : </span>
                    {selected.cibleGroupes?.length > 0
                      ? selected.cibleGroupes.map(id => getGroupeNom(id)).join(', ')
                      : 'Tous les groupes'}
                  </p>
                </div>
              )}

              {/* Contenu */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className={`prose prose-sm max-w-none ${expired ? 'opacity-60' : ''}`}>
                  {selected.contenu?.split('\n').map((line, i) => (
                    <p key={i} className="text-slate-700 leading-relaxed mb-2 last:mb-0">
                      {line || <br />}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
