import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudents, useGroupes } from '../../hooks/useData';
import { studentsService } from '../../services/firestore';
import ApprenantForm from './ApprenantForm';

export default function ApprenantsPage() {
  const { data: students, loading, refetch } = useStudents();
  const { data: groupes } = useGroupes();
  const [search, setSearch] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterStatut, setFilterStatut] = useState('actif');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q);
    const matchGroupe = !filterGroupe || s.groupeId === filterGroupe;
    const matchStatut = !filterStatut || s.statut === filterStatut;
    return matchSearch && matchGroupe && matchStatut;
  });

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet apprenant ?')) return;
    await studentsService.delete(id);
    refetch();
  };

  const handleSave = async (data) => {
    if (editing) {
      await studentsService.update(editing.id, data);
    } else {
      await studentsService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apprenants</h1>
          <p className="text-gray-500 text-sm">{filtered.length} apprenant{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher (nom, prénom, email, CIN)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <select
          value={filterGroupe}
          onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="archive">Archivé</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Aucun apprenant trouvé
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Apprenant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">CIN</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(student => {
                const groupe = groupes.find(g => g.id === student.groupeId);
                return (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {student.nom?.[0]}{student.prenom?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{student.nom} {student.prenom}</p>
                          <p className="text-xs text-gray-500 sm:hidden">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{student.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{student.cin || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{groupe?.nom || student.filiere || '—'}</td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={student.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/apprenants/${student.id}`} className="text-xs text-blue-600 hover:underline">Voir</Link>
                        <button onClick={() => { setEditing(student); setShowForm(true); }} className="text-xs text-gray-600 hover:underline">Modifier</button>
                        <button onClick={() => handleDelete(student.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ApprenantForm
          initial={editing}
          groupes={groupes}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function StatutBadge({ statut }) {
  const map = {
    actif: 'bg-green-100 text-green-700',
    inactif: 'bg-gray-100 text-gray-600',
    archive: 'bg-yellow-100 text-yellow-700'
  };
  return <span className={`text-xs font-medium px-2 py-1 rounded ${map[statut] || 'bg-gray-100 text-gray-600'}`}>{statut}</span>;
}
