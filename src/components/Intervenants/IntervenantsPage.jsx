import { useState } from 'react';
import { useIntervenants } from '../../hooks/useData';
import { intervenantsService } from '../../services/firestore';

const SPECIALITES = ['Développement Web', 'Réseaux & Systèmes', 'Bases de données', 'Algorithmique', 'Gestion de projet', 'Marketing Digital', 'Comptabilité', 'Autre'];

export default function IntervenantsPage() {
  const { data: intervenants, loading, refetch } = useIntervenants();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', specialite: '', actif: true });
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm({ nom: '', prenom: '', email: '', telephone: '', specialite: '', actif: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (i) => {
    setForm({ nom: i.nom, prenom: i.prenom, email: i.email || '', telephone: i.telephone || '', specialite: i.specialite || '', actif: i.actif !== false });
    setEditing(i);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await intervenantsService.update(editing.id, form);
      } else {
        await intervenantsService.create(form);
      }
      setShowForm(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intervenants</h1>
          <p className="text-gray-500 text-sm">{intervenants.length} intervenant{intervenants.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          + Ajouter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : intervenants.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun intervenant</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Intervenant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Spécialité</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {intervenants.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{i.prenom} {i.nom}</p>
                    <p className="text-xs text-gray-400">{i.telephone || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{i.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{i.specialite || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(i)} className="text-xs text-gray-600 hover:underline">Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier' : 'Ajouter un intervenant'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
                  <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} required
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Spécialité</label>
                  <select value={form.specialite} onChange={e => setForm(f => ({ ...f, specialite: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                    <option value="">— Sélectionner —</option>
                    {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="actifI" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
                <label htmlFor="actifI" className="text-sm text-gray-700">Intervenant actif</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
