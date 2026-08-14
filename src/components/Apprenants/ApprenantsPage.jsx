import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudents, useGroupes } from '../../hooks/useData';
import { studentsService } from '../../services/firestore';
import ApprenantForm from './ApprenantForm';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

function UserPlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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

function EmptyState({ search, onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🎓</span>
      </div>
      {search ? (
        <>
          <p className="text-slate-700 font-semibold">Aucun résultat pour "{search}"</p>
          <p className="text-slate-400 text-sm mt-1">Essayez avec un autre nom, email ou CIN.</p>
        </>
      ) : (
        <>
          <p className="text-slate-700 font-semibold">Aucun apprenant pour l'instant</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Commencez par ajouter votre premier apprenant.</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlusIcon />
            Ajouter un apprenant
          </button>
        </>
      )}
    </div>
  );
}

export default function ApprenantsPage() {
  const toast = useToast();
  const confirm = useConfirm();
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

  const handleDelete = async (id, nom) => {
    const ok = await confirm({
      title: 'Supprimer cet apprenant ?',
      message: `"${nom}" sera définitivement supprimé. Cette action est irréversible.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await studentsService.delete(id);
      refetch();
      toast.success('Apprenant supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression : ' + err.message);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editing) {
        await studentsService.update(editing.id, data);
        toast.success('Apprenant modifié avec succès');
      } else {
        await studentsService.create(data);
        toast.success('Apprenant ajouté avec succès');
      }
      setShowForm(false);
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apprenants</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : (() => {
              const actifs = students.filter(s => s.statut === 'actif').length;
              const laureats = students.filter(s => s.statut === 'laureat').length;
              return `${filtered.length} affiché${filtered.length > 1 ? 's' : ''} · ${actifs} actif${actifs > 1 ? 's' : ''} · ${laureats} lauréat${laureats > 1 ? 's' : ''}`;
            })()}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <UserPlusIcon />
          Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Rechercher (nom, prénom, email, CIN)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={filterGroupe}
          onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="archive">Archivé</option>
          <option value="laureat">Lauréat 🎓</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onAdd={() => { setEditing(null); setShowForm(true); }} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">CIN</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(student => {
                const groupe = groupes.find(g => g.id === student.groupeId);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {student.nom?.[0]}{student.prenom?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{student.nom} {student.prenom}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell text-sm">{student.email}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">{student.cin || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-sm">{groupe?.nom || student.filiere || '—'}</td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={student.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/apprenants/${student.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Voir</Link>
                        <button onClick={() => { setEditing(student); setShowForm(true); }} className="text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">Modifier</button>
                        <button onClick={() => handleDelete(student.id, `${student.nom} ${student.prenom}`)} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">Suppr.</button>
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
    actif:    'bg-emerald-100 text-emerald-700',
    inactif:  'bg-slate-100 text-slate-600',
    archive:  'bg-amber-100 text-amber-700',
    laureat:  'bg-violet-100 text-violet-700',
  };
  const labels = { actif: 'Actif', inactif: 'Inactif', archive: 'Archivé', laureat: 'Lauréat 🎓' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${map[statut] || 'bg-slate-100 text-slate-600'}`}>
      {labels[statut] || statut}
    </span>
  );
}
