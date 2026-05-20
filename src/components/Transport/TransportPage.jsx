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

function TruckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.184.6M13 16H9m0 0l.016-.016m3.984.016H15m-2 0H9M3 6l.5 2h10.5l1.5-2M3 6h14m-4 0V4m0 0H9m4 0H9m0 0v2M15 8h2l2 5v3h-2m-2-8v8m-8 0V8" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.962-.834-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES_VEHICULE = [
  'Camion PL', 'Camion SPL', 'Véhicule léger', 'Bus', 'Remorque', 'Engin',
];

const STATUTS_VEHICULE = {
  disponible:      { label: 'Disponible',      cls: 'bg-emerald-100 text-emerald-700' },
  en_service:      { label: 'En service',      cls: 'bg-blue-100 text-blue-700' },
  en_maintenance:  { label: 'En maintenance',  cls: 'bg-amber-100 text-amber-700' },
  hors_service:    { label: 'Hors service',    cls: 'bg-red-100 text-red-700' },
};

const TYPES_ABONNEMENT = ['mensuel', 'trimestriel', 'semestriel', 'annuel'];

const MODES_PAIEMENT = [
  { value: 'especes',  label: 'Espèces' },
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque',   label: 'Chèque' },
  { value: 'cmi',      label: 'CMI / TPE' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR');
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isRevisionSoon(dateStr) {
  const d = daysUntil(dateStr);
  return d !== null && d <= 30;
}

function formatCurrency(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(n) + ' DH';
}

function computeStatut(paiements, montantDu) {
  const totalPaye = (paiements || []).reduce((s, p) => s + (Number(p.montant) || 0), 0);
  if (totalPaye <= 0) return { statut: 'impaye', montantPaye: 0 };
  if (totalPaye >= montantDu) return { statut: 'paye', montantPaye: totalPaye };
  return { statut: 'partiel', montantPaye: totalPaye };
}

function exportCSV(rows) {
  const headers = ['Nom', 'Prénom', 'Groupe', 'Téléphone', 'Type', 'Début', 'Fin', 'Montant dû', 'Montant payé', 'Solde', 'Statut'];
  const lines = [headers, ...rows.map(a => [
    a.studentNom, a.studentPrenom, a.groupe, a.telephone || '',
    a.typeAbonnement, a.dateDebut || '', a.dateFin || '',
    a.montantDu, a.montantPaye || 0, (a.montantDu - (a.montantPaye || 0)),
    a.statut
  ])];
  const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'abonnes_transport.csv'; link.click();
  URL.revokeObjectURL(url);
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

// ─── Statut Badge (vehicles) ──────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const s = STATUTS_VEHICULE[statut] || { label: statut, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

// ─── Statut Badge (abonnements) ───────────────────────────────────────────────

function AbonnementStatutBadge({ statut }) {
  const styles = {
    impaye:  'bg-red-100 text-red-700',
    partiel: 'bg-amber-100 text-amber-700',
    paye:    'bg-emerald-100 text-emerald-700',
  };
  const labels = {
    impaye:  'Impayé',
    partiel: 'Partiel',
    paye:    'Payé',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[statut] || 'bg-slate-100 text-slate-600'}`}>
      {labels[statut] || statut}
    </span>
  );
}

// ─── Vehicule Form Modal ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  immatriculation: '', marque: '', modele: '',
  type: 'Camion PL', annee: '', statut: 'disponible',
  kilometrage: '', prochaineRevision: '', assuranceExpiry: '',
  vignette: '', chauffeurNom: '', observations: '',
};

function VehiculeModal({ vehicule, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(
    vehicule
      ? {
          ...EMPTY_FORM, ...vehicule,
          kilometrage: vehicule.kilometrage != null ? String(vehicule.kilometrage) : '',
          annee: vehicule.annee != null ? String(vehicule.annee) : '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.immatriculation.trim() || !form.marque.trim()) return;
    setSaving(true);
    try {
      const data = {
        immatriculation: form.immatriculation.trim().toUpperCase(),
        marque: form.marque.trim(),
        modele: form.modele.trim(),
        type: form.type,
        annee: form.annee ? Number(form.annee) : null,
        statut: form.statut,
        kilometrage: form.kilometrage !== '' ? Number(form.kilometrage) : null,
        prochaineRevision: form.prochaineRevision || null,
        assuranceExpiry: form.assuranceExpiry || null,
        vignette: form.vignette.trim(),
        chauffeurNom: form.chauffeurNom.trim(),
        observations: form.observations.trim(),
      };
      if (vehicule) {
        await updateDoc(doc(db, 'vehicules', vehicule.id), data);
        toast.success('Véhicule modifié');
      } else {
        await addDoc(collection(db, 'vehicules'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Véhicule ajouté');
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
            {vehicule ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Identification */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Identification</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Immatriculation *</label>
                <input type="text" value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)}
                  required placeholder="12345-A-1"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] font-mono uppercase" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  {TYPES_VEHICULE.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marque *</label>
                <input type="text" value={form.marque} onChange={e => set('marque', e.target.value)}
                  required placeholder="Renault"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modèle</label>
                <input type="text" value={form.modele} onChange={e => set('modele', e.target.value)}
                  placeholder="T480"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Année</label>
                <input type="number" min="1980" max="2030" value={form.annee} onChange={e => set('annee', e.target.value)}
                  placeholder="2023"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
          </fieldset>

          {/* État & Suivi */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">État &amp; Suivi</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Statut</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
                  {Object.entries(STATUTS_VEHICULE).map(([v, s]) => (
                    <option key={v} value={v}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kilométrage</label>
                <input type="number" min="0" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prochaine révision</label>
                <input type="date" value={form.prochaineRevision} onChange={e => set('prochaineRevision', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration assurance</label>
                <input type="date" value={form.assuranceExpiry} onChange={e => set('assuranceExpiry', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vignette</label>
                <input type="text" value={form.vignette} onChange={e => set('vignette', e.target.value)}
                  placeholder="2025"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chauffeur affecté</label>
                <input type="text" value={form.chauffeurNom} onChange={e => set('chauffeurNom', e.target.value)}
                  placeholder="Nom du chauffeur"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
          </fieldset>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observations</label>
            <textarea value={form.observations} onChange={e => set('observations', e.target.value)}
              rows={3} placeholder="Remarques, historique…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
          </div>
        </form>

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : vehicule ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Abonnement ─────────────────────────────────────────────────────────

const EMPTY_ABONNEMENT_FORM = {
  studentNom: '',
  studentPrenom: '',
  groupe: '',
  telephone: '',
  typeAbonnement: 'mensuel',
  montantDu: '',
  dateDebut: '',
  dateFin: '',
};

function ModalAbonnement({ abonnement, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(
    abonnement
      ? {
          studentNom: abonnement.studentNom || '',
          studentPrenom: abonnement.studentPrenom || '',
          groupe: abonnement.groupe || '',
          telephone: abonnement.telephone || '',
          typeAbonnement: abonnement.typeAbonnement || 'mensuel',
          montantDu: abonnement.montantDu != null ? String(abonnement.montantDu) : '',
          dateDebut: abonnement.dateDebut || '',
          dateFin: abonnement.dateFin || '',
        }
      : EMPTY_ABONNEMENT_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentNom.trim() || !form.montantDu) return;
    setSaving(true);
    try {
      const paiements = abonnement ? (abonnement.paiements || []) : [];
      const montantDu = Number(form.montantDu);
      const { statut, montantPaye } = computeStatut(paiements, montantDu);
      const data = {
        studentNom: form.studentNom.trim().toUpperCase(),
        studentPrenom: form.studentPrenom.trim(),
        groupe: form.groupe.trim(),
        telephone: form.telephone.trim(),
        typeAbonnement: form.typeAbonnement,
        montantDu,
        montantPaye,
        paiements,
        statut,
        dateDebut: form.dateDebut || null,
        dateFin: form.dateFin || null,
      };
      if (abonnement) {
        await updateDoc(doc(db, 'transport_abonnements', abonnement.id), data);
        toast.success('Abonnement modifié');
      } else {
        await addDoc(collection(db, 'transport_abonnements'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
        toast.success('Abonné ajouté');
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
            {abonnement ? 'Modifier l\'abonnement' : 'Ajouter un abonné'}
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
                <input
                  type="text"
                  value={form.studentNom}
                  onChange={e => set('studentNom', e.target.value)}
                  required
                  placeholder="NOM"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={form.studentPrenom}
                  onChange={e => set('studentPrenom', e.target.value)}
                  placeholder="Prénom"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Groupe / Filière</label>
                <input
                  type="text"
                  value={form.groupe}
                  onChange={e => set('groupe', e.target.value)}
                  placeholder="Ex: TM-101"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={form.telephone}
                  onChange={e => set('telephone', e.target.value)}
                  placeholder="06XXXXXXXX"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>
            </div>
          </fieldset>

          {/* Abonnement */}
          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="text-xs font-semibold text-slate-500 px-1">Abonnement</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'abonnement</label>
                <select
                  value={form.typeAbonnement}
                  onChange={e => set('typeAbonnement', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white capitalize"
                >
                  {TYPES_ABONNEMENT.map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant dû (DH) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.montantDu}
                  onChange={e => set('montantDu', e.target.value)}
                  required
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={form.dateDebut}
                  onChange={e => set('dateDebut', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={form.dateFin}
                  onChange={e => set('dateFin', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>
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
            {saving ? 'Enregistrement…' : abonnement ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Paiement Transport ─────────────────────────────────────────────────

function ModalPaiementTransport({ abonnement, onClose, onSaved }) {
  const toast = useToast();
  const solde = abonnement.montantDu - (abonnement.montantPaye || 0);
  const [form, setForm] = useState({
    montant: String(solde > 0 ? solde : ''),
    mode: 'especes',
    reference: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant || Number(form.montant) <= 0) return;
    setSaving(true);
    try {
      const paiement = {
        montant: Number(form.montant),
        date: new Date().toISOString().split('T')[0],
        mode: form.mode,
        reference: form.reference.trim(),
      };
      const newPaiements = [...(abonnement.paiements || []), paiement];
      const { statut, montantPaye } = computeStatut(newPaiements, abonnement.montantDu);
      await updateDoc(doc(db, 'transport_abonnements', abonnement.id), {
        paiements: newPaiements,
        montantPaye,
        statut,
      });
      toast.success('Paiement enregistré');
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
          <div>
            <h2 className="text-base font-bold text-slate-800">Enregistrer un paiement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {abonnement.studentNom} {abonnement.studentPrenom}
              {abonnement.groupe ? ` · ${abonnement.groupe}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-slate-400">Total dû</p>
            <p className="font-semibold text-slate-800">{formatCurrency(abonnement.montantDu)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Déjà payé</p>
            <p className="font-semibold text-emerald-700">{formatCurrency(abonnement.montantPaye || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Solde</p>
            <p className="font-semibold text-red-600">{formatCurrency(solde)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant (DH) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.montant}
                onChange={e => set('montant', e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de paiement</label>
              <select
                value={form.mode}
                onChange={e => set('mode', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
              >
                {MODES_PAIEMENT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Référence / N° reçu</label>
            <input
              type="text"
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              placeholder="Optionnel"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Valider le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Flotte Véhicules ────────────────────────────────────────────────────

function FlotteVehiculesTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const loadVehicules = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'vehicules'), orderBy('immatriculation', 'asc'));
      const snap = await getDocs(q);
      setVehicules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVehicules(); }, [loadVehicules]);

  const handleDelete = async (v) => {
    const ok = await confirm({
      title: 'Supprimer ce véhicule ?',
      message: `Le véhicule ${v.immatriculation} – ${v.marque} ${v.modele} sera définitivement supprimé.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'vehicules', v.id));
      toast.success('Véhicule supprimé');
      loadVehicules();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = vehicules.filter(v => {
    const q = search.toLowerCase();
    const matchSearch  = !q
      || v.immatriculation?.toLowerCase().includes(q)
      || v.marque?.toLowerCase().includes(q)
      || v.modele?.toLowerCase().includes(q);
    const matchType   = !filterType   || v.type   === filterType;
    const matchStatut = !filterStatut || v.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  // KPIs
  const total         = vehicules.length;
  const disponibles   = vehicules.filter(v => v.statut === 'disponible').length;
  const enService     = vehicules.filter(v => v.statut === 'en_service').length;
  const enMaintenance = vehicules.filter(v => v.statut === 'en_maintenance').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">
            {loading ? 'Chargement…' : `${vehicules.length} véhicule${vehicules.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Ajouter véhicule
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total véhicules"  value={total}         color="border-[#005989]" />
        <KpiCard label="Disponibles"      value={disponibles}   color="border-emerald-500" />
        <KpiCard label="En service"       value={enService}     color="border-blue-400" />
        <KpiCard label="En maintenance"   value={enMaintenance} color="border-amber-400" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Rechercher immatriculation, marque…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Tous les types</option>
            {TYPES_VEHICULE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS_VEHICULE).map(([v, s]) => (
              <option key={v} value={v}>{s.label}</option>
            ))}
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
              <TruckIcon />
            </div>
            <p className="text-slate-500 font-medium">Aucun véhicule trouvé</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filterType || filterStatut
                ? 'Modifiez vos filtres.'
                : 'Cliquez sur "Ajouter véhicule" pour enregistrer le premier véhicule.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Immatriculation</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Marque / Modèle</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Km</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Prochaine révision</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden xl:table-cell">Chauffeur</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(v => {
                  const revisionSoon = isRevisionSoon(v.prochaineRevision);
                  const days = daysUntil(v.prochaineRevision);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-slate-800">{v.immatriculation}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{v.marque} {v.modele}</p>
                        {v.annee && <p className="text-xs text-slate-400">{v.annee}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatutBadge statut={v.statut} /></td>
                      <td className="px-4 py-3 text-right text-slate-700 font-mono text-xs hidden lg:table-cell">
                        {v.kilometrage != null ? new Intl.NumberFormat('fr-FR').format(v.kilometrage) + ' km' : '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">{formatDate(v.prochaineRevision)}</span>
                          {revisionSoon && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              <WarningIcon />
                              {days !== null && days >= 0 ? `J-${days}` : 'Dépassée'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden xl:table-cell">
                        {v.chauffeurNom || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setEditing(v); setShowForm(true); }}
                            className="p-1.5 text-slate-500 hover:text-[#005989] hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-colors"
                            title="Modifier"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(v)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <VehiculeModal
          vehicule={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={loadVehicules}
        />
      )}
    </div>
  );
}

// ─── Tab: Abonnements Apprenants ──────────────────────────────────────────────

function AbonnementsApprenantsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [abonnements, setAbonnements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalAbonnement, setShowModalAbonnement] = useState(false);
  const [editingAbonnement, setEditingAbonnement] = useState(null);
  const [selectedForPaiement, setSelectedForPaiement] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const loadAbonnements = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'transport_abonnements'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAbonnements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAbonnements(); }, [loadAbonnements]);

  const handleDeleteAbonnement = async (a) => {
    const ok = await confirm({
      title: 'Supprimer cet abonnement ?',
      message: `L'abonnement de ${a.studentNom} ${a.studentPrenom} sera définitivement supprimé.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'transport_abonnements', a.id));
      toast.success('Abonnement supprimé');
      loadAbonnements();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = abonnements.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || a.studentNom?.toLowerCase().includes(q)
      || a.studentPrenom?.toLowerCase().includes(q)
      || a.groupe?.toLowerCase().includes(q);
    const matchType   = !filterType   || a.typeAbonnement === filterType;
    const matchStatut = !filterStatut || a.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  // KPIs
  const totalAbonn   = abonnements.length;
  const payesTotal   = abonnements.filter(a => a.statut === 'paye').length;
  const impayes      = abonnements.filter(a => a.statut === 'impaye' || a.statut === 'partiel').length;
  const montantCollecte = abonnements.reduce((s, a) => s + (a.montantPaye || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          {loading ? 'Chargement…' : `${abonnements.length} abonné${abonnements.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filtered)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
            title="Exporter CSV"
          >
            <DownloadIcon />
            Export CSV
          </button>
          <button
            onClick={() => { setEditingAbonnement(null); setShowModalAbonnement(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
          >
            <PlusIcon />
            Ajouter abonné
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total abonnés"          value={totalAbonn}                                         color="border-[#005989]" />
        <KpiCard label="Payés intégralement"    value={payesTotal}                                         color="border-emerald-500" />
        <KpiCard label="Impayés / Partiels"     value={impayes}                                            color="border-red-400" />
        <KpiCard label="Montant collecté (DH)"  value={new Intl.NumberFormat('fr-MA').format(montantCollecte)} color="border-amber-400" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Rechercher nom, prénom, groupe…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Tous les types</option>
            {TYPES_ABONNEMENT.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="impaye">Impayé</option>
            <option value="partiel">Partiel</option>
            <option value="paye">Payé</option>
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
            <p className="text-slate-500 font-medium">Aucun abonné trouvé</p>
            <p className="text-slate-400 text-sm mt-1">
              {search || filterType || filterStatut
                ? 'Modifiez vos filtres.'
                : 'Cliquez sur "Ajouter abonné" pour enregistrer le premier abonnement.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Groupe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Début – Fin</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Montant dû</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Payé</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Solde</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(a => {
                  const montantPaye = a.montantPaye || 0;
                  const solde = a.montantDu - montantPaye;
                  const pct = a.montantDu > 0 ? Math.min(100, Math.round((montantPaye / a.montantDu) * 100)) : 0;
                  const isPaye = a.statut === 'paye';
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{a.studentNom} {a.studentPrenom}</p>
                        {a.telephone && <p className="text-xs text-slate-400">{a.telephone}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {a.groupe || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
                          {a.typeAbonnement}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-slate-500">{formatDate(a.dateDebut)} – {formatDate(a.dateFin)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-mono text-sm font-semibold text-slate-800">{formatCurrency(a.montantDu)}</p>
                        <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-1 bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-mono text-sm text-emerald-700">{formatCurrency(montantPaye)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className={`font-mono text-sm ${solde > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                          {formatCurrency(solde)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AbonnementStatutBadge statut={a.statut} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaye && (
                            <button
                              onClick={() => setSelectedForPaiement(a)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#005989] bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors"
                              title="Enregistrer un paiement"
                            >
                              <CashIcon />
                              Paiement
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingAbonnement(a); setShowModalAbonnement(true); }}
                            className="p-1.5 text-slate-500 hover:text-[#005989] hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-colors"
                            title="Modifier"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDeleteAbonnement(a)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModalAbonnement && (
        <ModalAbonnement
          abonnement={editingAbonnement}
          onClose={() => { setShowModalAbonnement(false); setEditingAbonnement(null); }}
          onSaved={loadAbonnements}
        />
      )}
      {selectedForPaiement && (
        <ModalPaiementTransport
          abonnement={selectedForPaiement}
          onClose={() => setSelectedForPaiement(null)}
          onSaved={loadAbonnements}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState('flotte');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Transport &amp; Flotte</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab('flotte')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'flotte'
              ? 'bg-white border-[#005989] text-[#005989] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Flotte véhicules
        </button>
        <button
          onClick={() => setActiveTab('abonnements')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'abonnements'
              ? 'bg-white border-[#005989] text-[#005989] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Abonnements apprenants
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'flotte' && <FlotteVehiculesTab />}
      {activeTab === 'abonnements' && <AbonnementsApprenantsTab />}
    </div>
  );
}
