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

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(Number(n)) + ' DH';
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('fr-FR');
}

// ─── Status badge configs ──────────────────────────────────────────────────────

const STATUT_ENTREPRISE = {
  prospect:   { label: 'Prospect',   cls: 'bg-amber-100 text-amber-700' },
  client:     { label: 'Client',     cls: 'bg-emerald-100 text-emerald-700' },
  partenaire: { label: 'Partenaire', cls: 'bg-blue-100 text-blue-700' },
};

const STATUT_SESSION = {
  planifiee:  { label: 'Planifiée',   cls: 'bg-slate-100 text-slate-600' },
  en_cours:   { label: 'En cours',    cls: 'bg-blue-100 text-blue-700' },
  terminee:   { label: 'Terminée',    cls: 'bg-emerald-100 text-emerald-700' },
  annulee:    { label: 'Annulée',     cls: 'bg-red-100 text-red-700' },
};

const STATUT_DEVIS = {
  brouillon: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-500' },
  envoye:    { label: 'Envoyé',    cls: 'bg-amber-100 text-amber-700' },
  accepte:   { label: 'Accepté',   cls: 'bg-emerald-100 text-emerald-700' },
  refuse:    { label: 'Refusé',    cls: 'bg-red-100 text-red-700' },
};

function StatusBadge({ map, value }) {
  const cfg = map[value] || { label: value, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
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

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-[#005989] text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
          active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
        }`}>{count}</span>
      )}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]';
const SELECT_CLS = INPUT_CLS + ' bg-white';

// ══════════════════════════════════════════════════════════════════════════════
// ─── ENTREPRISES ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const EMPTY_ENTREPRISE = {
  nom: '', secteur: '', ville: '', email: '', telephone: '',
  responsable: '', cnss: '', statut: 'prospect',
};

function EntrepriseModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(item ? { ...EMPTY_ENTREPRISE, ...item } : EMPTY_ENTREPRISE);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const data = {
        nom: form.nom.trim(),
        secteur: form.secteur.trim(),
        ville: form.ville.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        responsable: form.responsable.trim(),
        cnss: form.cnss.trim(),
        statut: form.statut,
      };
      if (item) {
        await updateDoc(doc(db, 'entreprises', item.id), data);
        toast.success('Entreprise modifiée');
      } else {
        await addDoc(collection(db, 'entreprises'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Entreprise ajoutée');
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
    <Modal
      title={item ? 'Modifier entreprise' : 'Ajouter une entreprise'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : item ? 'Modifier' : 'Ajouter'}
          </button>
        </>
      }
    >
      <Field label="Nom de l'entreprise" required>
        <input type="text" value={form.nom} onChange={e => set('nom', e.target.value)}
          required placeholder="Nom de l'entreprise" className={INPUT_CLS} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Secteur d'activité">
          <input type="text" value={form.secteur} onChange={e => set('secteur', e.target.value)}
            placeholder="Ex: Logistique" className={INPUT_CLS} />
        </Field>
        <Field label="Ville">
          <input type="text" value={form.ville} onChange={e => set('ville', e.target.value)}
            placeholder="Ex: Casablanca" className={INPUT_CLS} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="contact@entreprise.ma" className={INPUT_CLS} />
        </Field>
        <Field label="Téléphone">
          <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)}
            placeholder="+212 6xx xx xx xx" className={INPUT_CLS} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Responsable">
          <input type="text" value={form.responsable} onChange={e => set('responsable', e.target.value)}
            placeholder="Nom du responsable" className={INPUT_CLS} />
        </Field>
        <Field label="N° CNSS">
          <input type="text" value={form.cnss} onChange={e => set('cnss', e.target.value)}
            placeholder="CNSS / ICE" className={INPUT_CLS} />
        </Field>
      </div>
      <Field label="Statut">
        <select value={form.statut} onChange={e => set('statut', e.target.value)} className={SELECT_CLS}>
          <option value="prospect">Prospect</option>
          <option value="client">Client</option>
          <option value="partenaire">Partenaire</option>
        </select>
      </Field>
    </Modal>
  );
}

function EntreprisesTab({ entreprises, onRefresh }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | item

  const filtered = entreprises.filter(e => {
    const q = search.toLowerCase();
    return !q || e.nom?.toLowerCase().includes(q) || e.ville?.toLowerCase().includes(q) || e.responsable?.toLowerCase().includes(q);
  });

  const handleDelete = async (e) => {
    const ok = await confirm({
      title: 'Supprimer cette entreprise ?',
      message: `"${e.nom}" sera définitivement supprimée.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'entreprises', e.id));
      toast.success('Entreprise supprimée');
      onRefresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input type="text" placeholder="Rechercher par nom, ville…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
        </div>
        <button onClick={() => setModal('add')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm shrink-0">
          <PlusIcon />
          Ajouter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-300">
              <BuildingIcon />
            </div>
            <p className="text-slate-500 font-medium">Aucune entreprise trouvée</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Modifiez votre recherche.' : 'Cliquez sur "Ajouter" pour enregistrer une entreprise.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Secteur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ville</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Responsable</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{e.nom}</td>
                    <td className="px-4 py-3 text-slate-600">{e.secteur || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.ville || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.responsable || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600">{e.email || '—'}</div>
                      <div className="text-slate-400 text-xs">{e.telephone || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge map={STATUT_ENTREPRISE} value={e.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(e)}
                          className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(e)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
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
      {modal && (
        <EntrepriseModal
          item={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── SESSIONS ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const EMPTY_SESSION = {
  titre: '', entrepriseId: '', entrepriseNom: '', dateDebut: '', dateFin: '',
  nbParticipants: '', duree: '', module: '', statut: 'planifiee', prixHT: '',
};

function SessionModal({ item, entreprises, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(item ? { ...EMPTY_SESSION, ...item } : EMPTY_SESSION);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    try {
      const entreprise = entreprises.find(en => en.id === form.entrepriseId);
      const data = {
        titre: form.titre.trim(),
        entrepriseId: form.entrepriseId,
        entrepriseNom: entreprise?.nom || form.entrepriseNom || '',
        dateDebut: form.dateDebut,
        dateFin: form.dateFin,
        nbParticipants: Number(form.nbParticipants) || 0,
        duree: Number(form.duree) || 0,
        module: form.module.trim(),
        statut: form.statut,
        prixHT: Number(form.prixHT) || 0,
      };
      if (item) {
        await updateDoc(doc(db, 'sessions_fc', item.id), data);
        toast.success('Session modifiée');
      } else {
        await addDoc(collection(db, 'sessions_fc'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Session ajoutée');
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
    <Modal
      title={item ? 'Modifier la session' : 'Ajouter une session'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : item ? 'Modifier' : 'Ajouter'}
          </button>
        </>
      }
    >
      <Field label="Titre de la session" required>
        <input type="text" value={form.titre} onChange={e => set('titre', e.target.value)}
          required placeholder="Ex: Formation Excel avancé" className={INPUT_CLS} />
      </Field>
      <Field label="Entreprise">
        <select value={form.entrepriseId} onChange={e => set('entrepriseId', e.target.value)} className={SELECT_CLS}>
          <option value="">-- Sélectionner --</option>
          {entreprises.map(en => (
            <option key={en.id} value={en.id}>{en.nom}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date début">
          <input type="date" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label="Date fin">
          <input type="date" value={form.dateFin} onChange={e => set('dateFin', e.target.value)} className={INPUT_CLS} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nb participants">
          <input type="number" min="0" value={form.nbParticipants} onChange={e => set('nbParticipants', e.target.value)}
            placeholder="0" className={INPUT_CLS} />
        </Field>
        <Field label="Durée (heures)">
          <input type="number" min="0" value={form.duree} onChange={e => set('duree', e.target.value)}
            placeholder="0" className={INPUT_CLS} />
        </Field>
      </div>
      <Field label="Module / Thème">
        <input type="text" value={form.module} onChange={e => set('module', e.target.value)}
          placeholder="Ex: Gestion de projet" className={INPUT_CLS} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix HT (DH)">
          <input type="number" min="0" value={form.prixHT} onChange={e => set('prixHT', e.target.value)}
            placeholder="0" className={INPUT_CLS} />
        </Field>
        <Field label="Statut">
          <select value={form.statut} onChange={e => set('statut', e.target.value)} className={SELECT_CLS}>
            <option value="planifiee">Planifiée</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function SessionsTab({ sessions, entreprises, onRefresh }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.titre?.toLowerCase().includes(q) || s.entrepriseNom?.toLowerCase().includes(q);
    const matchStatut = !filterStatut || s.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const handleDelete = async (s) => {
    const ok = await confirm({
      title: 'Supprimer cette session ?',
      message: `"${s.titre}" sera définitivement supprimée.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'sessions_fc', s.id));
      toast.success('Session supprimée');
      onRefresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input type="text" placeholder="Rechercher par titre, entreprise…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
        <button onClick={() => setModal('add')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm shrink-0">
          <PlusIcon />
          Ajouter
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 font-medium">Aucune session trouvée</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filterStatut ? 'Modifiez vos filtres.' : 'Cliquez sur "Ajouter" pour créer une session.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Titre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Participants</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Durée</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Prix HT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{s.titre}</div>
                      {s.module && <div className="text-xs text-slate-400">{s.module}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.entrepriseNom || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600">{fmtDate(s.dateDebut)}</div>
                      <div className="text-xs text-slate-400">{fmtDate(s.dateFin)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.nbParticipants || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.duree ? `${s.duree}h` : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.prixHT ? fmt(s.prixHT) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge map={STATUT_SESSION} value={s.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(s)}
                          className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(s)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
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

      {modal && (
        <SessionModal
          item={modal === 'add' ? null : modal}
          entreprises={entreprises}
          onClose={() => setModal(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── DEVIS ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const TVA_RATE = 0.20;

const EMPTY_DEVIS = {
  numero: '', entrepriseId: '', entrepriseNom: '', date: '',
  objet: '', montantHT: '', statut: 'brouillon', notes: '',
};

function DevisModal({ item, entreprises, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(item ? { ...EMPTY_DEVIS, ...item } : EMPTY_DEVIS);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const montantHT = Number(form.montantHT) || 0;
  const tva = montantHT * TVA_RATE;
  const montantTTC = montantHT + tva;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numero.trim()) return;
    setSaving(true);
    try {
      const entreprise = entreprises.find(en => en.id === form.entrepriseId);
      const data = {
        numero: form.numero.trim(),
        entrepriseId: form.entrepriseId,
        entrepriseNom: entreprise?.nom || form.entrepriseNom || '',
        date: form.date,
        objet: form.objet.trim(),
        montantHT: montantHT,
        tva: tva,
        montantTTC: montantTTC,
        statut: form.statut,
        notes: form.notes.trim(),
      };
      if (item) {
        await updateDoc(doc(db, 'devis_fc', item.id), data);
        toast.success('Devis modifié');
      } else {
        await addDoc(collection(db, 'devis_fc'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Devis ajouté');
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
    <Modal
      title={item ? 'Modifier le devis' : 'Créer un devis'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : item ? 'Modifier' : 'Créer'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="N° devis" required>
          <input type="text" value={form.numero} onChange={e => set('numero', e.target.value)}
            required placeholder="DEV-2025-001" className={INPUT_CLS} />
        </Field>
        <Field label="Date">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
        </Field>
      </div>
      <Field label="Entreprise">
        <select value={form.entrepriseId} onChange={e => set('entrepriseId', e.target.value)} className={SELECT_CLS}>
          <option value="">-- Sélectionner --</option>
          {entreprises.map(en => (
            <option key={en.id} value={en.id}>{en.nom}</option>
          ))}
        </select>
      </Field>
      <Field label="Objet">
        <input type="text" value={form.objet} onChange={e => set('objet', e.target.value)}
          placeholder="Objet du devis" className={INPUT_CLS} />
      </Field>
      <Field label="Montant HT (DH)">
        <input type="number" min="0" value={form.montantHT} onChange={e => set('montantHT', e.target.value)}
          placeholder="0" className={INPUT_CLS} />
      </Field>
      {/* Computed totals */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Montant HT</span>
          <span className="font-medium text-slate-800">{fmt(montantHT)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">TVA (20%)</span>
          <span className="font-medium text-slate-800">{fmt(tva)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5">
          <span className="font-semibold text-slate-700">Montant TTC</span>
          <span className="font-bold text-[#005989]">{fmt(montantTTC)}</span>
        </div>
      </div>
      <Field label="Statut">
        <select value={form.statut} onChange={e => set('statut', e.target.value)} className={SELECT_CLS}>
          <option value="brouillon">Brouillon</option>
          <option value="envoye">Envoyé</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={3} placeholder="Notes internes…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
      </Field>
    </Modal>
  );
}

function DevisTab({ devis, entreprises, onRefresh }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = devis.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.numero?.toLowerCase().includes(q) || d.entrepriseNom?.toLowerCase().includes(q) || d.objet?.toLowerCase().includes(q);
    const matchStatut = !filterStatut || d.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const handleDelete = async (d) => {
    const ok = await confirm({
      title: 'Supprimer ce devis ?',
      message: `"${d.numero}" sera définitivement supprimé.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'devis_fc', d.id));
      toast.success('Devis supprimé');
      onRefresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input type="text" placeholder="Rechercher par N°, entreprise, objet…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="envoye">Envoyé</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
        </select>
        <button onClick={() => setModal('add')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm shrink-0">
          <PlusIcon />
          Ajouter
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 font-medium">Aucun devis trouvé</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filterStatut ? 'Modifiez vos filtres.' : 'Cliquez sur "Ajouter" pour créer un devis.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">N° Devis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Objet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant HT</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant TTC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-[#005989] text-xs">{d.numero}</td>
                    <td className="px-4 py-3 text-slate-600">{d.entrepriseNom || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{d.objet || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{fmt(d.montantHT)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{fmt(d.montantTTC)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge map={STATUT_DEVIS} value={d.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal(d)}
                          className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(d)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
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

      {modal && (
        <DevisModal
          item={modal === 'add' ? null : modal}
          entreprises={entreprises}
          onClose={() => setModal(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const TABS = ['Entreprises', 'Sessions', 'Devis'];

export default function FormationContinuePage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [entreprises, setEntreprises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eSnap, sSnap, dSnap] = await Promise.all([
        getDocs(query(collection(db, 'entreprises'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'sessions_fc'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'devis_fc'), orderBy('createdAt', 'desc'))),
      ]);
      setEntreprises(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSessions(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDevis(dSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // KPIs
  const nbEntreprises = entreprises.length;
  const sessionsEnCours = sessions.filter(s => s.statut === 'en_cours').length;
  const caPrevi = devis
    .filter(d => d.statut === 'accepte')
    .reduce((sum, d) => sum + (Number(d.montantTTC) || 0), 0);
  const devisEnAttente = devis.filter(d => d.statut === 'envoye').length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Formation Continue</h1>
        <p className="text-slate-500 text-sm mt-0.5">CRM formation entreprise — entreprises, sessions & devis</p>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-24 animate-pulse">
              <div className="h-2 bg-slate-100 rounded w-2/3 mb-3" />
              <div className="h-6 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total entreprises" value={nbEntreprises} color="border-[#005989]" />
          <KpiCard label="Sessions en cours" value={sessionsEnCours} color="border-blue-400" />
          <KpiCard
            label="CA prévisionnel"
            value={new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(caPrevi) + ' DH'}
            sub="Devis acceptés (TTC)"
            color="border-emerald-400"
          />
          <KpiCard label="Devis en attente" value={devisEnAttente} sub="Envoyés — en attente" color="border-amber-400" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
        {TABS.map((t, i) => (
          <TabBtn
            key={t}
            label={t}
            active={activeTab === i}
            onClick={() => setActiveTab(i)}
            count={i === 0 ? nbEntreprises : i === 1 ? sessions.length : devis.length}
          />
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm mt-3">Chargement…</p>
        </div>
      ) : (
        <>
          {activeTab === 0 && (
            <EntreprisesTab entreprises={entreprises} onRefresh={load} />
          )}
          {activeTab === 1 && (
            <SessionsTab sessions={sessions} entreprises={entreprises} onRefresh={load} />
          )}
          {activeTab === 2 && (
            <DevisTab devis={devis} entreprises={entreprises} onRefresh={load} />
          )}
        </>
      )}
    </div>
  );
}
