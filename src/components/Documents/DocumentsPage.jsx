import { useState, useEffect, useCallback } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import { useGroupes } from '../../hooks/useData';
import { generateDocumentAdministratif } from '../../services/pdfService';

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

function PrinterIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES_DOCUMENT = [
  { value: 'attestation_scolarite', label: 'Attestation de scolarité', prefix: 'ATT-SCO', color: 'bg-blue-100 text-blue-700' },
  { value: 'attestation_stage', label: 'Attestation de stage', prefix: 'ATT-STG', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'releve_notes', label: 'Relevé de notes', prefix: 'REL-NOT', color: 'bg-purple-100 text-purple-700' },
  { value: 'convention_stage', label: 'Convention de stage', prefix: 'CON-STG', color: 'bg-orange-100 text-orange-700' },
  { value: 'diplome', label: 'Diplôme', prefix: 'DIP', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'certificat_formation', label: 'Certificat de formation', prefix: 'CERT-FOR', color: 'bg-emerald-100 text-emerald-700' },
];

const STATUTS_DOCUMENT = [
  { value: 'brouillon', label: 'Brouillon', color: 'bg-slate-100 text-slate-600' },
  { value: 'valide', label: 'Validé', color: 'bg-blue-100 text-blue-700' },
  { value: 'remis', label: 'Remis', color: 'bg-emerald-100 text-emerald-700' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR');
}

function getTypeInfo(value) {
  return TYPES_DOCUMENT.find(t => t.value === value) || { label: value, prefix: 'DOC', color: 'bg-slate-100 text-slate-600' };
}

function getStatutInfo(value) {
  return STATUTS_DOCUMENT.find(s => s.value === value) || { label: value, color: 'bg-slate-100 text-slate-600' };
}

function generateReference(typeValue, count) {
  const info = getTypeInfo(typeValue);
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, '0');
  return `${info.prefix}-${year}-${seq}`;
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

// ─── Create Modal ─────────────────────────────────────────────────────────────

function ModalNouveauDocument({ groupes, totalDocuments, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    studentNom: '',
    studentPrenom: '',
    studentId: '',
    groupeId: '',
    filiereCode: '',
    type: 'attestation_scolarite',
    observations: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentNom.trim() || !form.type) return;
    setSaving(true);
    try {
      const reference = generateReference(form.type, totalDocuments);
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'documents'), {
        studentId: form.studentId || null,
        studentNom: form.studentNom.trim().toUpperCase(),
        studentPrenom: form.studentPrenom.trim(),
        groupeId: form.groupeId || null,
        filiereCode: form.filiereCode || null,
        type: form.type,
        reference,
        dateEmission: today,
        generePar: 'Institut',
        statut: 'brouillon',
        observations: form.observations.trim(),
      });
      toast.success(`Document ${reference} créé`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedType = TYPES_DOCUMENT.find(t => t.value === form.type);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">Nouveau document</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type de document *</label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
            >
              {TYPES_DOCUMENT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {selectedType && (
              <p className="text-xs text-slate-400 mt-1">
                Référence générée : <span className="font-mono text-slate-600">{generateReference(form.type, totalDocuments)}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom de l'apprenant *</label>
              <input
                type="text"
                value={form.studentNom}
                onChange={e => set('studentNom', e.target.value)}
                required
                placeholder="NOM"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Groupe</label>
            <select
              value={form.groupeId}
              onChange={e => set('groupeId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
            >
              <option value="">— Sélectionner un groupe —</option>
              {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observations</label>
            <textarea
              value={form.observations}
              onChange={e => set('observations', e.target.value)}
              rows={2}
              placeholder="Remarques…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Création…' : 'Créer le document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: groupes } = useGroupes();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'documents'), orderBy('dateEmission', 'desc'));
      const snap = await getDocs(q);
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleValider = async (doc_) => {
    try {
      await updateDoc(doc(db, 'documents', doc_.id), { statut: 'valide' });
      toast.success('Document validé');
      loadDocuments();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleMarquerRemis = async (doc_) => {
    try {
      await updateDoc(doc(db, 'documents', doc_.id), { statut: 'remis' });
      toast.success('Document marqué comme remis');
      loadDocuments();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleImprimer = (doc_) => {
    try {
      generateDocumentAdministratif(doc_);
    } catch (err) {
      toast.error('Erreur lors de la génération du PDF : ' + err.message);
    }
  };

  const handleDelete = async (doc_) => {
    const ok = await confirm({
      title: 'Supprimer ce document ?',
      message: `Le document ${doc_.reference} sera définitivement supprimé.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'documents', doc_.id));
      toast.success('Document supprimé');
      loadDocuments();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  // Filtered
  const filtered = documents.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.studentNom?.toLowerCase().includes(q) ||
      d.studentPrenom?.toLowerCase().includes(q) ||
      d.reference?.toLowerCase().includes(q);
    const matchType = !filterType || d.type === filterType;
    const matchStatut = !filterStatut || d.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  // Stats
  const now = new Date();
  const thisMonth = documents.filter(d => {
    if (!d.dateEmission) return false;
    const dt = new Date(d.dateEmission);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });

  const getGroupeNom = (id) => groupes.find(g => g.id === id)?.nom || '—';

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents &amp; Attestations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl hover:bg-[#004a73] text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon />
          Nouveau document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Émis ce mois"
          value={thisMonth.length}
          color="border-[#005989]"
        />
        <StatCard
          label="Attestations scolarité"
          value={documents.filter(d => d.type === 'attestation_scolarite').length}
          color="border-blue-400"
        />
        <StatCard
          label="Relevés de notes"
          value={documents.filter(d => d.type === 'releve_notes').length}
          color="border-purple-400"
        />
        <StatCard
          label="Conventions de stage"
          value={documents.filter(d => d.type === 'convention_stage').length}
          color="border-orange-400"
        />
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
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Tous les types</option>
            {TYPES_DOCUMENT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUTS_DOCUMENT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
            <p className="text-slate-500 font-medium">Aucun document trouvé</p>
            <p className="text-slate-400 text-sm mt-1">Modifiez vos filtres ou créez un nouveau document.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Référence</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Groupe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(d => {
                  const typeInfo = getTypeInfo(d.type);
                  const statutInfo = getStatutInfo(d.statut);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{d.studentNom} {d.studentPrenom}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {getGroupeNom(d.groupeId)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(d.dateEmission)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statutInfo.color}`}>
                          {statutInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {d.statut === 'brouillon' && (
                            <button
                              onClick={() => handleValider(d)}
                              className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              Valider
                            </button>
                          )}
                          {d.statut === 'valide' && (
                            <button
                              onClick={() => handleMarquerRemis(d)}
                              className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors whitespace-nowrap"
                            >
                              Marquer remis
                            </button>
                          )}
                          <button
                            onClick={() => handleImprimer(d)}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <PrinterIcon />
                            Imprimer
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="text-xs font-medium px-2 py-1 text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
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

      {/* Create Modal */}
      {showCreate && (
        <ModalNouveauDocument
          groupes={groupes}
          totalDocuments={documents.length}
          onClose={() => setShowCreate(false)}
          onSaved={loadDocuments}
        />
      )}
    </div>
  );
}
