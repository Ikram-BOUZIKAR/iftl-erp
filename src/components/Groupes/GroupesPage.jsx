import { useState } from 'react';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { groupesService } from '../../services/firestore';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const FILIERE_CODES = ['OTM', 'OFLP', 'AEL', 'ECOM', 'ADEE', 'LIC'];
const FILIERE_LABELS = {
  OTM:  'Organisation du Transport de Marchandises',
  OFLP: 'Organisation et Gestion des Flux Logistiques et de Production',
  AEL:  "Agent d'Exploitation Logistique",
  ECOM: 'E-Commerce',
  ADEE: 'Agent Déclarant et Exportation',
  LIC:  'Licence Professionnelle CNAM',
};
const NIVEAUX = ['Technicien Spécialisé', 'Technicien', 'Qualification'];

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

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16 col-span-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">👥</span>
      </div>
      <p className="text-slate-700 font-semibold">Aucun groupe pour l'instant</p>
      <p className="text-slate-400 text-sm mt-1 mb-5">Créez votre premier groupe pour commencer à organiser vos apprenants.</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <PlusIcon />
        Créer un groupe
      </button>
    </div>
  );
}

export default function GroupesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: groupes, loading, refetch } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', filiereCode: '', niveau: '', intervenantId: '', annee: '2025-2026', actif: true });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm({ nom: '', filiereCode: '', niveau: '', intervenantId: '', annee: '2025-2026', actif: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (g) => {
    setForm({ nom: g.nom, filiereCode: g.filiereCode || '', niveau: g.niveau || '', intervenantId: g.intervenantId || '', annee: g.annee || '2025-2026', actif: g.actif !== false });
    setEditing(g);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, filiere: FILIERE_LABELS[form.filiereCode] || form.filiereCode };
      if (editing) {
        await groupesService.update(editing.id, data);
        toast.success('Groupe modifié avec succès');
      } else {
        await groupesService.create(data);
        toast.success('Groupe créé avec succès');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nom) => {
    const ok = await confirm({
      title: 'Supprimer ce groupe ?',
      message: `"${nom}" sera définitivement supprimé. Les apprenants associés ne seront pas supprimés.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await groupesService.delete(id);
      refetch();
      toast.success('Groupe supprimé');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : null;
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Groupes</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${groupes.length} groupe${groupes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <PlusIcon />
          Créer un groupe
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : groupes.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : groupes.map(g => {
          const intervenantName = getIntervenantName(g.intervenantId);
          return (
            <div key={g.id} className={`bg-white rounded-xl border shadow-sm p-5 transition-shadow hover:shadow-md ${g.actif ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-bold text-slate-800 text-base truncate">{g.nom}</p>
                  {(g.filiereCode || g.filiere) && <p className="text-sm text-slate-500 mt-0.5 truncate">{FILIERE_LABELS[g.filiereCode] || g.filiere}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${g.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {g.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {g.niveau && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {g.niveau}
                  </p>
                )}
                {g.annee && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    Année {g.annee}
                  </p>
                )}
                {intervenantName && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    {intervenantName}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEdit(g)}
                  className="flex-1 text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-center"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(g.id, g.nom)}
                  className="text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Suppr.
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">{editing ? 'Modifier le groupe' : 'Créer un groupe'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom du groupe *</label>
                <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex: DD-2025-G1, TS-INF-B…"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Filière</label>
                  <select value={form.filiereCode} onChange={e => setForm(f => ({ ...f, filiereCode: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sélectionner —</option>
                    {FILIERE_CODES.map(code => <option key={code} value={code}>{code} — {FILIERE_LABELS[code]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Niveau</label>
                  <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sélectionner —</option>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Intervenant responsable</label>
                  <select value={form.intervenantId} onChange={e => setForm(f => ({ ...f, intervenantId: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sélectionner —</option>
                    {intervenants.map(i => <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Année académique</label>
                  <input type="text" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="actif" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 accent-indigo-600" />
                <label htmlFor="actif" className="text-sm text-slate-700 font-medium">Groupe actif</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
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
