import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { sessionsService } from '../../services/firestore';
import SessionForm from './SessionForm';
import PlanningAutoModal from './PlanningAutoModal';
import PlanningNotificationModal from '../Notifications/PlanningNotificationModal';
import CalendrierAcademique from './CalendrierAcademique';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// ── Créneaux horaires par jour (0=Lun … 6=Dim) ───────────────────────────────
export const DAY_SLOTS = [
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }],
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '14:15', end: '15:45' }, { start: '16:00', end: '17:30' }],
  [{ start: '09:00', end: '11:00' }, { start: '11:15', end: '13:15' }, { start: '14:15', end: '17:30' }],
  [{ start: '09:00', end: '13:00' }],
];

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MAX_SLOTS = Math.max(...DAY_SLOTS.map(d => d.length));

export const TYPE_STYLES = {
  cours:     { bar: '#005989', bg: 'rgba(0,89,137,0.09)',   border: 'rgba(0,89,137,0.22)',  text: '#005989', label: 'Cours'     },
  tp:        { bar: '#5a6a00', bg: 'rgba(90,106,0,0.09)',   border: 'rgba(90,106,0,0.22)',  text: '#5a6a00', label: 'TP'        },
  td:        { bar: '#b48200', bg: 'rgba(180,130,0,0.09)',  border: 'rgba(180,130,0,0.22)', text: '#8a5f00', label: 'TD'        },
  exam:      { bar: '#dc2626', bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.22)', text: '#dc2626', label: 'Examen'    },
  efm:       { bar: '#ea580c', bg: 'rgba(234,88,12,0.08)',  border: 'rgba(234,88,12,0.22)', text: '#c2410c', label: 'EFM'       },
  eff:       { bar: '#9f1239', bg: 'rgba(159,18,57,0.08)',  border: 'rgba(159,18,57,0.22)', text: '#9f1239', label: 'EFF'       },
  cc:        { bar: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', text: '#6d28d9', label: 'CC'        },
  seminaire: { bar: '#0d9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.2)', text: '#0a7a70', label: 'Séminaire' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeToHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function isVacance(date, vacances) {
  const ds = format(date, 'yyyy-MM-dd');
  return vacances.find(v => ds >= v.debut && ds <= v.fin) || null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const toast   = useToast();
  const confirm = useConfirm();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: groupes }         = useGroupes();
  const { data: intervenants, refetch: refetchIntervenants } = useIntervenants();

  const [activeGroupId, setActiveGroupId] = useState('');
  const [sessions, setSessions]           = useState([]);   // active group, this week
  const [allSessions, setAllSessions]     = useState([]);   // all groups, this week (conflict check)
  const [modules, setModules]             = useState([]);
  const [affectations, setAffectations]   = useState([]);
  const [allGroupSessions, setAllGroupSessions] = useState([]); // all weeks, active group (for progress)
  const [vacances, setVacances]           = useState([]);
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState(null);
  const [defaultSlot, setDefaultSlot]     = useState(null);
  const [showNotify, setShowNotify]       = useState(false);
  const [showAuto, setShowAuto]           = useState(false);
  const [activeTab, setActiveTab]         = useState('planning'); // 'planning' | 'calendrier'

  const weekDays = useMemo(() => DAYS.map((_, i) => addDays(weekStart, i)), [weekStart]);

  // Deduplicate groupes by id (guard against duplicate Firestore docs)
  const uniqueGroupes = useMemo(() => {
    const seen = new Set();
    return groupes.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; });
  }, [groupes]);

  // Init: pick first group
  useEffect(() => {
    if (groupes.length > 0 && !activeGroupId) {
      setActiveGroupId(groupes[0].id);
    }
  }, [groupes, activeGroupId]);

  // Fetch vacances once
  useEffect(() => {
    getDocs(collection(db, 'vacances'))
      .then(snap => {
        const v = [];
        snap.forEach(d => v.push({ id: d.id, ...d.data() }));
        setVacances(v);
      })
      .catch(() => {});
  }, []);

  // Fetch modules once
  useEffect(() => {
    getDocs(query(collection(db, 'modules'), orderBy('code', 'asc')))
      .then(snap => {
        const m = [];
        snap.forEach(d => m.push({ id: d.id, ...d.data() }));
        setModules(m);
      })
      .catch(() => {});
  }, []);

  // Fetch week sessions: active group + all groups (for conflict detection)
  // Sessions may be stored with Timestamp dates (sessionsService.create) OR string dates (legacy).
  // We run two queries and merge to handle both cases.
  const fetchWeekSessions = useCallback(async () => {
    if (!weekStart) return;
    const dateFrom = format(weekStart, 'yyyy-MM-dd');
    const dateTo   = format(addDays(weekStart, 6), 'yyyy-MM-dd');

    const tsStart = new Date(weekStart); tsStart.setHours(0, 0, 0, 0);
    const tsEnd   = new Date(weekStart); tsEnd.setDate(tsEnd.getDate() + 7); tsEnd.setHours(23, 59, 59, 999);

    const toJsDate = (v) => {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (v?.toDate) return v.toDate();
      return new Date(v);
    };

    const seen = new Set();
    const all  = [];

    const push = (snap) => {
      snap.forEach(d => {
        if (seen.has(d.id)) return;
        seen.add(d.id);
        const data = d.data();
        const dateVal = toJsDate(data.date);
        if (!dateVal) return;
        const dateStr = format(dateVal, 'yyyy-MM-dd');
        if (dateStr >= dateFrom && dateStr <= dateTo) {
          all.push({ id: d.id, ...data, date: dateVal });
        }
      });
    };

    try {
      // Query 1: Timestamp-stored sessions (normal path via sessionsService.create)
      const snap1 = await getDocs(
        query(collection(db, 'sessions'),
          where('date', '>=', Timestamp.fromDate(tsStart)),
          where('date', '<=', Timestamp.fromDate(tsEnd)))
      );
      push(snap1);

      // Query 2: String-stored sessions (legacy or imported data)
      const snap2 = await getDocs(
        query(collection(db, 'sessions'),
          where('date', '>=', dateFrom),
          where('date', '<=', dateTo))
      );
      push(snap2);

      setAllSessions(all);
      setSessions(all.filter(s => s.groupeId === activeGroupId));
    } catch { /* silent */ }
  }, [weekStart, activeGroupId]);

  useEffect(() => { fetchWeekSessions(); }, [fetchWeekSessions]);

  // Fetch affectations for active group (for module sidebar)
  useEffect(() => {
    if (!activeGroupId) return;
    getDocs(query(collection(db, 'affectations'), where('groupeId', '==', activeGroupId)))
      .then(snap => {
        const a = [];
        snap.forEach(d => a.push({ id: d.id, ...d.data() }));
        setAffectations(a);
      })
      .catch(() => {});
  }, [activeGroupId]);

  // Fetch all sessions for active group (any week, for hours-done progress)
  useEffect(() => {
    if (!activeGroupId) return;
    getDocs(query(collection(db, 'sessions'), where('groupeId', '==', activeGroupId)))
      .then(snap => {
        const s = [];
        snap.forEach(d => s.push({ id: d.id, ...d.data() }));
        setAllGroupSessions(s);
      })
      .catch(() => {});
  }, [activeGroupId]);

  // Conflict detection: same intervenant, same day+slot, different groups
  const conflictedSessionIds = useMemo(() => {
    const ids = new Set();
    const key = s => `${s.date}_${s.heureDebut}_${s.intervenantId}`;
    const byKey = {};
    allSessions.forEach(s => {
      if (!s.intervenantId) return;
      const k = key(s);
      if (!byKey[k]) byKey[k] = [];
      byKey[k].push(s.id);
    });
    Object.values(byKey).forEach(group => {
      if (group.length > 1) group.forEach(id => ids.add(id));
    });
    return ids;
  }, [allSessions]);

  // Module progress
  const moduleProgress = useMemo(() => {
    const progress = {};
    affectations.forEach(a => {
      const mod = modules.find(m => m.id === a.moduleId);
      if (!mod) return;
      progress[a.moduleId] = {
        nom: mod.nom,
        total: a.masseHoraire || 0,
        done: 0,
      };
    });
    allGroupSessions.forEach(s => {
      const mid = s.moduleId || s.module;
      if (progress[mid]) {
        progress[mid].done += timeToHours(s.heureDebut, s.heureFin);
      }
    });
    return Object.values(progress);
  }, [affectations, modules, allGroupSessions]);

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
      fetchWeekSessions();
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
      fetchWeekSessions();
    } catch (err) {
      toast.error('Erreur déplacement : ' + err.message);
    }
  };

  const handleDelete = async (id, moduleName) => {
    const ok = await confirm({ title: 'Supprimer cette séance ?', message: `"${moduleName}" sera supprimée.`, danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try { await sessionsService.delete(id); fetchWeekSessions(); toast.success('Séance supprimée'); }
    catch (err) { toast.error('Erreur : ' + err.message); }
  };

  const handleDuplicateWeek = async () => {
    const groupeSessions = sessions.filter(s => s.groupeId === activeGroupId);
    if (groupeSessions.length === 0) {
      toast.error('Aucune séance à dupliquer pour ce groupe cette semaine.');
      return;
    }
    const nextWeek   = addWeeks(weekStart, 1);
    const nextEnd    = addDays(nextWeek, 6);
    const weekLabel  = `${format(nextWeek, 'dd/MM', { locale: fr })} – ${format(nextEnd, 'dd/MM/yyyy', { locale: fr })}`;
    const activeGroupe = groupes.find(g => g.id === activeGroupId);

    // Count sessions that would be skipped (holidays)
    const skippedByHoliday = groupeSessions.filter(s => {
      const origDate = new Date(s.date);
      const newDate  = addWeeks(origDate, 1);
      return !!isVacance(newDate, vacances);
    });

    const ok = await confirm({
      title: 'Dupliquer vers S+1',
      message: `${groupeSessions.length} séance(s) du groupe ${activeGroupe?.nom || ''} seront copiées sur la semaine du ${weekLabel}.${skippedByHoliday.length > 0 ? ` ${skippedByHoliday.length} séance(s) ignorée(s) (jour férié/vacances).` : ''}`,
      confirmLabel: 'Dupliquer',
    });
    if (!ok) return;

    let created = 0;
    try {
      for (const s of groupeSessions) {
        const origDate = new Date(s.date);
        const newDate  = addWeeks(origDate, 1);
        if (isVacance(newDate, vacances)) continue; // skip holidays
        const newDateStr = format(newDate, 'yyyy-MM-dd');
        await sessionsService.create({
          groupeId: s.groupeId,
          moduleId: s.moduleId || s.module,
          intervenantId: s.intervenantId || '',
          date: newDateStr,
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          type: s.type || 'cours',
          salle: s.salle || '',
          note: s.note || '',
          statut: 'planifiee',
        });
        created++;
      }
      toast.success(`${created} séance(s) dupliquée(s) → semaine du ${weekLabel}.`);
      setWeekStart(nextWeek);
    } catch (err) {
      toast.error('Erreur duplication : ' + err.message);
    }
  };

  const openAdd = (date, slot, groupeId) => {
    setEditing(null);
    setDefaultSlot(date && slot ? { date: format(date, 'yyyy-MM-dd'), heureDebut: slot.start, heureFin: slot.end, groupeId } : null);
    setShowForm(true);
  };

  // Conflicts count for banner
  const conflictsThisGroup = sessions.filter(s => conflictedSessionIds.has(s.id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-white border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>Planning / EDT</h1>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
            <button onClick={() => setActiveTab('planning')}
              className={`px-3 py-1 transition-colors ${activeTab === 'planning' ? 'bg-[#005989] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              Planning
            </button>
            <button onClick={() => setActiveTab('calendrier')}
              className={`px-3 py-1 transition-colors border-l border-slate-200 ${activeTab === 'calendrier' ? 'bg-[#005989] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              📅 Calendrier
            </button>
          </div>
        </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sem. du{' '}
            <span className="font-semibold text-[#005989]">{format(weekStart, 'dd MMMM', { locale: fr })}</span>
            {' '}au{' '}
            <span className="font-semibold text-[#005989]">{format(addDays(weekStart, 6), 'dd MMMM yyyy', { locale: fr })}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week navigation */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-[#005989] transition-colors border-r border-slate-100 text-sm">←</button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-3 py-2 text-xs font-semibold text-[#005989] hover:bg-blue-50 transition-colors">Aujourd'hui</button>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
              className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-[#005989] transition-colors border-l border-slate-100 text-sm">→</button>
          </div>
          <button onClick={handleDuplicateWeek}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors">
            ⧉ Dupliquer S+1
          </button>
          <button onClick={() => setShowNotify(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#005989] text-[#005989] hover:bg-[#005989]/5 rounded-xl text-xs font-semibold transition-colors">
            ✉ Notifier
          </button>
          <button onClick={() => setShowAuto(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-400 text-amber-700 hover:bg-amber-50 rounded-xl text-xs font-semibold transition-colors"
            title="Planification automatique intelligente">
            ⚡ Auto
          </button>
          <button onClick={() => openAdd(null, null, activeGroupId)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#005989] hover:bg-[#004a73] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors">
            + Séance
          </button>
        </div>
      </div>

      {/* ── Group selector ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto flex-shrink-0">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">Groupe</span>
        {uniqueGroupes.map(g => (
          <button key={g.id} onClick={() => setActiveGroupId(g.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeGroupId === g.id
                ? 'bg-[#001829] border-[#001829] text-white'
                : 'border-slate-200 text-slate-500 hover:border-[#005989] hover:text-[#005989] bg-white'
            }`}>
            {g.nom}
            {g.filiere && <span className={`text-[10px] font-normal ${activeGroupId === g.id ? 'opacity-50' : 'text-slate-400'}`}>{g.filiere}</span>}
          </button>
        ))}
        {conflictsThisGroup > 0 && (
          <div className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
            ⚠ {conflictsThisGroup} conflit{conflictsThisGroup > 1 ? 's' : ''} intervenant
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      {activeTab === 'calendrier' ? (
        <div className="flex-1 overflow-auto p-4">
          <CalendrierAcademique />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Grid area */}
          <div className="flex-1 overflow-auto p-3 min-w-0">
            {activeGroupId ? (
              <TimelineGrid
                groupe={groupes.find(g => g.id === activeGroupId)}
                sessions={sessions}
                weekDays={weekDays}
                modules={modules}
                intervenants={intervenants}
                vacances={vacances}
                conflictedIds={conflictedSessionIds}
                onAdd={openAdd}
                onEdit={s => { setEditing(s); setShowForm(true); }}
                onMove={handleMove}
                onDelete={handleDelete}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Sélectionnez un groupe
              </div>
            )}
          </div>

          {/* Sidebar */}
          <ModuleSidebar
            moduleProgress={moduleProgress}
            activeGroupe={groupes.find(g => g.id === activeGroupId)}
          />
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
          onIntervenantCreated={refetchIntervenants}
        />
      )}

      {showNotify && (
        <PlanningNotificationModal
          db={db}
          sessions={sessions}
          intervenants={intervenants}
          modules={modules}
          groupes={groupes}
          weekStart={weekStart}
          onClose={() => setShowNotify(false)}
        />
      )}

      {showAuto && (
        <PlanningAutoModal
          modules={modules}
          groupes={groupes}
          intervenants={intervenants}
          onClose={() => setShowAuto(false)}
          onCreated={() => { fetchWeekSessions(); }}
        />
      )}
    </div>
  );
}

// ── Timeline Grid (Option A — axe horaire vertical) ───────────────────────────
function TimelineGrid({ groupe, sessions, weekDays, modules, intervenants, vacances, conflictedIds, onAdd, onEdit, onMove, onDelete }) {
  const [dragId,    setDragId]    = useState(null);
  const [dropSlot,  setDropSlot]  = useState(null); // { di, si }

  const START_MIN  = 8 * 60;       // 08:00
  const END_MIN    = 17 * 60 + 30; // 17:30
  const SCALE      = 1.4;          // px per minute
  const TOTAL_H    = (END_MIN - START_MIN) * SCALE; // 798px
  const DISPLAY_DAYS = 6;

  const toMin     = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const slotTop   = slot => (toMin(slot.start) - START_MIN) * SCALE;
  const slotH     = slot => (toMin(slot.end) - toMin(slot.start)) * SCALE;

  const toJsDate = v => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.toDate) return v.toDate();
    return new Date(v);
  };

  const getModuleName  = id => modules.find(x => x.id === id)?.nom || id || '—';
  const getIntervenant = id => { const i = intervenants.find(x => x.id === id); return i ? `${i.prenom} ${i.nom}` : null; };

  const getSlotSession = (di, slot) => {
    if (!slot || !groupe) return null;
    const dayStr = format(weekDays[di], 'yyyy-MM-dd');
    return sessions.find(s => {
      if (s.groupeId !== groupe.id) return false;
      if (s.heureDebut !== slot.start) return false;
      const d = toJsDate(s.date);
      return d && format(d, 'yyyy-MM-dd') === dayStr;
    }) || null;
  };

  const onDragStart = (e, session) => {
    setDragId(session.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', session.id);
  };
  const onDragOverSlot = (e, di, si) => { e.preventDefault(); setDropSlot({ di, si }); };
  const onDropSlot     = (e, di, si) => {
    e.preventDefault();
    const sid  = e.dataTransfer.getData('text/plain');
    const slot = DAY_SLOTS[di]?.[si];
    if (sid && slot) onMove(sid, format(weekDays[di], 'yyyy-MM-dd'), slot, groupe?.id);
    setDragId(null); setDropSlot(null);
  };
  const onDragEnd = () => { setDragId(null); setDropSlot(null); };

  // Time markers every 30 min for the axis
  const timeMarkers = [];
  for (let m = START_MIN; m <= END_MIN; m += 30) timeMarkers.push(m);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 620 }}>

        {/* ── Header row ── */}
        <div style={{ display: 'flex', borderRadius: '10px 10px 0 0', overflow: 'hidden' }}>
          <div style={{ width: 54, flexShrink: 0, background: '#001829', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: 'Outfit,sans-serif' }}>H</span>
          </div>
          {weekDays.slice(0, DISPLAY_DAYS).map((day, di) => {
            const vac   = isVacance(day, vacances);
            const today = day.toDateString() === new Date().toDateString();
            return (
              <div key={di} style={{
                flex: 1, padding: '10px 6px', textAlign: 'center',
                background: vac ? '#3a3a3a' : today ? '#005989' : '#001829',
                borderRight: di < DISPLAY_DAYS - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, fontWeight: 700, color: vac ? 'rgba(255,255,255,0.35)' : '#fff', letterSpacing: '0.3px' }}>
                  {DAYS[di]}
                </div>
                <div style={{ fontSize: 10, color: today ? 'rgba(245,200,69,0.75)' : 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                  {format(day, 'dd/MM')}
                </div>
                {vac && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontStyle: 'italic', lineHeight: 1.2 }}>{vac.label?.replace('⚠ prévisionnel', '').trim()}</div>}
                {today && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f5c845', margin: '3px auto 0' }} />}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div style={{
          display: 'flex', background: '#fff',
          border: '1px solid #e2e8f0', borderTop: 'none',
          borderRadius: '0 0 10px 10px', overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          {/* Time axis */}
          <div style={{ width: 54, flexShrink: 0, background: '#f8fafc', borderRight: '1px solid #e2e8f0', position: 'relative', height: TOTAL_H }}>
            {timeMarkers.map(m => {
              const top     = (m - START_MIN) * SCALE;
              const isHour  = m % 60 === 0;
              const hh      = Math.floor(m / 60);
              const mm      = m % 60 === 0 ? '00' : '30';
              return (
                <div key={m} style={{ position: 'absolute', top, left: 0, right: 0 }}>
                  <div style={{ position: 'absolute', right: 6, top: 0, transform: 'translateY(-50%)', fontSize: isHour ? 9.5 : 8, fontWeight: isHour ? 700 : 500, color: isHour ? '#64748b' : '#b0bec5', fontVariantNumeric: 'tabular-nums', fontFamily: 'Outfit,sans-serif', whiteSpace: 'nowrap' }}>
                    {hh}h{mm === '00' ? '' : mm}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {weekDays.slice(0, DISPLAY_DAYS).map((day, di) => {
            const vac   = isVacance(day, vacances);
            const slots = DAY_SLOTS[di] || [];

            return (
              <div key={di} style={{
                flex: 1, position: 'relative', height: TOTAL_H,
                borderRight: di < DISPLAY_DAYS - 1 ? '1px solid #e2e8f0' : 'none',
                background: vac ? 'repeating-linear-gradient(-45deg,#f1f5f9,#f1f5f9 4px,#e8edf4 4px,#e8edf4 8px)' : '#fff',
              }}>
                {/* Hour grid lines */}
                {timeMarkers.map(m => (
                  <div key={m} style={{ position: 'absolute', top: (m - START_MIN) * SCALE, left: 0, right: 0, borderTop: m % 60 === 0 ? '1px solid #dde3ea' : '1px solid #f1f5f9', pointerEvents: 'none' }} />
                ))}

                {/* Slot zones */}
                {!vac && slots.map((slot, si) => {
                  const session = getSlotSession(di, slot);
                  const top     = slotTop(slot);
                  const h       = slotH(slot);
                  const isDrop  = dropSlot?.di === di && dropSlot?.si === si;
                  const isDrag  = session && dragId === session.id;
                  return (
                    <div key={si} style={{ position: 'absolute', top, left: 4, right: 4, height: h }}
                      onDragOver={e => onDragOverSlot(e, di, si)}
                      onDrop={e => onDropSlot(e, di, si)}
                      onDragLeave={() => setDropSlot(null)}
                    >
                      {session ? (
                        <TLSessionCard
                          session={session}
                          moduleName={getModuleName(session.moduleId || session.module)}
                          intervenantName={getIntervenant(session.intervenantId)}
                          isConflict={conflictedIds.has(session.id)}
                          isDragging={isDrag}
                          height={h}
                          onDragStart={e => onDragStart(e, session)}
                          onDragEnd={onDragEnd}
                          onEdit={() => onEdit(session)}
                          onDelete={() => onDelete(session.id, getModuleName(session.moduleId || session.module))}
                        />
                      ) : (
                        <div
                          onClick={() => onAdd(day, slot, groupe?.id)}
                          onDragOver={e => onDragOverSlot(e, di, si)}
                          style={{
                            height: '100%', borderRadius: 7,
                            border: isDrop ? '2px solid #005989' : '1.5px dashed #d1dae5',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', gap: 2,
                            color: isDrop ? '#005989' : '#c8d4e0',
                            background: isDrop ? 'rgba(0,89,137,0.06)' : 'rgba(248,250,252,0.6)',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,89,137,0.35)'; e.currentTarget.style.color = 'rgba(0,89,137,0.45)'; e.currentTarget.style.background = 'rgba(0,89,137,0.03)'; }}
                          onMouseLeave={e => { if (!isDrop) { e.currentTarget.style.borderColor = '#d1dae5'; e.currentTarget.style.color = '#c8d4e0'; e.currentTarget.style.background = 'rgba(248,250,252,0.6)'; } }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 300, lineHeight: 1 }}>+</span>
                          <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.2px', fontFamily: 'Outfit,sans-serif' }}>{slot.start}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 2 }}>
          {Object.entries(TYPE_STYLES).map(([type, s]) => (
            <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontSize: 10.5, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.bar, flexShrink: 0 }} />
              {s.label}
            </span>
          ))}
          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4, alignSelf: 'center' }}>· Glissez pour déplacer · Clic + pour créer</span>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Session Card ──────────────────────────────────────────────────────
function TLSessionCard({ session, moduleName, intervenantName, isConflict, isDragging, height, onDragStart, onDragEnd, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const s = TYPE_STYLES[session.type] || TYPE_STYLES.cours;
  const compact = height < 90;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: '100%', borderRadius: 7,
        border: `1px solid ${isConflict ? 'rgba(220,38,38,0.35)' : s.border}`,
        background: isConflict ? 'rgba(220,38,38,0.06)' : s.bg,
        display: 'flex', cursor: 'grab',
        opacity: isDragging ? 0.25 : 1,
        transition: 'box-shadow 0.12s, transform 0.1s',
        boxShadow: hovered ? '0 4px 14px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'scaleX(1.015)' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{ width: 4, background: isConflict ? '#dc2626' : s.bar, flexShrink: 0, borderRadius: '6px 0 0 6px' }} />
      {/* Content */}
      <div style={{ flex: 1, padding: compact ? '4px 6px' : '6px 8px 5px', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isConflict ? '#dc2626' : s.text, fontFamily: 'Outfit,sans-serif', marginBottom: 2, opacity: 0.75 }}>
          {(TYPE_STYLES[session.type] || TYPE_STYLES.cours).label}{isConflict && ' · ⚠ Conflit'}
        </div>
        <div style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: isConflict ? '#dc2626' : s.text, lineHeight: 1.25, fontFamily: 'Outfit,sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: compact ? 1 : 2, WebkitBoxOrient: 'vertical' }}>
          {moduleName}
        </div>
        {!compact && intervenantName && (
          <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 3, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {intervenantName}
          </div>
        )}
        {!compact && session.salle && (
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {session.salle}
          </div>
        )}
        {!compact && (
          <div style={{ fontSize: 8.5, color: s.text, opacity: 0.45, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            {session.heureDebut}–{session.heureFin}
          </div>
        )}
      </div>
      {/* Hover actions */}
      {hovered && (
        <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 2, zIndex: 3 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            title="Modifier">✏</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            title="Supprimer">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Module Sidebar ────────────────────────────────────────────────────────────
function ModuleSidebar({ moduleProgress, activeGroupe }) {
  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      background: '#fff',
      borderLeft: '1px solid #e2e8f0',
      overflowY: 'auto',
      padding: '12px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>
          Modules planifiés
        </span>
        {activeGroupe && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#005989', background: 'rgba(0,89,137,0.09)', padding: '2px 6px', borderRadius: 4 }}>
            {activeGroupe.nom}
          </span>
        )}
      </div>

      {moduleProgress.length === 0 ? (
        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          Aucune affectation pour ce groupe
        </p>
      ) : (
        moduleProgress.map((m, i) => {
          const pct  = m.total > 0 ? Math.min(100, Math.round((m.done / m.total) * 100)) : 0;
          const done = pct >= 100;
          const med  = pct >= 60;
          const barColor = done ? '#16a34a' : med ? '#005989' : '#d97706';
          const pctColor = done ? '#16a34a' : med ? '#005989' : '#d97706';
          return (
            <div key={i} style={{ marginBottom: 8, padding: '7px 8px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e8edf4' }}>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 10.5, fontWeight: 600, color: '#0f172a', marginBottom: 4, lineHeight: 1.3 }}>
                {m.nom}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  {m.done.toFixed(1)}h / {m.total}h
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: pctColor, fontVariantNumeric: 'tabular-nums' }}>
                  {done ? '✓ ' : ''}{pct}%
                </span>
              </div>
              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          );
        })
      )}

      <div style={{ marginTop: 12, padding: '8px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e8edf4' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Outfit,sans-serif' }}>Légende</div>
        {Object.entries(TYPE_STYLES).map(([type, s]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.bar, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#475569' }}>{s.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'repeating-linear-gradient(-45deg,#cbd5e1,#cbd5e1 2px,#e8edf4 2px,#e8edf4 4px)', flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#475569' }}>Férié / Vacances</span>
        </div>
      </div>
    </div>
  );
}
