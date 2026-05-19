import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { sessionsService } from '../../services/firestore';

const STATUT_STYLES = {
  planifiee: { badge: 'bg-gray-100 text-gray-600', label: 'Planifiée' },
  en_cours: { badge: 'bg-green-100 text-green-700', label: 'En cours' },
  terminee: { badge: 'bg-blue-100 text-blue-700', label: 'Terminée' },
  annulee: { badge: 'bg-red-100 text-red-600', label: 'Annulée' },
};

export default function EmargementPage() {
  const { data: sessions, loading, refetch } = useSessions();
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [filterStatut, setFilterStatut] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [search, setSearch] = useState('');

  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  const filtered = sessions.filter(s => {
    const matchStatut = !filterStatut || s.statut === filterStatut;
    const matchGroupe = !filterGroupe || s.groupeId === filterGroupe;
    const q = search.toLowerCase();
    const matchSearch = !q || s.module?.toLowerCase().includes(q) || s.salle?.toLowerCase().includes(q);
    return matchStatut && matchGroupe && matchSearch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleOpenEmargement = async (id) => {
    await sessionsService.openEmargement(id);
    refetch();
  };

  const handleCloseEmargement = async (id) => {
    if (!confirm('Clôturer l\'émargement de cette séance ?')) return;
    await sessionsService.closeEmargement(id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Émargement</h1>
        <p className="text-gray-500 text-sm">Gestion des feuilles de présence</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher (module, salle)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Aucune séance. <Link to="/planning" className="text-blue-600 hover:underline">Créer une séance dans le planning →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Séance</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Intervenant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => {
                const st = STATUT_STYLES[s.statut] || { badge: 'bg-gray-100 text-gray-600', label: s.statut };
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.module}</p>
                      <p className="text-xs text-gray-500">
                        {s.date ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        {' · '}{s.heureDebut}–{s.heureFin}
                        {s.salle ? ` · ${s.salle}` : ''}
                        {' · '}{s.type?.toUpperCase()}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{getGroupeName(s.groupeId)}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{getIntervenantName(s.intervenantId)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${st.badge}`}>{st.label}</span>
                      {s.emargementOuvert && <span className="ml-2 text-xs text-green-600 font-semibold animate-pulse">● Ouvert</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link to={`/emargement/${s.id}`}
                          className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 transition">
                          Feuille
                        </Link>
                        {s.statut === 'planifiee' && (
                          <button onClick={() => handleOpenEmargement(s.id)}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition">
                            Ouvrir
                          </button>
                        )}
                        {s.statut === 'en_cours' && (
                          <button onClick={() => handleCloseEmargement(s.id)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                            Clôturer
                          </button>
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
    </div>
  );
}
