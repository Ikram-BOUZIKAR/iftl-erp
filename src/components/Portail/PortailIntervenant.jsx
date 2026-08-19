import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { presencesService, studentsService } from '../../services/firestore';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '../UI/Toast';

const BLUE = '#005989';

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoCal()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
function IcoPen()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>; }
function IcoUser()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>; }
function IcoLogout() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }
function IcoMenu()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function IcoClose()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>; }

const TABS = [
  { id: 'planning',    label: 'Mon Planning',  short: 'Planning',    Icon: IcoCal  },
  { id: 'emargement', label: 'Émargement',     short: 'Émarger',     Icon: IcoPen  },
  { id: 'profil',     label: 'Mon Profil',     short: 'Profil',      Icon: IcoUser },
];

const TYPE_COLOR = {
  cours:     'bg-[#005989] text-white',
  tp:        'bg-[#8a9a0a] text-white',
  td:        'bg-[#d4a000] text-white',
  exam:      'bg-red-500 text-white',
  efm:       'bg-orange-500 text-white',
  eff:       'bg-rose-700 text-white',
  cc:        'bg-violet-500 text-white',
  seminaire: 'bg-teal-500 text-white',
};

const STATUT_BTN = [
  { value: 'present',             short: 'P',   cls: 'bg-emerald-500 text-white' },
  { value: 'retard',              short: 'R',   cls: 'bg-amber-500 text-white'   },
  { value: 'absent_justifie',     short: 'AJ',  cls: 'bg-blue-500 text-white'    },
  { value: 'absent_non_justifie', short: 'ANJ', cls: 'bg-red-500 text-white'     },
];

function sessionDate(s) {
  return s.date?.toDate ? s.date.toDate() : new Date(s.date);
}

function dateLabel(d) {
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return format(d, 'EEEE d MMMM', { locale: fr });
}

// ── Inline feuille d'émargement ──────────────────────────────────────────────
function EmargementPanel({ session, onClose, toast }) {
  const [students, setStudents]   = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    if (!session) return;
    let unsub;
    (async () => {
      const studData = session.groupeId ? await studentsService.getAll({ groupeId: session.groupeId }) : [];
      const active = studData.filter(s => s.statut === 'actif');
      setStudents(active);

      const init = {};
      for (const s of active) init[s.id] = { statut: 'present', heureArrivee: '', justification: '' };
      setAttendance(init);

      unsub = onSnapshot(
        query(collection(db, 'presences'), where('sessionId', '==', session.id)),
        snap => {
          setAttendance(prev => {
            const next = { ...prev };
            snap.forEach(d => {
              const p = d.data();
              if (next[p.studentId] !== undefined)
                next[p.studentId] = { statut: p.statut, heureArrivee: p.heureArrivee || '', justification: p.justification || '' };
            });
            return next;
          });
        }
      );
      setLoading(false);
    })();
    return () => unsub?.();
  }, [session]);

  const setStatut = (sid, statut) => setAttendance(prev => ({ ...prev, [sid]: { ...prev[sid], statut } }));
  const setExtra  = (sid, key, val) => setAttendance(prev => ({ ...prev, [sid]: { ...prev[sid], [key]: val } }));
  const markAll   = (statut) => {
    const next = {};
    for (const s of students) next[s.id] = { ...attendance[s.id], statut };
    setAttendance(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = students.map(s => ({
        studentId: s.id,
        statut: attendance[s.id]?.statut || 'present',
        heureArrivee: attendance[s.id]?.heureArrivee || '',
        justification: attendance[s.id]?.justification || '',
      }));
      await presencesService.bulkUpsert(session.id, entries);
      toast.success('Feuille sauvegardée ✓');
    } catch (err) { toast.error('Erreur : ' + err.message); }
    finally { setSaving(false); }
  };

  const displayed = students.filter(s => {
    const q = search.toLowerCase();
    return !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q);
  });

  const stats = {
    present: students.filter(s => attendance[s.id]?.statut === 'present').length,
    retard:  students.filter(s => attendance[s.id]?.statut === 'retard').length,
    aj:      students.filter(s => attendance[s.id]?.statut === 'absent_justifie').length,
    anj:     students.filter(s => attendance[s.id]?.statut === 'absent_non_justifie').length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-3"
             style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{session.module}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              {dateLabel(sessionDate(session))} · {session.heureDebut}–{session.heureFin}
              {session.salle ? ` · ${session.salle}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 shrink-0">
            <IcoClose />
          </button>
        </div>

        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex gap-4 text-xs font-semibold">
          <span className="text-emerald-600">{stats.present} P</span>
          <span className="text-amber-600">{stats.retard} R</span>
          <span className="text-blue-600">{stats.aj} AJ</span>
          <span className="text-red-600">{stats.anj} ANJ</span>
          <span className="text-slate-400 ml-auto">{students.length} apprenants</span>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          {STATUT_BTN.map(s => (
            <button key={s.value} onClick={() => markAll(s.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.cls} opacity-80 hover:opacity-100`}>
              Tous {s.short}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="ml-auto text-xs border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 w-36"
            style={{ '--tw-ring-color': BLUE }} />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BLUE, borderTopColor: 'transparent' }} />
            </div>
          ) : displayed.map((s, i) => {
            const att = attendance[s.id] || { statut: 'present' };
            return (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.nom} {s.prenom}</p>
                    <p className="text-xs text-slate-400">{s.id}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {STATUT_BTN.map(btn => (
                      <button key={btn.value} onClick={() => setStatut(s.id, btn.value)}
                        className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${att.statut === btn.value ? btn.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {btn.short}
                      </button>
                    ))}
                  </div>
                </div>
                {att.statut === 'retard' && (
                  <div className="mt-2 ml-8 flex items-center gap-2">
                    <label className="text-xs text-slate-500 shrink-0">Heure :</label>
                    <input type="time" value={att.heureArrivee || ''} onChange={e => setExtra(s.id, 'heureArrivee', e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  </div>
                )}
                {att.statut === 'absent_justifie' && (
                  <div className="mt-2 ml-8">
                    <input type="text" value={att.justification || ''} onChange={e => setExtra(s.id, 'justification', e.target.value)}
                      placeholder="Motif de justification…"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-white flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Fermer
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-60"
            style={{ background: BLUE }}>
            {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Planning tab ──────────────────────────────────────────────────────────────
function PlanningTab({ sessions, onOpenEmargement }) {
  const upcoming = sessions.filter(s => {
    const d = sessionDate(s);
    return !isPast(d) || isToday(d);
  }).sort((a, b) => sessionDate(a) - sessionDate(b));

  const past = sessions.filter(s => {
    const d = sessionDate(s);
    return isPast(d) && !isToday(d);
  }).sort((a, b) => sessionDate(b) - sessionDate(a)).slice(0, 10);

  const renderCard = (s) => {
    const d = sessionDate(s);
    const typeCls = TYPE_COLOR[(s.type || '').toLowerCase()] || 'bg-slate-500 text-white';
    return (
      <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-4">
        <div className="shrink-0 w-14 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">{format(d, 'EEE', { locale: fr })}</p>
          <p className="text-2xl font-black text-slate-800">{format(d, 'd')}</p>
          <p className="text-xs text-slate-400">{format(d, 'MMM', { locale: fr })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${typeCls}`}>{s.type?.toUpperCase()}</span>
            {isToday(d) && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">Aujourd'hui</span>}
          </div>
          <p className="font-semibold text-slate-800 text-sm truncate">{s.module}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {s.heureDebut}–{s.heureFin}{s.salle ? ` · ${s.salle}` : ''}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            s.statut === 'en_cours' ? 'bg-emerald-100 text-emerald-700' :
            s.statut === 'terminee' ? 'bg-slate-100 text-slate-500' :
            s.statut === 'annulee'  ? 'bg-red-100 text-red-500' :
            'bg-blue-50 text-blue-600'
          }`}>
            {s.statut === 'en_cours' ? '● En cours' : s.statut === 'terminee' ? 'Terminée' : s.statut === 'annulee' ? 'Annulée' : 'Planifiée'}
          </span>
          {s.statut === 'en_cours' && (
            <button onClick={() => onOpenEmargement(s)}
              className="mt-2 text-xs font-bold px-3 py-1.5 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: BLUE }}>
              Signer ✍
            </button>
          )}
          {s.statut === 'terminee' && (
            <button onClick={() => onOpenEmargement(s)}
              className="mt-2 text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
              Voir
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {upcoming.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prochaines séances ({upcoming.length})</p>
          {upcoming.map(renderCard)}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg mb-1">📅</p>
          <p className="text-sm">Aucune séance à venir</p>
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Séances passées</p>
          {past.map(renderCard)}
        </div>
      )}
    </div>
  );
}

// ── Emargement tab ────────────────────────────────────────────────────────────
function EmargementTab({ sessions, onOpenEmargement }) {
  const open   = sessions.filter(s => s.statut === 'en_cours');
  const recent = sessions.filter(s => s.statut === 'terminee')
    .sort((a, b) => sessionDate(b) - sessionDate(a)).slice(0, 5);

  if (open.length === 0 && recent.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-4xl mb-3">✍</p>
        <p className="font-medium">Aucune séance ouverte</p>
        <p className="text-sm mt-1">L'administration ouvrira la feuille avant chaque séance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Séances ouvertes — signez maintenant
          </p>
          {open.map(s => (
            <div key={s.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{s.module}</p>
                <p className="text-xs text-slate-500">{dateLabel(sessionDate(s))} · {s.heureDebut}–{s.heureFin}</p>
              </div>
              <button onClick={() => onOpenEmargement(s)}
                className="shrink-0 px-4 py-2 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: BLUE }}>
                ✍ Signer
              </button>
            </div>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Récentes (à corriger si besoin)</p>
          {recent.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm truncate">{s.module}</p>
                <p className="text-xs text-slate-400">{format(sessionDate(s), 'd MMM yyyy', { locale: fr })} · {s.heureDebut}–{s.heureFin}</p>
              </div>
              <button onClick={() => onOpenEmargement(s)}
                className="shrink-0 text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                Voir / Corriger
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────
function ProfilTab({ intervenant, auth, sessionCount }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
             style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
          {(intervenant?.prenom?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">{intervenant?.prenom} {intervenant?.nom}</p>
          <p className="text-sm text-slate-400">{intervenant?.specialite || 'Intervenant IFTL'}</p>
          {intervenant?.email && <p className="text-xs text-slate-400 mt-0.5">{intervenant.email}</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {[
          { label: 'Téléphone',          value: intervenant?.telephone },
          { label: 'Séances programmées', value: `${sessionCount} séances` },
          { label: 'Spécialité',          value: intervenant?.specialite },
        ].filter(r => r.value).map(row => (
          <div key={row.label} className="px-5 py-3 flex items-center justify-between border-b border-slate-50 last:border-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{row.label}</span>
            <span className="text-sm font-medium text-slate-700">{row.value}</span>
          </div>
        ))}
      </div>

      <button onClick={auth.logout}
        className="w-full mt-2 px-4 py-3 border border-red-200 text-red-500 hover:bg-red-50 rounded-2xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
        <IcoLogout />
        Se déconnecter
      </button>
    </div>
  );
}

// ── Sidebar link ──────────────────────────────────────────────────────────────
function SideNavLink({ tab, active, badge, onClick }) {
  const { Icon, label } = tab;
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative"
      style={active ? { background: 'rgba(255,255,255,0.16)', color: 'white' } : { color: 'rgba(255,255,255,0.55)' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
    >
      {active && <span className="absolute left-0 w-1 h-6 rounded-r-full bg-white" />}
      <Icon />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortailIntervenant({ auth }) {
  const toast = useToast();
  const [intervenant, setIntervenant]   = useState(null);
  const [sessions, setSessions]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [activeTab, setActiveTab]       = useState('planning');
  const [selectedSession, setSelectedSession] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const loadData = useCallback(async () => {
    const email = auth.user?.email;
    if (!email) return;
    setLoading(true);
    try {
      const intSnap = await getDocs(query(collection(db, 'intervenants'), where('email', '==', email)));
      if (intSnap.empty) { setNotFound(true); setLoading(false); return; }
      const intDoc = { id: intSnap.docs[0].id, ...intSnap.docs[0].data() };
      setIntervenant(intDoc);

      const sessSnap = await getDocs(query(collection(db, 'sessions'), where('intervenantId', '==', intDoc.id)));
      const list = [];
      sessSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSessions(list);
    } catch (err) { toast.error('Erreur chargement : ' + err.message); }
    finally { setLoading(false); }
  }, [auth.user]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCount = sessions.filter(s => s.statut === 'en_cours').length;
  const initials  = (intervenant?.prenom?.[0] || '?').toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: BLUE, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Compte non lié</h2>
          <p className="text-sm text-slate-500 mb-4">
            Aucun profil intervenant trouvé pour <strong>{auth.user?.email}</strong>.<br />
            Contactez l'administration.
          </p>
          <button onClick={auth.logout} className="px-4 py-2 text-white rounded-xl text-sm font-medium" style={{ background: BLUE }}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const sidebarContent = (onLinkClick) => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <span className="text-white font-black text-base">IF</span>
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">IFTL</p>
            <p className="text-blue-300 text-[10px] leading-tight">Portail Intervenant</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
               style={{ background: 'rgba(255,255,255,0.15)' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{intervenant?.prenom} {intervenant?.nom}</p>
            <p className="text-blue-300 text-xs truncate">{intervenant?.specialite || 'Intervenant'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative">
        {TABS.map(tab => (
          <SideNavLink key={tab.id} tab={tab} active={activeTab === tab.id}
            badge={tab.id === 'emargement' ? openCount : 0}
            onClick={() => { setActiveTab(tab.id); onLinkClick?.(); }} />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={auth.logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 transition-all"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          <IcoLogout /> Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#f1f5f9' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 z-40 shadow-2xl"
             style={{ background: 'linear-gradient(180deg,#002d47 0%,#00436e 60%,#005989 100%)' }}>
        {sidebarContent(null)}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col h-full shadow-2xl z-10"
                 style={{ background: 'linear-gradient(180deg,#002d47 0%,#005989 100%)' }}>
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileSidebarOpen(false)} className="text-white/60 hover:text-white p-1">
                <IcoClose />
              </button>
            </div>
            {sidebarContent(() => setMobileSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Mobile top header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setMobileSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <IcoMenu />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BLUE }}>
                  <span className="text-white font-black text-xs">IF</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">Portail Intervenant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {openCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  {openCount} ouverte{openCount > 1 ? 's' : ''}
                </span>
              )}
              <button onClick={auth.logout} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <IcoLogout />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop page header */}
        <div className="hidden lg:block px-8 pt-8 pb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            {TABS.find(t => t.id === activeTab)?.label}
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-800">
              {activeTab === 'planning' ? 'Mon Planning' : activeTab === 'emargement' ? 'Feuilles de présence' : 'Mon Profil'}
            </h1>
            {activeTab === 'emargement' && openCount > 0 && (
              <span className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {openCount} séance{openCount > 1 ? 's' : ''} ouverte{openCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 pb-24 lg:pb-10 pt-4 lg:pt-0">
          <div className="max-w-3xl">
            {activeTab === 'planning'    && <PlanningTab sessions={sessions} onOpenEmargement={setSelectedSession} />}
            {activeTab === 'emargement'  && <EmargementTab sessions={sessions} onOpenEmargement={setSelectedSession} />}
            {activeTab === 'profil'      && <ProfilTab intervenant={intervenant} auth={auth} sessionCount={sessions.length} />}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 relative"
                style={{ color: active ? BLUE : '#94a3b8' }}>
                <tab.Icon />
                <span className="text-[9px] font-semibold leading-none">{tab.short}</span>
                {tab.id === 'emargement' && openCount > 0 && (
                  <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {openCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Emargement panel modal */}
      {selectedSession && (
        <EmargementPanel session={selectedSession} onClose={() => setSelectedSession(null)} toast={toast} />
      )}
    </div>
  );
}
