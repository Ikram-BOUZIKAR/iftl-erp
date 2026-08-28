import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useIntervenants } from '../../hooks/useData';
import { intervenantsService } from '../../services/firestore';
import { useToast } from '../UI/Toast';
import { useAuth } from '../../hooks/useAuth';
import { createCompteERP } from '../../services/accountService';

const MODULES_SUGGESTIONS = [
  'Logistique', 'Transport & Douane', 'Commerce International', 'Gestion des Achats',
  'Marketing', 'Communication Professionnelle', 'Anglais des Affaires',
  'Comptabilité Analytique', 'Finance d\'Entreprise', 'Droit Commercial',
  'Management de la Qualité', 'Informatique de Gestion', 'Statistiques', 'Autre',
];

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const ANNEES = [2024, 2025, 2026];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcHeures(debut, fin) {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}

function formatHeures(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}

function exportBilanCSV(rows, periode) {
  const headers = ['Intervenant', 'Spécialité', 'Nb séances', 'Heures décimales', 'Taux DH/h', 'Montant dû DH'];
  const lines = [headers, ...rows.map(r => [
    `${r.prenom} ${r.nom}`, r.specialite || '', r.nbSeances,
    r.totalHeures.toFixed(2), r.tauxHoraire || 0, r.montantDu.toFixed(2),
  ])];
  const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bilan_intervenants_${periode}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

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

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ─── Intervenant Form Modal ────────────────────────────────────────────────────

function IntervenantModal({ editing, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    nom: editing?.nom || '',
    prenom: editing?.prenom || '',
    email: editing?.email || '',
    telephone: editing?.telephone || '',
    modules: editing?.modules || editing?.specialite || '',
    niveaux: editing?.niveaux || '',
    tauxHoraire: editing?.tauxHoraire != null ? String(editing.tauxHoraire) : '',
    actif: editing ? editing.actif !== false : true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) return;
    setSaving(true);
    try {
      const data = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        modules: form.modules.trim(),
        niveaux: form.niveaux.trim(),
        actif: form.actif,
        tauxHoraire: form.tauxHoraire !== '' ? Number(form.tauxHoraire) : null,
      };
      if (editing) {
        await intervenantsService.update(editing.id, data);
        toast.success('Intervenant modifié avec succès');
      } else {
        await intervenantsService.create(data);
        toast.success('Intervenant ajouté avec succès');
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">
            {editing ? "Modifier l'intervenant" : 'Ajouter un intervenant'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom *</label>
              <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prénom *</label>
              <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone</label>
            <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Module(s) enseigné(s)</label>
            <input
              type="text"
              value={form.modules}
              onChange={e => setForm(f => ({ ...f, modules: e.target.value }))}
              placeholder="Ex: Logistique, Transport & Douane, Marketing…"
              list="modules-suggestions"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <datalist id="modules-suggestions">
              {MODULES_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
            <p className="text-xs text-slate-400 mt-1">Séparez plusieurs modules par une virgule</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Niveau(x) / Groupes</label>
            <input
              type="text"
              value={form.niveaux}
              onChange={e => setForm(f => ({ ...f, niveaux: e.target.value }))}
              placeholder="Ex: 1A TS, 2A TS, Licence…"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Taux horaire (DH/h)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tauxHoraire}
              onChange={e => setForm(f => ({ ...f, tauxHoraire: e.target.value }))}
              placeholder="Optionnel"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="actifI" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 accent-indigo-600" />
            <label htmlFor="actifI" className="text-sm text-slate-700 font-medium">Intervenant actif</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Taux Horaire ────────────────────────────────────────────────────────

function ModalTaux({ intervenant, onClose, onSaved }) {
  const toast = useToast();
  const [taux, setTaux] = useState(intervenant.tauxHoraire != null ? String(intervenant.tauxHoraire) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'intervenants', intervenant.id), {
        tauxHoraire: taux !== '' ? Number(taux) : null,
      });
      toast.success('Taux horaire mis à jour');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800">Taux horaire</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-3">
              <span className="font-semibold text-slate-700">{intervenant.prenom} {intervenant.nom}</span>
            </p>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Taux horaire (DH/h)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={taux}
              onChange={e => setTaux(e.target.value)}
              autoFocus
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] focus:border-[#005989]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-lg transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">👤</span>
      </div>
      <p className="text-slate-700 font-semibold">Aucun intervenant pour l'instant</p>
      <p className="text-slate-400 text-sm mt-1 mb-5">
        Ajoutez votre premier intervenant pour commencer à planifier des séances.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <PlusIcon />
        Ajouter un intervenant
      </button>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 border-l-4 border-l-[#005989]">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Tab: Intervenants (Liste) ─────────────────────────────────────────────────

function ListeTab({ intervenants, loading, refetch }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [compteStatus, setCompteStatus] = useState({});
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (i) => { setEditing(i); setShowForm(true); };

  const handleCreateCompte = async (intervenant) => {
    if (!intervenant.email) {
      showError('Cet intervenant n\'a pas d\'adresse email.');
      return;
    }
    setCompteStatus(s => ({ ...s, [intervenant.id]: 'loading' }));
    try {
      const result = await createCompteERP(
        { email: intervenant.email, role: 'intervenant', nom: intervenant.nom, prenom: intervenant.prenom, linkedField: 'intervenantId', linkedId: intervenant.id },
        userProfile?.role
      );
      if (result.alreadyExists) {
        setCompteStatus(s => ({ ...s, [intervenant.id]: 'exists' }));
        showSuccess(`Un compte existe déjà pour ${intervenant.email}`);
      } else {
        setCompteStatus(s => ({ ...s, [intervenant.id]: 'done' }));
        showSuccess(`Compte créé — email de configuration envoyé à ${intervenant.email}`);
        await updateDoc(doc(db, 'intervenants', intervenant.id), { firebaseUid: result.uid });
        refetch();
      }
    } catch (err) {
      setCompteStatus(s => ({ ...s, [intervenant.id]: 'error' }));
      showError('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          {loading ? 'Chargement…' : `${intervenants.length} intervenant${intervenants.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <PlusIcon />
          Ajouter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : intervenants.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Intervenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Spécialité</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Taux/h</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {intervenants.map(i => (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                        {i.prenom?.[0]}{i.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{i.prenom} {i.nom}</p>
                        <p className="text-xs text-slate-400">{i.telephone || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{i.email || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {(i.modules || i.specialite) ? (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{i.modules || i.specialite}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${i.actif !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {i.actif !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">
                    {i.tauxHoraire != null ? `${i.tauxHoraire} DH/h` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {i.firebaseUid ? (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Compte actif</span>
                      ) : ['admin', 'direction', 'scolarite'].includes(userProfile?.role) ? (
                        compteStatus[i.id] === 'loading' ? (
                          <span className="text-xs text-slate-400">Création…</span>
                        ) : compteStatus[i.id] === 'done' || compteStatus[i.id] === 'exists' ? (
                          <span className="text-xs font-medium text-emerald-600">✓ Compte créé</span>
                        ) : (
                          <button
                            onClick={() => handleCreateCompte(i)}
                            className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
                          >
                            Créer compte
                          </button>
                        )
                      ) : null}
                      <button
                        onClick={() => openEdit(i)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
                      >
                        Modifier
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <IntervenantModal
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

// ─── Tab: Bilan Heures ────────────────────────────────────────────────────────

function BilanTab({ intervenants, refetchIntervenants }) {
  const toast = useToast();
  const now = new Date();
  const [filterMois, setFilterMois] = useState(String(now.getMonth() + 1));
  const [filterAnnee, setFilterAnnee] = useState(String(now.getFullYear()));
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [modalTaux, setModalTaux] = useState(null);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement sessions : ' + err.message);
    } finally {
      setLoadingSessions(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Filter sessions by period
  const filteredSessions = sessions.filter(s => {
    if (!s.date) return false;
    const d = new Date(s.date);
    if (isNaN(d)) return false;
    const moisMatch = filterMois === 'tous' || (d.getMonth() + 1) === Number(filterMois);
    const anneeMatch = filterAnnee === 'toutes' || d.getFullYear() === Number(filterAnnee);
    return moisMatch && anneeMatch;
  });

  // Group filtered sessions by intervenantId
  const sessionsByIntervenant = {};
  for (const s of filteredSessions) {
    if (!s.intervenantId) continue;
    if (!sessionsByIntervenant[s.intervenantId]) sessionsByIntervenant[s.intervenantId] = [];
    sessionsByIntervenant[s.intervenantId].push(s);
  }

  // Build bilan rows for all intervenants
  const rows = intervenants.map(inv => {
    const ivSessions = sessionsByIntervenant[inv.id] || [];
    const nbSeances = ivSessions.length;
    const totalHeures = ivSessions.reduce((acc, s) => acc + calcHeures(s.heureDebut, s.heureFin), 0);
    const tauxHoraire = inv.tauxHoraire != null ? Number(inv.tauxHoraire) : null;
    const montantDu = tauxHoraire != null ? totalHeures * tauxHoraire : 0;
    return { ...inv, nbSeances, totalHeures, tauxHoraire, montantDu };
  }).sort((a, b) => b.totalHeures - a.totalHeures);

  // KPI totals
  const totalSeances = filteredSessions.length;
  const totalHeuresGlobal = rows.reduce((acc, r) => acc + r.totalHeures, 0);
  const totalMasseSalariale = rows.reduce((acc, r) => acc + r.montantDu, 0);

  const periodeLabel = (() => {
    const m = filterMois === 'tous' ? 'tous_mois' : String(filterMois).padStart(2, '0');
    const a = filterAnnee === 'toutes' ? 'toutes_annees' : filterAnnee;
    return `${m}_${a}`;
  })();

  const periodeDisplay = (() => {
    const m = filterMois === 'tous' ? 'Tous les mois' : MOIS_LABELS[Number(filterMois) - 1];
    const a = filterAnnee === 'toutes' ? 'toutes années' : filterAnnee;
    return `${m} ${a}`;
  })();

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Mois</label>
          <select
            value={filterMois}
            onChange={e => setFilterMois(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="tous">Tous</option>
            {MOIS_LABELS.map((m, i) => (
              <option key={i + 1} value={String(i + 1)}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Année</label>
          <select
            value={filterAnnee}
            onChange={e => setFilterAnnee(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="toutes">Toutes</option>
            {ANNEES.map(a => (
              <option key={a} value={String(a)}>{a}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadSessions}
          disabled={loadingSessions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshIcon />
          Actualiser
        </button>
        <button
          onClick={() => exportBilanCSV(rows, periodeLabel)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[#005989] text-[#005989] hover:bg-[#005989]/5 rounded-lg transition-colors ml-auto"
        >
          <DownloadIcon />
          Exporter CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total séances"
          value={loadingSessions ? '…' : totalSeances}
          sub={periodeDisplay}
        />
        <KpiCard
          label="Total heures"
          value={loadingSessions ? '…' : formatHeures(totalHeuresGlobal)}
          sub={periodeDisplay}
        />
        <KpiCard
          label="Masse salariale"
          value={loadingSessions ? '…' : `${totalMasseSalariale.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`}
          sub={periodeDisplay}
        />
      </div>

      {/* Bilan Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loadingSessions ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement des sessions…</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Intervenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Spécialité</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Séances</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Heures</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Taux/h</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Montant dû</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Aucun intervenant trouvé
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                          {r.prenom?.[0]}{r.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{r.prenom} {r.nom}</p>
                          {r.actif === false && (
                            <span className="text-xs text-slate-400">Inactif</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {r.specialite ? (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {r.specialite}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {r.nbSeances > 0 ? (
                        <span className="font-medium">{r.nbSeances}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {r.totalHeures > 0 ? formatHeures(r.totalHeures) : <span className="text-slate-400">0h</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 hidden sm:table-cell">
                      {r.tauxHoraire != null ? `${r.tauxHoraire} DH/h` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 hidden sm:table-cell">
                      {r.montantDu > 0 ? (
                        `${r.montantDu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModalTaux(r)}
                        title="Modifier le taux horaire"
                        className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-[#005989]/10 rounded-lg transition-colors"
                      >
                        <PencilIcon />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-3 font-bold text-slate-800" colSpan={2}>Totaux</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    {rows.reduce((acc, r) => acc + r.nbSeances, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-slate-800">
                    {formatHeures(totalHeuresGlobal)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" />
                  <td className="px-4 py-3 text-right font-bold text-slate-800 hidden sm:table-cell">
                    {totalMasseSalariale > 0
                      ? `${totalMasseSalariale.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
                      : '—'}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Modal Taux */}
      {modalTaux && (
        <ModalTaux
          intervenant={modalTaux}
          onClose={() => setModalTaux(null)}
          onSaved={() => {
            refetchIntervenants();
            setModalTaux(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'intervenants', label: 'Intervenants' },
  { id: 'bilan', label: 'Bilan Heures' },
];

export default function IntervenantsPage() {
  const { data: intervenants, loading, refetch } = useIntervenants();
  const [activeTab, setActiveTab] = useState('intervenants');

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Intervenants</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {loading ? 'Chargement…' : `${intervenants.length} intervenant${intervenants.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'bg-white border-b-2 border-[#005989] text-[#005989] font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'intervenants' && (
        <ListeTab intervenants={intervenants} loading={loading} refetch={refetch} />
      )}
      {activeTab === 'bilan' && (
        <BilanTab intervenants={intervenants} refetchIntervenants={refetch} />
      )}
    </div>
  );
}
