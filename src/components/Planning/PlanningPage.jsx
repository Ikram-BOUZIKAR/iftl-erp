import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useWeekSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { sessionsService } from '../../services/firestore';
import SessionForm from './SessionForm';

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TYPE_COLORS = {
  cours: 'bg-blue-100 text-blue-800 border-blue-300',
  tp: 'bg-green-100 text-green-800 border-green-300',
  td: 'bg-purple-100 text-purple-800 border-purple-300',
  exam: 'bg-red-100 text-red-800 border-red-300',
};

export default function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: sessions, refetch } = useWeekSessions(weekStart);
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterGroupe, setFilterGroupe] = useState('');
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'

  const weekDays = DAYS.map((_, i) => addDays(weekStart, i));

  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  const filtered = sessions.filter(s => !filterGroupe || s.groupeId === filterGroupe);

  const getSessionsForSlot = (dayIndex, hour) => {
    const day = weekDays[dayIndex];
    return filtered.filter(s => {
      const d = new Date(s.date);
      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && s.heureDebut === hour;
    });
  };

  const handleSave = async (data) => {
    if (editing) {
      await sessionsService.update(editing.id, data);
    } else {
      await sessionsService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    refetch();
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return;
    await sessionsService.delete(id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning / EDT</h1>
          <p className="text-gray-500 text-sm">
            Semaine du {format(weekStart, 'dd MMMM', { locale: fr })} au {format(addDays(weekStart, 5), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Préc.</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Auj.</button>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Suiv. →</button>
          <button
            onClick={() => setViewMode(v => v === 'week' ? 'list' : 'week')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            {viewMode === 'week' ? '≡ Liste' : '⊞ Semaine'}
          </button>
          <select
            value={filterGroupe}
            onChange={e => setFilterGroupe(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Tous les groupes</option>
            {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            + Ajouter séance
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ListView sessions={filtered} groupes={groupes} intervenants={intervenants}
          onEdit={s => { setEditing(s); setShowForm(true); }}
          onDelete={handleDelete}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-16 px-2 py-3 text-left text-gray-500 font-medium">Heure</th>
                {weekDays.map((day, i) => (
                  <th key={i} className="px-2 py-3 text-left text-gray-700 font-semibold">
                    {DAYS[i]}<br />
                    <span className="text-gray-400 font-normal">{format(day, 'dd/MM')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-b border-gray-100 min-h-[60px]">
                  <td className="px-2 py-2 text-gray-400 align-top whitespace-nowrap">{hour}</td>
                  {weekDays.map((_, di) => {
                    const slotSessions = getSessionsForSlot(di, hour);
                    return (
                      <td key={di} className="px-1 py-1 align-top min-w-[100px]">
                        {slotSessions.map(s => (
                          <div
                            key={s.id}
                            className={`rounded border p-1.5 mb-1 cursor-pointer hover:opacity-80 transition ${TYPE_COLORS[s.type] || 'bg-gray-100 border-gray-300'}`}
                            onClick={() => { setEditing(s); setShowForm(true); }}
                          >
                            <p className="font-semibold truncate">{s.module}</p>
                            <p className="text-gray-500 truncate">{getGroupeName(s.groupeId)}</p>
                            <p className="text-gray-400">{s.heureDebut}–{s.heureFin}</p>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SessionForm
          initial={editing}
          groupes={groupes}
          intervenants={intervenants}
          defaultDate={weekStart}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ListView({ sessions, groupes, intervenants, onEdit, onDelete }) {
  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  const STATUT_COLORS = {
    planifiee: 'bg-gray-100 text-gray-600',
    en_cours: 'bg-green-100 text-green-700',
    terminee: 'bg-blue-100 text-blue-700',
    annulee: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {sessions.length === 0 ? (
        <div className="p-8 text-center text-gray-400">Aucune séance cette semaine</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Module</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Horaire</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Groupe</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Intervenant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {s.date ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{s.module}</p>
                  <p className="text-xs text-gray-400">{s.type?.toUpperCase()} {s.salle ? `· ${s.salle}` : ''}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">{s.heureDebut} – {s.heureFin}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{getGroupeName(s.groupeId)}</td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{getIntervenantName(s.intervenantId)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${STATUT_COLORS[s.statut] || 'bg-gray-100 text-gray-600'}`}>
                    {s.statut}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/emargement/${s.id}`} className="text-xs text-green-600 hover:underline">Émargement</Link>
                    <button onClick={() => onEdit(s)} className="text-xs text-gray-600 hover:underline">Modifier</button>
                    <button onClick={() => onDelete(s.id)} className="text-xs text-red-500 hover:underline">Suppr.</button>
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
