import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useIntervenants } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const FILIERES = ['TMLI', 'LIPF', 'GOL', 'ECMD', 'DMVT', 'LE', 'CTM', 'CTP'];

const FILIERE_LABELS = {
  TMLI: 'Transport Multimodal et Logistique Internationale',
  LIPF: 'Logistique Industrielle et Pilotage des Flux',
  GOL:  "Gestionnaire des opérations logistiques et d'entrepôt",
  ECMD: 'E-Commerce, Marketing Digital et Distribution',
  DMVT: 'Diagnostic et Maintenance des Véhicules de Transport',
  LE:   "Logistique d'entreposage",
  CTM:  'Conducteur(rice) en transport routier – Option Marchandises',
  CTP:  'Conducteur(rice) en transport routier – Option Personnes',
};

const FILIERE_COLORS = {
  TMLI: 'bg-blue-100 text-blue-700',
  LIPF: 'bg-violet-100 text-violet-700',
  GOL:  'bg-emerald-100 text-emerald-700',
  ECMD: 'bg-amber-100 text-amber-700',
  DMVT: 'bg-rose-100 text-rose-700',
  LE:   'bg-teal-100 text-teal-700',
  CTM:  'bg-orange-100 text-orange-700',
  CTP:  'bg-sky-100 text-sky-700',
};

const TYPE_STYLES = {
  theorique: { cls: 'bg-sky-100 text-sky-700', label: 'Théorique' },
  pratique: { cls: 'bg-teal-100 text-teal-700', label: 'Pratique' },
  professionnel: { cls: 'bg-orange-100 text-orange-700', label: 'Professionnel' },
};

const ANNEES = ['1', '2', '3'];

const EMPTY_FORM = {
  code: '',
  nom: '',
  filiereCode: '',
  anneeFormation: '1',
  coeff: 1,
  heuresTotal: 0,
  type: 'theorique',
  intervenantId: '',
  description: '',
};

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

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" />
  );
}

export default function ModulesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: intervenants } = useIntervenants();

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'modules'), orderBy('code', 'asc'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setModules(data);
    } catch (err) {
      toast.error('Erreur lors du chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowPanel(true);
  };

  const openEdit = (m) => {
    setForm({
      code: m.code || '',
      nom: m.nom || '',
      filiereCode: m.filiereCode || '',
      anneeFormation: m.anneeFormation || '1',
      coeff: m.coeff ?? 1,
      heuresTotal: m.heuresTotal ?? 0,
      type: m.type || 'theorique',
      intervenantId: m.intervenantId || '',
      description: m.description || '',
    });
    setEditing(m);
    setShowPanel(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.nom.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        coeff: Number(form.coeff),
        heuresTotal: Number(form.heuresTotal),
      };
      if (editing) {
        await updateDoc(doc(db, 'modules', editing.id), { ...payload, updatedAt: new Date() });
        toast.success('Module modifié avec succès');
      } else {
        await addDoc(collection(db, 'modules'), { ...payload, createdAt: new Date() });
        toast.success('Module créé avec succès');
      }
      setShowPanel(false);
      fetchModules();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    const ok = await confirm({
      title: 'Supprimer ce module ?',
      message: `Le module "${m.nom}" (${m.code}) sera définitivement supprimé.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'modules', m.id));
      toast.success('Module supprimé');
      fetchModules();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = useMemo(() => modules.filter(m => {
    if (filterFiliere && m.filiereCode !== filterFiliere) return false;
    if (filterAnnee && String(m.anneeFormation) !== filterAnnee) return false;
    if (filterType && m.type !== filterType) return false;
    return true;
  }), [modules, filterFiliere, filterAnnee, filterType]);

  const summaryByFiliere = useMemo(() => {
    const acc = {};
    for (const m of modules) {
      const key = m.filiereCode || '—';
      if (!acc[key]) acc[key] = { count: 0, heures: 0 };
      acc[key].count += 1;
      acc[key].heures += Number(m.heuresTotal) || 0;
    }
    return acc;
  }, [modules]);

  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : null;
  };

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Modules & Référentiel</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${modules.length} module${modules.length !== 1 ? 's' : ''} au total`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <PlusIcon />
          Nouveau module
        </button>
      </div>

      {/* Summary by filière */}
      {!loading && Object.keys(summaryByFiliere).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Récapitulatif par filière</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summaryByFiliere).map(([code, stats]) => (
              <div key={code} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${FILIERE_COLORS[code] || 'bg-slate-100 text-slate-600'}`}>{code}</span>
                <span className="text-xs text-slate-600 font-medium">{stats.count} modules</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{stats.heures} h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <select
          value={filterFiliere}
          onChange={e => setFilterFiliere(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Toutes les filières</option>
          {FILIERES.map(f => <option key={f} value={f}>{f} — {FILIERE_LABELS[f]}</option>)}
        </select>
        <select
          value={filterAnnee}
          onChange={e => setFilterAnnee(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Toutes les années</option>
          <option value="1">Année 1</option>
          <option value="2">Année 2</option>
          <option value="3">Année 3</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Tous les types</option>
          <option value="theorique">Théorique</option>
          <option value="pratique">Pratique</option>
          <option value="professionnel">Professionnel</option>
        </select>
        {(filterFiliere || filterAnnee || filterType) && (
          <button
            onClick={() => { setFilterFiliere(''); setFilterAnnee(''); setFilterType(''); }}
            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            Réinitialiser
          </button>
        )}
        <span className="ml-auto self-center text-xs text-slate-400">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Spinner /><p className="text-slate-400 text-sm mt-3">Chargement…</p></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">Aucun module trouvé</p>
            <p className="text-slate-400 text-sm mt-1">Ajustez les filtres ou créez un nouveau module.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Intitulé</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Filière</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Année</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Coeff.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Heures</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(m => {
                const typeStyle = TYPE_STYLES[m.type] || { cls: 'bg-slate-100 text-slate-600', label: m.type };
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-[#005989] bg-blue-50 px-2 py-1 rounded-md">{m.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 max-w-xs truncate">{m.nom}</p>
                      {m.description && (
                        <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{m.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {m.filiereCode ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${FILIERE_COLORS[m.filiereCode] || 'bg-slate-100 text-slate-600'}`}
                          title={FILIERE_LABELS[m.filiereCode]}>
                          {m.filiereCode}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-slate-600 text-sm">A{m.anneeFormation || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeStyle.cls}`}>{typeStyle.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{m.coeff ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{m.heuresTotal ? `${m.heuresTotal} h` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        )}
      </div>

      {/* Slide-in panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          />
          <div className="relative ml-auto w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editing ? 'Modifier le module' : 'Nouveau module'}
                </h2>
                {editing && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{editing.code}</p>
                )}
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Code + Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setField('code', e.target.value.toUpperCase())}
                    placeholder="Ex : OTM101"
                    required
                    className="w-full font-mono text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Année de formation *</label>
                  <select
                    value={form.anneeFormation}
                    onChange={e => setField('anneeFormation', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
                  >
                    {ANNEES.map(a => <option key={a} value={a}>Année {a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Intitulé du module *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setField('nom', e.target.value)}
                  placeholder="Nom complet du module"
                  required
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]"
                />
              </div>

              {/* Filière + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Filière</label>
                  <select
                    value={form.filiereCode}
                    onChange={e => setField('filiereCode', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
                  >
                    <option value="">— Sélectionner —</option>
                    {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {form.filiereCode && (
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{FILIERE_LABELS[form.filiereCode]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setField('type', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
                  >
                    <option value="theorique">Théorique</option>
                    <option value="pratique">Pratique</option>
                    <option value="professionnel">Professionnel</option>
                  </select>
                </div>
              </div>

              {/* Coeff + Heures */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Coefficient</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.coeff}
                    onChange={e => setField('coeff', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Volume horaire (h)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.heuresTotal}
                    onChange={e => setField('heuresTotal', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]"
                  />
                </div>
              </div>

              {/* Intervenant */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Intervenant responsable</label>
                <select
                  value={form.intervenantId}
                  onChange={e => setField('intervenantId', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
                >
                  <option value="">— Aucun —</option>
                  {intervenants.map(i => (
                    <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={3}
                  placeholder="Objectifs, contenu, prérequis…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none"
                />
              </div>
            </form>

            {/* Panel footer */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowPanel(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer le module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
