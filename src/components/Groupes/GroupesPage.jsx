import { useState } from 'react';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { groupesService } from '../../services/firestore';

const FILIERES = ['Développement Digital', 'Infrastructure Digitale', 'Gestion', 'Marketing', 'Comptabilité'];
const NIVEAUX = ['Technicien Spécialisé', 'Technicien', 'Qualification'];

export default function GroupesPage() {
  const { data: groupes, loading, refetch } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', filiere: '', niveau: '', intervenantId: '', annee: '2025-2026', actif: true });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm({ nom: '', filiere: '', niveau: '', intervenantId: '', annee: '2025-2026', actif: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (g) => {
    setForm({ nom: g.nom, filiere: g.filiere || '', niveau: g.niveau || '', intervenantId: g.intervenantId || '', annee: g.annee || '2025-2026', actif: g.actif !== false });
    setEditing(g);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await groupesService.update(editing.id, form);
      } else {
        await groupesService.create(form);
      }
      setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce groupe ?')) return;
    await groupesService.delete(id);
    refetch();
  };

  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groupes</h1>
          <p className="text-gray-500 text-sm">{groupes.length} groupe{groupes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          + Créer un groupe
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-8 text-center text-gray-400">Chargement…</div>
        ) : groupes.length === 0 ? (
          <div className="col-span-3 p-8 text-center text-gray-400">Aucun groupe. Créez-en un pour commencer.</div>
        ) : groupes.map(g => (
          <div key={g.id} className={`bg-white rounded-xl border shadow-sm p-5 ${g.actif ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">{g.nom}</p>
                <p className="text-sm text-gray-500">{g.filiere || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{g.niveau || '—'} · {g.annee}</p>
                <p className="text-xs text-gray-500 mt-1">Responsable : {getIntervenantName(g.intervenantId)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${g.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {g.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => openEdit(g)} className="text-xs text-gray-600 hover:underline">Modifier</button>
              <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier le groupe' : 'Créer un groupe'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom du groupe *</label>
                <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex: DD-2025-G1, TS-INF-B…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Filière</label>
                  <select value={form.filiere} onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Niveau</label>
                  <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Intervenant responsable</label>
                  <select value={form.intervenantId} onChange={e => setForm(f => ({ ...f, intervenantId: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {intervenants.map(i => <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Année académique</label>
                  <input type="text" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="actif" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} className="rounded" />
                <label htmlFor="actif" className="text-sm text-gray-700">Groupe actif</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
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
