import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useWeekSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { sessionsService } from '../../services/firestore';
import SessionForm from './SessionForm';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const TYPE_COLORS = {
  cours: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
  tp: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
  td: 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100',
  exam: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
};

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="p-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">📅</span>
      </div>
      <p className="text-slate-700 font-semibold">Aucune séance cette semaine</p>
      <p className="text-slate-400 text-sm mt-1 mb-5">Planifiez votre première séance pour cette période.</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <PlusIcon />
        Ajouter une séance
      </button>
    </div>
  );
}

export default function PlanningPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: sessions, refetch } = useWeekSessions(weekStart);
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [modules, setModules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'

  const weekDays = DAYS.map((_, i) => addDays(weekStart, i));

  const filieres = [...new Set(groupes.map(g => g.filiere || g.filiereCode).filter(Boolean))].sort();

  const fetchModules = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'modules'), orderBy('code', 'asc')));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setModules(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  const filteredGroupes = filterFiliere
    ? groupes.filter(g => (g.filiere || g.filiereCode) === filterFiliere)
    : groupes;
  const filteredGroupeIds = new Set(filteredGroupes.map(g => g.id));
  const filtered = sessions.filter(s =>
    (!filterGroupe || s.groupeId === filterGroupe) &&
    (!filterFiliere || filteredGroupeIds.has(s.groupeId))
  );

  const getSessionsForSlot = (dayIndex, hour) => {
    const day = weekDays[dayIndex];
    return filtered.filter(s => {
      const d = new Date(s.date);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && s.heureDebut === hour;
    });
  };

  const handleSave = async (data) => {
    try {
      if (editing) {
        await sessionsService.update(editing.id, data);
        toast.success('Séance modifiée avec succès');
      } else {
        await sessionsService.create(data);
        toast.success('Séance créée avec succès');
      }
      setShowForm(false);
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleDelete = async (id, module) => {
    const ok = await confirm({
      title: 'Supprimer cette séance ?',
      message: `La séance "${module}" sera définitivement supprimée.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await sessionsService.delete(id);
      refetch();
      toast.success('Séance supprimée');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planning / EDT</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Semaine du {format(weekStart, 'dd MMMM', { locale: fr })} au {format(addDays(weekStart, 6), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week navigation */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
              className="px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              ←
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
              Auj.
            </button>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
              className="px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              →
            </button>
          </div>

          <button
            onClick={() => setViewMode(v => v === 'week' ? 'list' : 'week')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 bg-white transition-colors"
          >
            {viewMode === 'week' ? '≡ Liste' : '⊞ Semaine'}
          </button>

          <select
            value={filterFiliere}
            onChange={e => { setFilterFiliere(e.target.value); setFilterGroupe(''); }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Toutes filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={filterGroupe}
            onChange={e => setFilterGroupe(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
          >
            <option value="">Tous les groupes</option>
            {(filterFiliere ? filteredGroupes : groupes).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>

          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <PlusIcon />
            Ajouter séance
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ListView sessions={filtered} groupes={groupes} intervenants={intervenants}
          onEdit={s => { setEditing(s); setShowForm(true); }}
          onDelete={handleDelete}
          onAdd={() => { setEditing(null); setShowForm(true); }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {filtered.length === 0 ? (
            <EmptyState onAdd={() => { setEditing(null); setShowForm(true); }} />
          ) : (
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-16 px-2 py-3 text-left text-slate-400 font-medium text-xs">Heure</th>
                  {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <th key={i} className={`px-2 py-3 text-left font-semibold text-xs ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                        {DAYS[i]}
                        <br />
                        <span className={`font-normal ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>{format(day, 'dd/MM')}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour} className="border-b border-slate-100 min-h-[60px]">
                    <td className="px-2 py-2 text-slate-400 align-top whitespace-nowrap">{hour}</td>
                    {weekDays.map((_, di) => {
                      const slotSessions = getSessionsForSlot(di, hour);
                      return (
                        <td key={di} className="px-1 py-1 align-top min-w-[100px]">
                          {slotSessions.map(s => (
                            <div
                              key={s.id}
                              className={`rounded-lg border p-1.5 mb-1 cursor-pointer transition-colors ${TYPE_COLORS[s.type] || 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                              onClick={() => { setEditing(s); setShowForm(true); }}
                            >
                              <p className="font-semibold truncate text-xs">{s.module}</p>
                              <p className="text-xs opacity-70 truncate">{getGroupeName(s.groupeId)}</p>
                              <p className="text-xs opacity-50">{s.heureDebut}–{s.heureFin}</p>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <SessionForm
          initial={editing}
          groupes={groupes}
          intervenants={intervenants}
          modules={modules}
          defaultDate={weekStart}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ListView({ sessions, groupes, intervenants, onEdit, onDelete, onAdd }) {
  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  const STATUT_COLORS = {
    planifiee: 'bg-slate-100 text-slate-600',
    en_cours: 'bg-emerald-100 text-emerald-700',
    terminee: 'bg-blue-100 text-blue-700',
    annulee: 'bg-red-100 text-red-600'
  };
  const STATUT_LABELS = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {sessions.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-slate-700 font-semibold">Aucune séance cette semaine</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Planifiez votre première séance pour cette période.</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ajouter une séance
          </button>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Module</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Horaire</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Groupe</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Intervenant</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-sm">
                  {s.date ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{s.module}</p>
                  <p className="text-xs text-slate-400">{s.type?.toUpperCase()} {s.salle ? `· ${s.salle}` : ''}</p>
                </td>
                <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">{s.heureDebut} – {s.heureFin}</td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{getGroupeName(s.groupeId)}</td>
                <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{getIntervenantName(s.intervenantId)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_COLORS[s.statut] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUT_LABELS[s.statut] || s.statut}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link to={`/emargement/${s.id}`} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">Émargement</Link>
                    <button onClick={() => onEdit(s)} className="text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">Modifier</button>
                    <button onClick={() => onDelete(s.id, s.module)} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">Suppr.</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
