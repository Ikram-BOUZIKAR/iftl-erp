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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(n) + ' DH';
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR');
}

function isOverdue(facture) {
  if (!facture.dateEcheance) return false;
  if (facture.statut === 'payee') return false;
  return new Date(facture.dateEcheance) < new Date();
}

function computeStatut(paiements, montantTotal) {
  const totalPaye = (paiements || []).reduce((s, p) => s + (Number(p.montant) || 0), 0);
  if (totalPaye <= 0) return { statut: 'impayee', montantPaye: 0 };
  if (totalPaye >= montantTotal) return { statut: 'payee', montantPaye: totalPaye };
  return { statut: 'partiellement_payee', montantPaye: totalPaye };
}

function StatutBadge({ statut, overdue }) {
  const styles = {
    impayee: 'bg-red-100 text-red-700',
    partiellement_payee: 'bg-amber-100 text-amber-700',
    payee: 'bg-emerald-100 text-emerald-700',
  };
  const labels = {
    impayee: 'Impayée',
    partiellement_payee: 'Partielle',
    payee: 'Payée',
  };
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[statut] || 'bg-slate-100 text-slate-600'}`}>
        {labels[statut] || statut}
      </span>
      {overdue && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
          En retard
        </span>
      )}
    </span>
  );
}

// ─── Payment Progress Bar ─────────────────────────────────────────────────────

function PaymentProgressBar({ montantPaye, montantTotal }) {
  const pct = montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{clamped}%</span>
    </div>
  );
}

// ─── Payment History Sub-row ──────────────────────────────────────────────────

const MODE_LABELS = {
  virement: 'Virement',
  especes: 'Espèces',
  cheque: 'Chèque',
  cmi: 'CMI / TPE',
};

function PaymentHistoryRow({ paiements }) {
  if (!paiements || paiements.length === 0) {
    return (
      <tr>
        <td colSpan={9} className="bg-blue-50/50 border-b border-blue-100 px-6 py-4">
          <p className="text-xs text-slate-400 italic">Aucun paiement enregistré.</p>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={9} className="bg-blue-50/50 border-b border-blue-100 px-6 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Historique des paiements ({paiements.length})
        </p>
        <div className="flex flex-col gap-1.5">
          {paiements.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white rounded-lg px-3 py-2 border border-blue-100 text-xs"
            >
              <span className="text-slate-400 w-5 text-right tabular-nums">{i + 1}.</span>
              <span className="text-slate-500 w-24">{formatDate(p.date)}</span>
              <span className="text-slate-600 font-medium w-28">
                {MODE_LABELS[p.mode] || p.mode || '—'}
              </span>
              <span className="text-slate-400 flex-1 truncate">
                {p.reference ? (
                  <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-500">{p.reference}</span>
                ) : (
                  <span className="italic">—</span>
                )}
              </span>
              <span className="font-semibold text-emerald-700 w-28 text-right">{formatCurrency(p.montant)}</span>
            </div>
          ))}
        </div>
      </td>
    </tr>
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

// ─── Nouvelle Facture Modal ───────────────────────────────────────────────────

const ANNEES = ['2024-2025', '2025-2026', '2026-2027'];

function ModalNouvelleFacture({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    studentNom: '',
    studentPrenom: '',
    studentId: '',
    montantTotal: '',
    description: '',
    dateEcheance: '',
    anneeAcademique: '2025-2026',
    filiere: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentNom.trim() || !form.montantTotal) return;
    setSaving(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      const reference = `FAC-${year}-${rand}`;
      await addDoc(collection(db, 'factures'), {
        studentId: form.studentId || null,
        studentNom: form.studentNom.trim().toUpperCase(),
        studentPrenom: form.studentPrenom.trim(),
        reference,
        anneeAcademique: form.anneeAcademique,
        filiere: form.filiere.trim() || null,
        montantTotal: Number(form.montantTotal),
        montantPaye: 0,
        description: form.description.trim(),
        dateEmission: now,
        dateEcheance: form.dateEcheance || null,
        statut: 'impayee',
        paiements: [],
      });
      toast.success(`Facture ${reference} créée`);
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Nouvelle facture</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                value={form.studentNom}
                onChange={e => set('studentNom', e.target.value)}
                placeholder="NOM"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Filière / Groupe</label>
            <input
              type="text"
              value={form.filiere}
              onChange={e => set('filiere', e.target.value)}
              placeholder="ex. Informatique, BTS Commerce…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant total (DH) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.montantTotal}
                onChange={e => set('montantTotal', e.target.value)}
                placeholder="0.00"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Année académique</label>
              <select
                value={form.anneeAcademique}
                onChange={e => set('anneeAcademique', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
              >
                {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Frais de scolarité, inscription…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'échéance</label>
            <input
              type="date"
              value={form.dateEcheance}
              onChange={e => set('dateEcheance', e.target.value)}
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
              {saving ? 'Enregistrement…' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Enregistrer Paiement Modal ────────────────────────────────────────────────

const MODES_PAIEMENT = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'cmi', label: 'CMI / TPE' },
];

function ModalPaiement({ facture, onClose, onSaved }) {
  const toast = useToast();
  const solde = facture.montantTotal - (facture.montantPaye || 0);
  const [form, setForm] = useState({
    montant: String(solde > 0 ? solde : ''),
    mode: 'virement',
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
      const newPaiements = [...(facture.paiements || []), paiement];
      const { statut, montantPaye } = computeStatut(newPaiements, facture.montantTotal);
      await updateDoc(doc(db, 'factures', facture.id), {
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
            <p className="text-xs text-slate-500 mt-0.5">{facture.reference} · {facture.studentNom} {facture.studentPrenom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="font-semibold text-slate-800">{formatCurrency(facture.montantTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Déjà payé</p>
            <p className="font-semibold text-emerald-700">{formatCurrency(facture.montantPaye)}</p>
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FacturationPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNouvelleFacture, setShowNouvelleFacture] = useState(false);
  const [selectedForPaiement, setSelectedForPaiement] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadFactures = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'factures'), orderBy('dateEmission', 'desc'));
      const snap = await getDocs(q);
      setFactures(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFactures(); }, [loadFactures]);

  const handleDelete = async (facture) => {
    const ok = await confirm({
      title: 'Supprimer cette facture ?',
      message: `La facture ${facture.reference} sera définitivement supprimée.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'factures', facture.id));
      toast.success('Facture supprimée');
      loadFactures();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Derived filter options
  const anneesDisponibles = [...new Set(factures.map(f => f.anneeAcademique).filter(Boolean))].sort().reverse();
  const filieresDisponibles = [...new Set(factures.map(f => f.filiere).filter(Boolean))].sort();

  // Filtered list
  const filtered = factures.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      f.studentNom?.toLowerCase().includes(q) ||
      f.studentPrenom?.toLowerCase().includes(q) ||
      f.reference?.toLowerCase().includes(q);
    const matchStatut = !filterStatut || f.statut === filterStatut;
    const matchAnnee = !filterAnnee || f.anneeAcademique === filterAnnee;
    const matchFiliere = !filterFiliere || f.filiere === filterFiliere;
    return matchSearch && matchStatut && matchAnnee && matchFiliere;
  });

  // KPIs
  const totalFacture = factures.reduce((s, f) => s + (f.montantTotal || 0), 0);
  const totalEncaisse = factures.reduce((s, f) => s + (f.montantPaye || 0), 0);
  const soldeImpaye = totalFacture - totalEncaisse;
  const tauxRecouvrement = totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Facturation</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${factures.length} facture${factures.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowNouvelleFacture(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Nouvelle facture
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total facturé" value={formatCurrency(totalFacture)} color="border-[#005989]" />
        <KpiCard label="Total encaissé" value={formatCurrency(totalEncaisse)} color="border-emerald-500" />
        <KpiCard label="Solde impayé" value={formatCurrency(soldeImpaye)} color="border-red-400" />
        <KpiCard label="Taux de recouvrement" value={`${tauxRecouvrement}%`} color="border-amber-400" sub={`${factures.filter(f => f.statut === 'payee').length} factures soldées`} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Rechercher un apprenant, une référence…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="impayee">Impayée</option>
            <option value="partiellement_payee">Partiellement payée</option>
            <option value="payee">Payée</option>
          </select>
          <select
            value={filterAnnee}
            onChange={e => setFilterAnnee(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Toutes les années</option>
            {anneesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {filieresDisponibles.length > 0 && (
            <select
              value={filterFiliere}
              onChange={e => setFilterFiliere(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
            >
              <option value="">Toutes les filières</option>
              {filieresDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
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
            <p className="text-slate-500 font-medium">Aucune facture trouvée</p>
            <p className="text-slate-400 text-sm mt-1">Modifiez vos filtres ou créez une nouvelle facture.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Référence</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Montant</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Payé</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Progression</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Solde</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Échéance</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(f => {
                  const solde = f.montantTotal - (f.montantPaye || 0);
                  const overdue = isOverdue(f);
                  const isExpanded = expandedId === f.id;
                  const hasPaiements = f.paiements && f.paiements.length > 0;
                  return (
                    <tr key={f.id} className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{f.reference}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{f.studentNom} {f.studentPrenom}</p>
                        {f.anneeAcademique && <p className="text-xs text-slate-400">{f.anneeAcademique}</p>}
                        {f.filiere && (
                          <span className="inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded bg-[#005989]/10 text-[#005989]">
                            {f.filiere}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-800 font-medium">{formatCurrency(f.montantTotal)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-medium">{formatCurrency(f.montantPaye || 0)}</td>
                      <td className="px-4 py-3">
                        <PaymentProgressBar montantPaye={f.montantPaye || 0} montantTotal={f.montantTotal} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(solde)}</td>
                      <td className="px-4 py-3">
                        <StatutBadge statut={f.statut} overdue={overdue} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{formatDate(f.dateEcheance)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleExpand(f.id)}
                            title={isExpanded ? 'Masquer les paiements' : 'Voir les paiements'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isExpanded
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            } ${!hasPaiements && f.statut === 'impayee' ? 'opacity-40' : ''}`}
                          >
                            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          </button>
                          {f.statut !== 'payee' && (
                            <button
                              onClick={() => setSelectedForPaiement(f)}
                              className="text-xs font-medium px-2.5 py-1.5 bg-[#005989] text-white rounded-lg hover:bg-[#004a73] transition-colors whitespace-nowrap"
                            >
                              Paiement
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(f)}
                            className="text-xs font-medium px-2.5 py-1.5 text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Suppr.
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
      {showNouvelleFacture && (
        <ModalNouvelleFacture
          onClose={() => setShowNouvelleFacture(false)}
          onSaved={loadFactures}
        />
      )}
      {selectedForPaiement && (
        <ModalPaiement
          facture={selectedForPaiement}
          onClose={() => setSelectedForPaiement(null)}
          onSaved={loadFactures}
        />
      )}
    </div>
  );
}
