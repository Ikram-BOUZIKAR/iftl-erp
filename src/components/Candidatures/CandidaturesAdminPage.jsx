import { useState } from 'react';
import { useCandidatures, useGroupes } from '../../hooks/useData';
import { candidaturesService } from '../../services/firestore';

const STATUT_STYLES = {
  recu: { badge: 'bg-gray-100 text-gray-600', label: 'Reçu' },
  en_cours: { badge: 'bg-blue-100 text-blue-700', label: 'En cours' },
  accepte: { badge: 'bg-green-100 text-green-700', label: 'Accepté' },
  refuse: { badge: 'bg-red-100 text-red-600', label: 'Refusé' },
};

export default function CandidaturesAdminPage() {
  const { data: candidatures, loading, refetch } = useCandidatures();
  const { data: groupes } = useGroupes();
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [converting, setConverting] = useState(null);
  const [convertForm, setConvertForm] = useState({ groupeId: '', statut: 'actif' });

  const filtered = candidatures.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.nom?.toLowerCase().includes(q) || c.prenom?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchStatut = !filterStatut || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const updateStatut = async (id, statut) => {
    await candidaturesService.updateStatus(id, statut);
    refetch();
  };

  const handleConvert = async () => {
    if (!converting) return;
    try {
      await candidaturesService.convertToStudent(converting.id, convertForm);
      refetch();
      setConverting(null);
    } catch (err) {
      alert('Erreur lors de la conversion : ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidatures</h1>
          <p className="text-gray-500 text-sm">{filtered.length} candidature{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Tous les statuts</option>
          <option value="recu">Reçu</option>
          <option value="en_cours">En cours</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucune candidature</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Candidat</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Filière</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const st = STATUT_STYLES[c.statut] || STATUT_STYLES.recu;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.nom} {c.prenom}</p>
                      <p className="text-xs text-gray-500">{c.email} · {c.telephone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{c.filiere || '—'} · {c.niveau || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                      {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${st.badge}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {c.statut === 'recu' && (
                          <button onClick={() => updateStatut(c.id, 'en_cours')}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Traiter</button>
                        )}
                        {c.statut !== 'accepte' && c.statut !== 'refuse' && (
                          <>
                            <button onClick={() => { setConverting(c); setConvertForm({ groupeId: '', statut: 'actif' }); }}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">→ Apprenant</button>
                            <button onClick={() => updateStatut(c.id, 'refuse')}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Refuser</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Convert modal */}
      {converting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Convertir en apprenant</h2>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{converting.nom} {converting.prenom}</strong> sera créé comme apprenant actif avec les informations de sa candidature.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigner au groupe</label>
                <select value={convertForm.groupeId} onChange={e => setConvertForm(f => ({ ...f, groupeId: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                  <option value="">— Sans groupe pour l'instant —</option>
                  {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConverting(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleConvert} className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
