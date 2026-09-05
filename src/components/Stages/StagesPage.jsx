import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import { useGroupes, useIntervenants } from '../../hooks/useData';

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

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES_STAGE = [
  { value: 'stage_fin_annee', label: 'Stage fin d\'année' },
  { value: 'stage_initiation', label: 'Stage initiation' },
  { value: 'stage_alternance', label: 'Stage alternance' },
];

const STATUTS_STAGE = [
  { value: 'planifie', label: 'Planifié', color: 'bg-blue-100 text-blue-700' },
  { value: 'en_cours', label: 'En cours', color: 'bg-amber-100 text-amber-700' },
  { value: 'termine', label: 'Terminé', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'abandonne', label: 'Abandonné', color: 'bg-red-100 text-red-700' },
];

const TABS = [
  { value: 'planifie', label: 'Planifiés' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminés' },
  { value: 'abandonne', label: 'Abandonnés' },
];

const SECTEURS = [
  'Informatique', 'Logistique', 'Commerce', 'Finance', 'Industrie',
  'Santé', 'BTP', 'Transport', 'Hôtellerie', 'Autre',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR');
}

function getTypeLabel(v) {
  return TYPES_STAGE.find(t => t.value === v)?.label || v;
}

function getStatutStyle(v) {
  return STATUTS_STAGE.find(s => s.value === v) || { label: v, color: 'bg-slate-100 text-slate-600' };
}

function EvalBadge({ evaluation }) {
  if (evaluation === null || evaluation === undefined) return <span className="text-xs text-slate-400">—</span>;
  const n = Number(evaluation);
  const color = n >= 14 ? 'bg-emerald-100 text-emerald-700' : n >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{n}/20</span>;
}

function ConventionBadge({ signed }) {
  return signed ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <CheckCircleIcon /> Signée
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
      <XCircleIcon /> Manquante
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 border-l-4 ${color}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

// ─── Stage Form Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  studentNom: '',
  studentPrenom: '',
  studentId: '',
  groupeId: '',
  filiereCode: '',
  entreprise: '',
  secteur: '',
  adresseEntreprise: '',
  ville: '',
  telephone: '',
  tuteurEntreprise: '',
  emailTuteur: '',
  tuteurEcole: '',
  dateDebut: '',
  dateFin: '',
  dureeJours: '',
  type: 'stage_fin_annee',
  statut: 'planifie',
  evaluation: '',
  conventionSignee: false,
  observations: '',
};

function StageFormModal({ stage, groupes, intervenants, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(stage ? {
    ...EMPTY_FORM,
    ...stage,
    evaluation: stage.evaluation !== null && stage.evaluation !== undefined ? String(stage.evaluation) : '',
    conventionSignee: stage.conventionSignee || false,
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentNom.trim() || !form.entreprise.trim()) return;
    setSaving(true);
    try {
      const data = {
        studentId: form.studentId || null,
        studentNom: form.studentNom.trim().toUpperCase(),
        studentPrenom: form.studentPrenom.trim(),
        groupeId: form.groupeId || null,
        filiereCode: form.filiereCode || null,
        entreprise: form.entreprise.trim(),
        secteur: form.secteur,
        adresseEntreprise: form.adresseEntreprise.trim(),
        ville: form.ville.trim(),
        telephone: form.telephone.trim(),
        tuteurEntreprise: form.tuteurEntreprise.trim(),
        emailTuteur: form.emailTuteur.trim(),
        tuteurEcole: form.tuteurEcole.trim(),
        dateDebut: form.dateDebut,
        dateFin: form.dateFin,
        dureeJours: form.dureeJours ? Number(form.dureeJours) : null,
        type: form.type,
        statut: form.statut,
        evaluation: form.evaluation !== '' ? Number(form.evaluation) : null,
        conventionSignee: form.conventionSignee,
        observations: form.observations.trim(),
      };
      if (stage) {
        await updateDoc(doc(db, 'stages', stage.id), data);
        toast.success('Stage modifié');
      } else {
        await addDoc(collection(db, 'stages'), data);
        toast.success('Stage créé');
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
            {stage ? 'Modifier le stage' : 'Nouveau stage'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Apprenant */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Apprenant</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
                <input type="text" value={form.studentNom} onChange={e => set('studentNom', e.target.value)}
                  required placeholder="NOM"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
                <input type="text" value={form.studentPrenom} onChange={e => set('studentPrenom', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Groupe</label>
              <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                <option value="">— Sélectionner —</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
          </fieldset>

          {/* Entreprise */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Entreprise d'accueil</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Entreprise *</label>
                <input type="text" value={form.entreprise} onChange={e => set('entreprise', e.target.value)}
                  required placeholder="Nom de l'entreprise"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Secteur</label>
                <select value={form.secteur} onChange={e => set('secteur', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  <option value="">— Sélectionner —</option>
                  {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ville</label>
                <input type="text" value={form.ville} onChange={e => set('ville', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                <input type="text" value={form.telephone} onChange={e => set('telephone', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tuteur entreprise</label>
                <input type="text" value={form.tuteurEntreprise} onChange={e => set('tuteurEntreprise', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email tuteur</label>
                <input type="email" value={form.emailTuteur} onChange={e => set('emailTuteur', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
          </fieldset>

          {/* Dates & Type */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Stage</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type de stage</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  {TYPES_STAGE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Statut</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  {STATUTS_STAGE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date début</label>
                <input type="date" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date fin</label>
                <input type="date" value={form.dateFin} onChange={e => set('dateFin', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durée (jours)</label>
                <input type="number" min="1" value={form.dureeJours} onChange={e => set('dureeJours', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tuteur école (intervenant)</label>
                <select value={form.tuteurEcole} onChange={e => set('tuteurEcole', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  <option value="">— Sélectionner —</option>
                  {intervenants.map(i => <option key={i.id} value={`${i.prenom} ${i.nom}`}>{i.prenom} {i.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note d'évaluation (/20)</label>
                <input type="number" min="0" max="20" step="0.5" value={form.evaluation}
                  onChange={e => set('evaluation', e.target.value)}
                  placeholder="—"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="convention" checked={form.conventionSignee}
                onChange={e => set('conventionSignee', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#005989]" />
              <label htmlFor="convention" className="text-sm text-slate-700 font-medium">Convention signée</label>
            </div>
          </fieldset>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observations</label>
            <textarea value={form.observations} onChange={e => set('observations', e.target.value)}
              rows={3} placeholder="Remarques, commentaires…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
          </div>
        </form>

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : stage ? 'Modifier' : 'Créer le stage'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Marquer Terminé Modal ────────────────────────────────────────────────────

function ModalTerminer({ stage, onClose, onSaved }) {
  const toast = useToast();
  const [evaluation, setEvaluation] = useState(stage.evaluation !== null ? String(stage.evaluation ?? '') : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'stages', stage.id), {
        statut: 'termine',
        evaluation: evaluation !== '' ? Number(evaluation) : null,
        dateFin: stage.dateFin || new Date().toISOString().split('T')[0],
      });
      toast.success('Stage marqué comme terminé');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Marquer le stage comme terminé</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {stage.studentNom} {stage.studentPrenom} · {stage.entreprise}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Note d'évaluation (/20) — optionnel</label>
            <input
              type="number" min="0" max="20" step="0.5"
              value={evaluation}
              onChange={e => setEvaluation(e.target.value)}
              placeholder="Laisser vide si non encore notée"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Confirmer la fin du stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function StagesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('en_cours');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [terminating, setTerminating] = useState(null);

  const loadStages = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'stages'), orderBy('dateDebut', 'desc'));
      const snap = await getDocs(q);
      setStages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStages(); }, [loadStages]);

  const handleDelete = async (stage) => {
    const ok = await confirm({
      title: 'Supprimer ce stage ?',
      message: `Le stage de ${stage.studentNom} ${stage.studentPrenom} chez ${stage.entreprise} sera définitivement supprimé.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'stages', stage.id));
      toast.success('Stage supprimé');
      loadStages();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const byStatut = (statut) => stages.filter(s => s.statut === statut);
  const enCours = byStatut('en_cours');
  const planifies = byStatut('planifie');
  const termines = byStatut('termine');
  const abandones = byStatut('abandonne');

  const countByTab = {
    planifie: planifies.length,
    en_cours: enCours.length,
    termine: termines.length,
    abandonne: abandones.length,
  };

  const filtered = byStatut(activeTab);

  const getGroupeNom = (id) => groupes.find(g => g.id === id)?.nom || '—';

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stages</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${stages.length} stage${stages.length !== 1 ? 's' : ''} au total`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Nouveau stage
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="En cours" value={enCours.length} color="border-amber-400" />
        <StatCard label="À venir" value={planifies.length} color="border-[#005989]" />
        <StatCard label="Terminés" value={termines.length} color="border-emerald-500" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.value
                  ? 'text-[#005989] border-b-2 border-[#005989] bg-blue-50/30'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.value ? 'bg-[#005989] text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {countByTab[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 font-medium">Aucun stage {TABS.find(t => t.value === activeTab)?.label.toLowerCase()}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Entreprise</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Ville</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Dates</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Tuteur école</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Convention</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Éval.</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{s.studentNom} {s.studentPrenom}</p>
                      <p className="text-xs text-slate-400">{getGroupeNom(s.groupeId)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{s.entreprise}</p>
                      {s.secteur && <p className="text-xs text-slate-400">{s.secteur}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{s.ville || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-600">{getTypeLabel(s.type)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <p>{formatDate(s.dateDebut)}</p>
                      <p>{formatDate(s.dateFin)}</p>
                      {s.dureeJours && <p className="text-slate-400">{s.dureeJours}j</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">{s.tuteurEcole || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <ConventionBadge signed={s.conventionSignee} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EvalBadge evaluation={s.evaluation} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(activeTab === 'planifie' || activeTab === 'en_cours') && (
                          <button
                            onClick={() => setTerminating(s)}
                            className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap"
                          >
                            Terminer
                          </button>
                        )}
                        <button
                          onClick={() => { setEditing(s); setShowForm(true); }}
                          className="text-xs font-medium px-2 py-1 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="text-xs font-medium px-2 py-1 text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Suppr.
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

      {/* Modals */}
      {showForm && (
        <StageFormModal
          stage={editing}
          groupes={groupes}
          intervenants={intervenants}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={loadStages}
        />
      )}
      {terminating && (
        <ModalTerminer
          stage={terminating}
          onClose={() => setTerminating(null)}
          onSaved={loadStages}
        />
      )}
    </div>
  );
}
