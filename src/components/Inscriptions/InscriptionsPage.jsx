import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useStudents, useGroupes } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const STATUTS = {
  en_attente:  { label: 'En attente',  cls: 'bg-amber-100 text-amber-700' },
  valide:      { label: 'Validée',     cls: 'bg-green-100 text-green-700' },
  annule:      { label: 'Annulée',     cls: 'bg-red-100 text-red-600' },
  transfere:   { label: 'Transférée',  cls: 'bg-blue-100 text-blue-700' },
};

const NIVEAUX = ['1A TS', '2A TS', 'Licence CNAM'];
const ANNEES  = ['2025-2026', '2026-2027'];

const EMPTY = {
  studentId: '', studentNom: '', studentPrenom: '',
  groupeId: '', niveau: '', anneeAcademique: '',
  dateInscription: new Date().toISOString().split('T')[0],
  fraisInscription: '', fraisScolarite: '',
  statut: 'en_attente', observations: '',
};

export default function InscriptionsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: students } = useStudents();
  const { data: groupes } = useGroupes();

  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'inscriptions'), orderBy('dateInscription', 'desc')));
      setInscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (ins) => { setEditing(ins); setForm(ins); setShowForm(true); };

  const handleSave = async () => {
    if (!form.studentNom || !form.groupeId || !form.anneeAcademique) {
      toast.error('Remplissez les champs obligatoires'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'inscriptions', editing.id), { ...form, updatedAt: new Date() });
        toast.success('Inscription mise à jour');
      } else {
        const ref = `INS-${Date.now().toString().slice(-6)}`;
        await addDoc(collection(db, 'inscriptions'), { ...form, reference: ref, createdAt: new Date() });
        toast.success('Inscription créée');
      }
      setShowForm(false);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (ins) => {
    const ok = await confirm({ title: 'Supprimer cette inscription ?', message: `${ins.studentPrenom} ${ins.studentNom}` });
    if (!ok) return;
    await deleteDoc(doc(db, 'inscriptions', ins.id));
    toast.success('Supprimé'); load();
  };

  const filtered = inscriptions.filter(i => {
    const q = search.toLowerCase();
    const matchQ = !q || `${i.studentNom} ${i.studentPrenom}`.toLowerCase().includes(q) || i.reference?.toLowerCase().includes(q);
    const matchS = !filterStatut || i.statut === filterStatut;
    return matchQ && matchS;
  });

  const getGroupeNom = (id) => groupes.find(g => g.id === id)?.nom || id;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Inscriptions</h1>
          <p className="text-slate-400 text-sm">Gestion des dossiers d'inscription des apprenants</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#005989] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#004a73] transition">
          + Nouvelle inscription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUTS).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-2xl font-black text-slate-800">{inscriptions.filter(i => i.statut === k).length}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{v.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher apprenant ou référence…"
          className="flex-1 min-w-48 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]">
          <option value="">Tous statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 font-medium">Aucune inscription</p>
            <button onClick={openNew} className="mt-3 text-sm text-[#005989] hover:underline">+ Créer la première inscription</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold">Apprenant</th>
                  <th className="px-4 py-3 text-left font-semibold">Groupe</th>
                  <th className="px-4 py-3 text-left font-semibold">Année</th>
                  <th className="px-4 py-3 text-left font-semibold">Frais</th>
                  <th className="px-4 py-3 text-left font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(ins => (
                  <tr key={ins.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{ins.reference || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{ins.studentPrenom} {ins.studentNom}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{getGroupeNom(ins.groupeId)}</td>
                    <td className="px-4 py-3 text-slate-500">{ins.anneeAcademique}</td>
                    <td className="px-4 py-3 text-slate-600">{ins.fraisScolarite ? `${Number(ins.fraisScolarite).toLocaleString()} MAD` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUTS[ins.statut]?.cls || 'bg-slate-100 text-slate-600'}`}>
                        {STATUTS[ins.statut]?.label || ins.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(ins)} className="text-xs text-[#005989] hover:underline font-medium">Modifier</button>
                        <button onClick={() => handleDelete(ins)} className="text-xs text-red-400 hover:text-red-600 font-medium">Suppr.</button>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{editing ? 'Modifier l\'inscription' : 'Nouvelle inscription'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nom *</label>
                  <input value={form.studentNom} onChange={e => set('studentNom', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Prénom *</label>
                  <input value={form.studentPrenom} onChange={e => set('studentPrenom', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Groupe *</label>
                <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]">
                  <option value="">— Choisir un groupe —</option>
                  {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Niveau</label>
                  <select value={form.niveau} onChange={e => set('niveau', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]">
                    <option value="">—</option>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Année académique *</label>
                  <select value={form.anneeAcademique} onChange={e => set('anneeAcademique', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]">
                    <option value="">—</option>
                    {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Date d'inscription</label>
                <input type="date" value={form.dateInscription} onChange={e => set('dateInscription', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Frais d'inscription (MAD)</label>
                  <input type="number" value={form.fraisInscription} onChange={e => set('fraisInscription', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Frais de scolarité (MAD)</label>
                  <input type="number" value={form.fraisScolarite} onChange={e => set('fraisScolarite', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Statut</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]">
                  {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Observations</label>
                <textarea value={form.observations} onChange={e => set('observations', e.target.value)}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#005989] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#004a73] disabled:opacity-60 transition">
                {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
