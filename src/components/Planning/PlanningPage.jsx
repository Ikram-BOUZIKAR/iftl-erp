import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useWeekSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { sessionsService } from '../../services/firestore';
import SessionForm from './SessionForm';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// ── Créneaux horaires IFTL par jour (0=Lun … 6=Dim) ──────────────────────────
export const DAY_SLOTS = [
  // Lundi
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  // Mardi
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  // Mercredi
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  // Jeudi
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  // Vendredi
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '14:15', end: '15:45' }, { start: '16:00', end: '17:30' }],
  // Samedi
  [{ start: '09:00', end: '11:00' }, { start: '11:15', end: '13:15' }, { start: '14:15', end: '17:30' }],
  // Dimanche
  [{ start: '09:00', end: '13:00' }],
];

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MAX_SLOTS = Math.max(...DAY_SLOTS.map(d => d.length)); // 4

const NIVEAU_ORDER = ['TS 1A', 'TS 2A', 'Technicien', 'T', 'Qualification', 'Licence', 'Mastère'];

export const TYPE_STYLES = {
  cours: { bar: 'bg-[#005989]', bg: 'bg-[#005989]/10 border-[#005989]/25', text: 'text-[#005989]', label: 'Cours'  },
  tp:    { bar: 'bg-[#8a9a0a]', bg: 'bg-[#c8d45d]/25 border-[#c8d45d]/40', text: 'text-[#5a6a00]', label: 'TP'    },
  td:    { bar: 'bg-[#d4a000]', bg: 'bg-[#f5c845]/20 border-[#f5c845]/40', text: 'text-[#7a5c00]', label: 'TD'    },
  exam:  { bar: 'bg-red-500',   bg: 'bg-red-50 border-red-200',             text: 'text-red-700',   label: 'Exam'  },
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const toast   = useToast();
  const confirm = useConfirm();

  const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: sessions, refetch }     = useWeekSessions(weekStart);
  const { data: groupes }               = useGroupes();
  const { data: intervenants }          = useIntervenants();
  const [modules, setModules]           = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [defaultSlot, setDefaultSlot]   = useState(null);
  const [activeNiveau, setActiveNiveau] = useState('');

  const weekDays = DAYS.map((_, i) => addDays(weekStart, i));

  const niveaux = [...new Set(groupes.map(g => g.niveau).filter(Boolean))]
    .sort((a, b) => {
      const ai = NIVEAU_ORDER.indexOf(a);
      const bi = NIVEAU_ORDER.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  useEffect(() => {
    if (niveaux.length > 0 && !activeNiveau) setActiveNiveau(niveaux[0]);
  }, [niveaux.join(',')]);

  const fetchModules = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'modules'), orderBy('code', 'asc')));
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setModules(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const handleSave = async (data) => {
    try {
      if (editing?.id) {
        await sessionsService.update(editing.id, data);
        toast.success('Séance modifiée');
      } else {
        await sessionsService.create(data);
        toast.success('Séance créée');
      }
      setShowForm(false); setEditing(null); setDefaultSlot(null);
      refetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleMove = async (sessionId, newDateStr, newSlot, newGroupeId) => {
    try {
      await sessionsService.update(sessionId, {
        date: newDateStr,
        heureDebut: newSlot.start,
        heureFin: newSlot.end,
        ...(newGroupeId && { groupeId: newGroupeId }),
      });
      refetch();
    } catch (err) {
      toast.error('Erreur déplacement : ' + err.message);
    }
  };

  const handleDelete = async (id, module) => {
    const ok = await confirm({ title: 'Supprimer cette séance ?', message: `"${module}" sera supprimée.`, danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try { await sessionsService.delete(id); refetch(); toast.success('Séance supprimée'); }
    catch (err) { toast.error('Erreur : ' + err.message); }
  };

  const openAdd = (date, slot, groupeId) => {
    setEditing(null);
    setDefaultSlot(date && slot ? { date: format(date, 'yyyy-MM-dd'), heureDebut: slot.start, heureFin: slot.end, groupeId } : null);
    setShowForm(true);
  };

  const currentGroupes = groupes.filter(g => g.niveau === activeNiveau);

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planning / EDT</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Semaine du{' '}
            <span className="font-semibold text-[#005989]">{format(weekStart, 'dd MMMM', { locale: fr })}</span>
            {' '}au{' '}
            <span className="font-semibold text-[#005989]">{format(addDays(weekStart, 6), 'dd MMMM yyyy', { locale: fr })}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-[#005989] transition-colors border-r border-slate-100 text-sm">
              ←
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-4 py-2 text-sm font-semibold text-[#005989] hover:bg-blue-50 transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-[#005989] transition-colors border-l border-slate-100 text-sm">
              →
            </button>
          </div>
          <button onClick={() => openAdd(null, null, null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] hover:bg-[#004a73] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
            + Ajouter séance
          </button>
        </div>
      </div>

      {/* Niveau tabs */}
      {niveaux.length > 0 && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
          {niveaux.map(n => (
            <button key={n} onClick={() => setActiveNiveau(n)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeNiveau === n ? 'bg-white text-[#005989] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {Object.entries(TYPE_STYLES).map(([type, s]) => (
          <span key={type} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        ))}
        <span className="text-slate-400 ml-2">• Glissez-déposez pour déplacer une séance • Clic sur + pour en créer une</span>
      </div>

      {/* EDT Grid */}
      {activeNiveau ? (
        currentGroupes.length > 0 ? (
          <EDTGrid
            groupes={currentGroupes}
            sessions={sessions}
            weekDays={weekDays}
            modules={modules}
            intervenants={intervenants}
            onAdd={openAdd}
            onEdit={s => { setEditing(s); setShowForm(true); }}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-slate-600 font-semibold">Aucun groupe pour le niveau "{activeNiveau}"</p>
            <p className="text-slate-400 text-sm mt-1">Créez des groupes avec ce niveau dans la gestion des groupes.</p>
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-400 text-sm">Aucun groupe avec un niveau défini.</p>
        </div>
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

// ── EDT Grid ──────────────────────────────────────────────────────────────────
function EDTGrid({ groupes, sessions, weekDays, modules, intervenants, onAdd, onEdit, onMove, onDelete }) {
  const [dragId,   setDragId]   = useState(null);
  const [dropCell, setDropCell] = useState(null); // { groupeId, di, si }

  const getModuleName = (id) => {
    const m = modules.find(x => x.id === id);
    return m ? m.nom : (id || '—');
  };
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : null;
  };
  const getSession = (groupeId, di, si) => {
    const slot = DAY_SLOTS[di]?.[si];
    if (!slot) return null;
    const dayStr = format(weekDays[di], 'yyyy-MM-dd');
    return sessions.find(s =>
      s.groupeId === groupeId &&
      s.heureDebut === slot.start &&
      format(new Date(s.date), 'yyyy-MM-dd') === dayStr
    ) || null;
  };

  const onDragStart = (e, session) => {
    setDragId(session.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', session.id);
  };
  const onDragOver = (e, groupeId, di, si) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropCell({ groupeId, di, si });
  };
  const onDrop = (e, groupeId, di, si) => {
    e.preventDefault();
    const sid = e.dataTransfer.getData('text/plain');
    const slot = DAY_SLOTS[di]?.[si];
    if (sid && slot) {
      onMove(sid, format(weekDays[di], 'yyyy-MM-dd'), slot, groupeId);
    }
    setDragId(null); setDropCell(null);
  };
  const onDragEnd = () => { setDragId(null); setDropCell(null); };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
      <table className="border-collapse text-xs" style={{ minWidth: `${160 + 7 * 130}px`, width: '100%' }}>
        {/* Day headers */}
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-[#001829] text-white px-3 py-3 text-left text-xs font-semibold w-40 border-r border-white/10">
              Groupe / Créneau
            </th>
            {weekDays.map((day, di) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <th key={di} className={`px-2 py-3 text-center font-semibold border-r border-white/10 ${isToday ? 'bg-[#005989]' : 'bg-[#001829]'} text-white`}>
                  <div className="font-bold text-xs">{DAYS[di]}</div>
                  <div className="text-[10px] opacity-60 font-normal mt-0.5">{format(day, 'dd/MM')}</div>
                  {isToday && <div className="w-1.5 h-1.5 bg-[#f5c845] rounded-full mx-auto mt-1" />}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {groupes.map((groupe, gi) => (
            <>
              {/* Group header */}
              <tr key={`gh-${groupe.id}`}>
                <td colSpan={8}
                  className="sticky left-0 z-10 px-3 py-2 bg-[#005989]/8 border-t-2 border-[#005989]/30">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#005989] text-xs">{groupe.nom}</span>
                    {groupe.filiere && <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{groupe.filiere}</span>}
                    {groupe.effectif && <span className="text-slate-400 text-[10px]">{groupe.effectif} étudiants</span>}
                  </div>
                </td>
              </tr>

              {/* Slot rows */}
              {Array.from({ length: MAX_SLOTS }, (_, si) => (
                <tr key={`${groupe.id}-${si}`} className="border-b border-slate-100">
                  {/* Slot label (sticky) */}
                  <td className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-3 py-1.5 whitespace-nowrap">
                    <span className="text-[10px] font-bold text-[#005989] bg-[#005989]/10 px-1.5 py-0.5 rounded">C{si + 1}</span>
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, di) => {
                    const slot     = DAY_SLOTS[di]?.[si];
                    const session  = slot ? getSession(groupe.id, di, si) : null;
                    const isActive = !!slot;
                    const isDrop   = dropCell?.groupeId === groupe.id && dropCell?.di === di && dropCell?.si === si;
                    const isDrag   = session && dragId === session.id;

                    if (!isActive) {
                      return (
                        <td key={di} className="px-1 py-1 bg-slate-50/60 border-r border-slate-100">
                          <div className="h-14 rounded-lg bg-slate-100/50" />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={di}
                        className={`px-1 py-1 align-top border-r border-slate-100 transition-colors ${isDrop && !session ? 'bg-[#005989]/8' : 'bg-white'}`}
                        onDragOver={e => onDragOver(e, groupe.id, di, si)}
                        onDrop={e => onDrop(e, groupe.id, di, si)}
                        onDragLeave={() => setDropCell(null)}
                      >
                        <div className="text-[9px] text-slate-300 font-mono text-center mb-0.5">
                          {slot.start}–{slot.end}
                        </div>

                        {session ? (
                          <SessionCard
                            session={session}
                            moduleName={getModuleName(session.module)}
                            intervenantName={getIntervenantName(session.intervenantId)}
                            isDragging={isDrag}
                            onDragStart={e => onDragStart(e, session)}
                            onDragEnd={onDragEnd}
                            onEdit={() => onEdit(session)}
                            onDelete={() => onDelete(session.id, session.module)}
                          />
                        ) : (
                          <div
                            onClick={() => onAdd(day, slot, groupe.id)}
                            onDragOver={e => onDragOver(e, groupe.id, di, si)}
                            className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                              isDrop
                                ? 'border-[#005989] bg-[#005989]/10 text-[#005989]'
                                : 'border-slate-200 text-slate-200 hover:border-[#005989]/50 hover:text-[#005989]/50 hover:bg-[#005989]/4'
                            }`}
                          >
                            <span className="text-xl font-light">+</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session, moduleName, intervenantName, isDragging, onDragStart, onDragEnd, onEdit, onDelete }) {
  const s = TYPE_STYLES[session.type] || TYPE_STYLES.cours;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-xl border p-1.5 cursor-grab active:cursor-grabbing group transition-all ${s.bg} ${isDragging ? 'opacity-30 scale-95' : 'hover:shadow-md'}`}
    >
      <div className="flex gap-1 items-start">
        <div className={`shrink-0 w-1 rounded-full self-stretch min-h-[36px] ${s.bar}`} />
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-[10px] leading-tight truncate ${s.text}`}>{moduleName}</div>
          {intervenantName && (
            <div className="text-slate-500 text-[9px] truncate mt-0.5">{intervenantName}</div>
          )}
          {session.salle && (
            <div className="text-slate-400 text-[9px] mt-0.5">🏫 {session.salle}</div>
          )}
        </div>
        <div className="shrink-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            title="Modifier"
            className="w-4 h-4 rounded text-slate-400 hover:text-[#005989] hover:bg-white/80 flex items-center justify-center transition-colors text-[10px]">
            ✏
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Supprimer"
            className="w-4 h-4 rounded text-slate-400 hover:text-red-500 hover:bg-white/80 flex items-center justify-center transition-colors text-[10px]">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
