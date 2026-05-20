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

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POSTES = ['Intervenant', 'Responsable scolarité', 'Direction', 'Administratif'];
const TYPES_CONTRAT = ['CDI', 'CDD', 'Vacation', 'Freelance'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR');
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(Number(n)) + ' DH';
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 border-l-4 ${color}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Statut Badge ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const map = {
    actif:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Actif' },
    inactif: { cls: 'bg-slate-100 text-slate-600',     label: 'Inactif' },
    conge:   { cls: 'bg-amber-100 text-amber-700',     label: 'En congé' },
  };
  const { cls, label } = map[statut] || { cls: 'bg-slate-100 text-slate-600', label: statut };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}

// ─── Personnel Form Modal ─────────────────────────────────────────────────────

const EMPTY_FORM = {
  nom: '', prenom: '', poste: 'Intervenant', typeContrat: 'CDI',
  dateEmbauche: '', salaireBase: '', rib: '', cin: '',
  telephone: '', email: '', statut: 'actif',
};

function PersonnelModal({ personnel, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(
    personnel
      ? { ...EMPTY_FORM, ...personnel, salaireBase: personnel.salaireBase != null ? String(personnel.salaireBase) : '' }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const data = {
        nom: form.nom.trim().toUpperCase(),
        prenom: form.prenom.trim(),
        poste: form.poste,
        typeContrat: form.typeContrat,
        dateEmbauche: form.dateEmbauche || null,
        salaireBase: form.salaireBase !== '' ? Number(form.salaireBase) : null,
        rib: form.rib.trim(),
        cin: form.cin.trim().toUpperCase(),
        telephone: form.telephone.trim(),
        email: form.email.trim().toLowerCase(),
        statut: form.statut,
      };
      if (personnel) {
        await updateDoc(doc(db, 'personnel', personnel.id), data);
        toast.success('Personnel modifié');
      } else {
        await addDoc(collection(db, 'personnel'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Personnel ajouté');
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
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 overflow-y-auto py-4">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6 shadow-xl my-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">
            {personnel ? 'Modifier le membre' : 'Ajouter un membre'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Identité */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Identité</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
                <input type="text" value={form.nom} onChange={e => set('nom', e.target.value)}
                  required placeholder="NOM"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
                <input type="text" value={form.prenom} onChange={e => set('prenom', e.target.value)}
                  placeholder="Prénom"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CIN</label>
                <input type="text" value={form.cin} onChange={e => set('cin', e.target.value)}
                  placeholder="AB123456"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)}
                  placeholder="06XXXXXXXX"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="prenom.nom@iftl.ma"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
            </div>
          </fieldset>

          {/* Contrat */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Contrat &amp; Poste</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poste</label>
                <select value={form.poste} onChange={e => set('poste', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type de contrat</label>
                <select value={form.typeContrat} onChange={e => set('typeContrat', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  {TYPES_CONTRAT.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'embauche</label>
                <input type="date" value={form.dateEmbauche} onChange={e => set('dateEmbauche', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Statut</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="conge">En congé</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Paie */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Paie &amp; Bancaire</legend>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Salaire de base (MAD)</label>
              <input type="number" min="0" step="0.01" value={form.salaireBase}
                onChange={e => set('salaireBase', e.target.value)} placeholder="0.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">RIB bancaire</label>
              <input type="text" value={form.rib} onChange={e => set('rib', e.target.value)}
                placeholder="XXX XXXXXXXXXX XXXXXXXXXX XX"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] font-mono" />
            </div>
          </fieldset>
        </form>

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : personnel ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RHPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPoste, setFilterPoste] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const loadPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'personnel'), orderBy('nom', 'asc'));
      const snap = await getDocs(q);
      setPersonnel(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPersonnel(); }, [loadPersonnel]);

  const handleDelete = async (p) => {
    const ok = await confirm({
      title: 'Supprimer ce membre ?',
      message: `${p.nom} ${p.prenom} sera définitivement supprimé du registre.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'personnel', p.id));
      toast.success('Membre supprimé');
      loadPersonnel();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = personnel.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nom?.toLowerCase().includes(q) || p.prenom?.toLowerCase().includes(q);
    const matchPoste  = !filterPoste  || p.poste   === filterPoste;
    const matchStatut = !filterStatut || p.statut  === filterStatut;
    return matchSearch && matchPoste && matchStatut;
  });

  // KPIs
  const total         = personnel.length;
  const actifs        = personnel.filter(p => p.statut === 'actif').length;
  const enConge       = personnel.filter(p => p.statut === 'conge').length;
  const masseSalariale = personnel
    .filter(p => p.statut === 'actif')
    .reduce((sum, p) => sum + (Number(p.salaireBase) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ressources Humaines &amp; Paie</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading
              ? 'Chargement…'
              : `${personnel.length} membre${personnel.length !== 1 ? 's' : ''} enregistré${personnel.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Ajouter
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total personnel"  value={total}                 color="border-[#005989]" />
        <KpiCard label="Actifs"           value={actifs}                color="border-emerald-500" />
        <KpiCard label="En congé"         value={enConge}               color="border-amber-400" />
        <KpiCard label="Masse salariale"  value={formatCurrency(masseSalariale)} sub="salaires actifs" color="border-[#f5c845]" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Tous les postes</option>
            {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="conge">En congé</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
              <UsersIcon />
            </div>
            <p className="text-slate-500 font-medium">Aucun membre trouvé</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filterPoste || filterStatut
                ? 'Modifiez vos filtres.'
                : 'Cliquez sur "Ajouter" pour enregistrer un premier membre.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Nom Prénom</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Poste</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Contrat</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Date embauche</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Salaire</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.nom} {p.prenom}</p>
                      {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.poste || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {p.typeContrat || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{formatDate(p.dateEmbauche)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 hidden lg:table-cell">
                      {formatCurrency(p.salaireBase)}
                    </td>
                    <td className="px-4 py-3"><StatutBadge statut={p.statut} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditing(p); setShowForm(true); }}
                          className="p-1.5 text-slate-500 hover:text-[#005989] hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-colors"
                          title="Modifier"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <PersonnelModal
          personnel={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={loadPersonnel}
        />
      )}
    </div>
  );
}
