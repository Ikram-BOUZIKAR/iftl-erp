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
const DAYS  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// IFTL brand palette
const TYPE_STYLES = {
  cours: {
    card:   'bg-[#005989]/10 border-[#005989]/30 hover:bg-[#005989]/15',
    bar:    'bg-[#005989]',
    text:   'text-[#005989]',
    badge:  'bg-[#005989] text-white',
    label:  'Cours',
  },
  tp: {
    card:   'bg-[#c8d45d]/20 border-[#c8d45d]/50 hover:bg-[#c8d45d]/30',
    bar:    'bg-[#8a9a0a]',
    text:   'text-[#5a6a00]',
    badge:  'bg-[#8a9a0a] text-white',
    label:  'TP',
  },
  td: {
    card:   'bg-[#f5c845]/15 border-[#f5c845]/50 hover:bg-[#f5c845]/25',
    bar:    'bg-[#d4a000]',
    text:   'text-[#7a5c00]',
    badge:  'bg-[#d4a000] text-white',
    label:  'TD',
  },
  exam: {
    card:   'bg-red-50 border-red-200 hover:bg-red-100',
    bar:    'bg-red-500',
    text:   'text-red-700',
    badge:  'bg-red-500 text-white',
    label:  'Exam',
  },
};

const STATUT_DOT = {
  planifiee:  'bg-slate-400',
  en_cours:   'bg-emerald-500',
  terminee:   'bg-[#005989]',
  annulee:    'bg-red-400',
};

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChevronLeft() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
}
function ChevronRight() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}

export default function PlanningPage() {
  const toast   = useToast();
  const confirm = useConfirm();
  const [weekStart, setWeekStart]     = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: sessions, refetch }   = useWeekSessions(weekStart);
  const { data: groupes }             = useGroupes();
  const { data: intervenants }        = useIntervenants();
  const [modules, setModules]         = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [filterGroupe, setFilterGroupe]   = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [viewMode, setViewMode]       = useState('week');
  const [defaultSlot, setDefaultSlot] = useState(null);

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

  const getGroupeName    = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : null;
  };

  const filteredGroupes  = filterFiliere ? groupes.filter(g => (g.filiere || g.filiereCode) === filterFiliere) : groupes;
  const filteredGroupeIds = new Set(filteredGroupes.map(g => g.id));
  const filtered = sessions.filter(s =>
    (!filterGroupe  || s.groupeId === filterGroupe) &&
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
        toast.success('Séance modifiée');
      } else {
        await sessionsService.create(data);
        toast.success('Séance créée');
      }
      setShowForm(false);
      setEditing(null);
      setDefaultSlot(null);
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

  const openAdd = (date, hour) => {
    setEditing(null);
    setDefaultSlot(date && hour ? { date: format(date, 'yyyy-MM-dd'), heureDebut: hour } : null);
    setShowForm(true);
  };

  const statsTotal    = filtered.length;
  const statsTypes    = Object.fromEntries(Object.keys(TYPE_STYLES).map(t => [t, filtered.filter(s => s.type === t).length]));

  return (
    <div className="space-y-5 max-w-7xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planning / EDT</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Semaine du <span className="font-semibold text-[#005989]">{format(weekStart, 'dd MMMM', { locale: fr })}</span> au{' '}
            <span className="font-semibold text-[#005989]">{format(addDays(weekStart, 6), 'dd MMMM yyyy', { locale: fr })}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Week nav */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-[#005989] transition-colors border-r border-slate-100">
              <ChevronLeft />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-4 py-2 text-sm font-semibold text-[#005989] hover:bg-blue-50 transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-[#005989] transition-colors border-l border-slate-100">
              <ChevronRight />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-[#005989] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              ⊞ Semaine
            </button>
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[#005989] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              ≡ Liste
            </button>
          </div>

          {/* Filters */}
          <select value={filterFiliere} onChange={e => { setFilterFiliere(e.target.value); setFilterGroupe(''); }}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#005989]/40">
            <option value="">Toutes filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#005989]/40">
            <option value="">Tous les groupes</option>
            {(filterFiliere ? filteredGroupes : groupes).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>

          <button onClick={() => openAdd(null, null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] hover:bg-[#004a73] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
            <PlusIcon />
            Ajouter séance
          </button>
        </div>
      </div>

      {/* ── Type legend + stats ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {statsTotal > 0 && (
          <span className="text-xs text-slate-500 font-medium">{statsTotal} séance{statsTotal > 1 ? 's' : ''} ·</span>
        )}
        {Object.entries(TYPE_STYLES).map(([type, s]) => {
          const count = statsTypes[type];
          if (!count) return null;
          return (
            <span key={type} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>
              {s.label} <span className="opacity-75">({count})</span>
            </span>
          );
        })}
      </div>

      {/* ── Main view ── */}
      {viewMode === 'list' ? (
        <ListView
          sessions={filtered} groupes={groupes} intervenants={intervenants}
          onEdit={s => { setEditing(s); setShowForm(true); }}
          onDelete={handleDelete}
          onAdd={() => openAdd(null, null)}
        />
      ) : (
        <WeekGrid
          weekDays={weekDays}
          getSessionsForSlot={getSessionsForSlot}
          getGroupeName={getGroupeName}
          getIntervenantName={getIntervenantName}
          onEdit={s => { setEditing(s); setShowForm(true); }}
          onAddSlot={openAdd}
        />
      )}

      {showForm && (
        <SessionForm
          initial={editing || defaultSlot}
          groupes={groupes}
          intervenants={intervenants}
          modules={modules}
          defaultDate={defaultSlot?.date ? new Date(defaultSlot.date) : weekStart}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); setDefaultSlot(null); }}
        />
      )}
    </div>
  );
}

// ── Week grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ weekDays, getSessionsForSlot, getGroupeName, getIntervenantName, onEdit, onAddSlot }) {
  const allSessions = HOURS.flatMap((h, hi) => weekDays.map((_, di) => getSessionsForSlot(di, h))).flat();
  if (allSessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#005989]/10 flex items-center justify-center mx-auto mb-4 text-3xl">📅</div>
        <p className="text-slate-700 font-semibold text-lg">Aucune séance cette semaine</p>
        <p className="text-slate-400 text-sm mt-1 mb-6">Cliquez sur une cellule ou le bouton pour planifier.</p>
        <button onClick={() => onAddSlot(null, null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-semibold rounded-xl transition-colors">
          + Ajouter une séance
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full min-w-[700px] text-xs">
        <thead>
          <tr className="border-b-2 border-slate-100">
            <th className="w-14 px-2 py-3 text-slate-400 font-medium text-xs text-left"></th>
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <th key={i} className="px-2 py-3 text-left min-w-[110px]">
                  <div className={`font-bold text-xs uppercase tracking-wide ${isToday ? 'text-[#005989]' : 'text-slate-500'}`}>
                    {DAYS[i]}
                  </div>
                  <div className={`text-lg font-bold leading-none mt-0.5 ${isToday ? 'text-[#005989]' : 'text-slate-800'}`}>
                    {format(day, 'dd')}
                    {isToday && <span className="inline-block w-1.5 h-1.5 bg-[#f5c845] rounded-full ml-1 mb-1"></span>}
                  </div>
                  <div className={`text-xs font-normal ${isToday ? 'text-[#005989]/60' : 'text-slate-400'}`}>
                    {format(day, 'MMM', { locale: fr })}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour} className="border-b border-slate-50 group/row">
              <td className="px-2 py-1.5 text-slate-300 font-mono text-xs align-top whitespace-nowrap pt-2.5">{hour}</td>
              {weekDays.map((day, di) => {
                const slotSessions = getSessionsForSlot(di, hour);
                return (
                  <td key={di}
                    className="px-1 py-1 align-top cursor-pointer group/cell"
                    onClick={() => { if (slotSessions.length === 0) onAddSlot(day, hour); }}
                  >
                    {slotSessions.length === 0 ? (
                      <div className="h-8 rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity border-2 border-dashed border-[#005989]/20 flex items-center justify-center text-[#005989]/40 text-sm">
                        +
                      </div>
                    ) : (
                      slotSessions.map(s => {
                        const style = TYPE_STYLES[s.type] || TYPE_STYLES.cours;
                        const intName = getIntervenantName(s.intervenantId);
                        return (
                          <div key={s.id}
                            onClick={e => { e.stopPropagation(); onEdit(s); }}
                            className={`rounded-xl border p-2 mb-1 cursor-pointer transition-all shadow-sm hover:shadow-md ${style.card}`}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className={`shrink-0 w-1 h-full min-h-[36px] rounded-full ${style.bar} mt-0.5`}></div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-bold text-xs leading-tight truncate ${style.text}`}>
                                  {s.module}
                                </div>
                                <div className="text-slate-600 text-xs truncate mt-0.5">
                                  {getGroupeName(s.groupeId)}
                                </div>
                                {intName && (
                                  <div className="text-slate-400 text-xs truncate">{intName}</div>
                                )}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-slate-400 text-xs">{s.heureDebut}–{s.heureFin}</span>
                                  {s.salle && <span className="text-slate-400 text-xs">· {s.salle}</span>}
                                  {s.statut && s.statut !== 'planifiee' && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${STATUT_DOT[s.statut] || 'bg-slate-300'}`}></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────
function ListView({ sessions, groupes, intervenants, onEdit, onDelete, onAdd }) {
  const getGroupeName    = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };

  const STATUT_LABELS = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
  const STATUT_COLORS = {
    planifiee: 'bg-slate-100 text-slate-600',
    en_cours:  'bg-emerald-100 text-emerald-700',
    terminee:  'bg-[#005989]/10 text-[#005989]',
    annulee:   'bg-red-100 text-red-600',
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#005989]/10 flex items-center justify-center mx-auto mb-4 text-3xl">📅</div>
        <p className="text-slate-700 font-semibold text-lg">Aucune séance cette semaine</p>
        <p className="text-slate-400 text-sm mt-1 mb-6">Planifiez votre première séance.</p>
        <button onClick={onAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-semibold rounded-xl transition-colors">
          + Ajouter une séance
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Module</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Horaire</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Groupe</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Intervenant</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sessions.map(s => {
            const style = TYPE_STYLES[s.type] || TYPE_STYLES.cours;
            return (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-sm">
                  {s.date ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md ${style.badge}`}>{style.label}</span>
                    <p className="font-semibold text-slate-800 text-sm">{s.module}</p>
                  </div>
                  {s.salle && <p className="text-xs text-slate-400 mt-0.5 pl-14">Salle {s.salle}</p>}
                </td>
                <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap font-mono text-xs">
                  {s.heureDebut} – {s.heureFin}
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell text-sm">{getGroupeName(s.groupeId)}</td>
                <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-sm">{getIntervenantName(s.intervenantId)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_COLORS[s.statut] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUT_LABELS[s.statut] || s.statut}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link to={`/emargement/${s.id}`} className="text-xs font-semibold text-[#005989] hover:underline">Émargement</Link>
                    <button onClick={() => onEdit(s)} className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">Modifier</button>
                    <button onClick={() => onDelete(s.id, s.module)} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">Suppr.</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
