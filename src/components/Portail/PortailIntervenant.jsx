import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { presencesService, studentsService } from '../../services/firestore';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '../UI/Toast';

const TABS = [
  { id: 'planning',    label: 'Mon Planning'    },
  { id: 'emargement', label: 'Émargement'       },
  { id: 'profil',     label: 'Mon Profil'       },
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
  { value: 'present',           short: 'P',   cls: 'bg-emerald-500 text-white' },
  { value: 'retard',            short: 'R',   cls: 'bg-amber-500 text-white'   },
  { value: 'absent_justifie',   short: 'AJ',  cls: 'bg-blue-500 text-white'    },
  { value: 'absent_non_justifie', short: 'ANJ', cls: 'bg-red-500 text-white'  },
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
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) return;
    let unsub;
    (async () => {
      const studData = session.groupeId
        ? await studentsService.getAll({ groupeId: session.groupeId })
        : [];
      const active = studData.filter(s => s.statut === 'actif');
      setStudents(active);

      const init = {};
      for (const s of active) init[s.id] = { statut: 'present', heureArrivee: '', justification: '' };
      setAttendance(init);

      // Real-time presences for this session
      unsub = onSnapshot(
        query(collection(db, 'presences'), where('sessionId', '==', session.id)),
        snap => {
          setAttendance(prev => {
            const next = { ...prev };
            snap.forEach(d => {
              const p = d.data();
              if (next[p.studentId] !== undefined) {
                next[p.studentId] = { statut: p.statut, heureArrivee: p.heureArrivee || '', justification: p.justification || '' };
              }
            });
            return next;
          });
        }
      );
      setLoading(false);
    })();
    return () => unsub?.();
  }, [session]);

  const setStatut = (sid, statut) =>
    setAttendance(prev => ({ ...prev, [sid]: { ...prev[sid], statut } }));

  const setExtra = (sid, key, val) =>
    setAttendance(prev => ({ ...prev, [sid]: { ...prev[sid], [key]: val } }));

  const markAll = (statut) => {
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
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayed = students.filter(s => {
    const q = search.toLowerCase();
    return !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q);
  });

  const stats = {
    present: students.filter(s => attendance[s.id]?.statut === 'present').length,
    retard: students.filter(s => attendance[s.id]?.statut === 'retard').length,
    aj: students.filter(s => attendance[s.id]?.statut === 'absent_justifie').length,
    anj: students.filter(s => attendance[s.id]?.statut === 'absent_non_justifie').length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex gap-4 text-xs font-semibold">
          <span className="text-emerald-600">{stats.present} P</span>
          <span className="text-amber-600">{stats.retard} R</span>
          <span className="text-blue-600">{stats.aj} AJ</span>
          <span className="text-red-600">{stats.anj} ANJ</span>
          <span className="text-slate-400 ml-auto">{students.length} apprenants</span>
        </div>

        {/* Mark all + search */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          {STATUT_BTN.map(s => (
            <button key={s.value} onClick={() => markAll(s.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.cls} opacity-80 hover:opacity-100`}>
              Tous {s.short}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="ml-auto text-xs border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#005989] w-36" />
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin"/>
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

        {/* Save */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Fermer
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-bold bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
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
    const typeCls = TYPE_COLOR[s.type] || 'bg-slate-500 text-white';
    return (
      <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-4">
        {/* Date column */}
        <div className="shrink-0 w-14 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">{format(d, 'EEE', { locale: fr })}</p>
          <p className="text-2xl font-black text-slate-800">{format(d, 'd')}</p>
          <p className="text-xs text-slate-400">{format(d, 'MMM', { locale: fr })}</p>
        </div>
        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${typeCls}`}>{s.type?.toUpperCase()}</span>
            {isToday(d) && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">Aujourd'hui</span>}
          </div>
          <p className="font-semibold text-slate-800 text-sm truncate">{s.module}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {s.heureDebut}–{s.heureFin}
            {s.salle ? ` · ${s.salle}` : ''}
          </p>
        </div>
        {/* Status/Action */}
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
              className="mt-2 text-xs font-bold px-3 py-1.5 bg-[#005989] text-white rounded-lg hover:bg-[#004a73] transition-colors">
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
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prochaines séances</p>
          {upcoming.map(renderCard)}
        </div>
      )}
      {upcoming.length === 0 && (
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
  const open = sessions.filter(s => s.statut === 'en_cours');
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
    <div className="space-y-5">
      {open.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">● Séances ouvertes — signez maintenant</p>
          {open.map(s => (
            <div key={s.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{s.module}</p>
                <p className="text-xs text-slate-500">{dateLabel(sessionDate(s))} · {s.heureDebut}–{s.heureFin}</p>
              </div>
              <button onClick={() => onOpenEmargement(s)}
                className="shrink-0 px-4 py-2 bg-[#005989] text-white text-sm font-bold rounded-xl hover:bg-[#004a73] transition-colors">
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
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
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
    <div className="space-y-4 max-w-sm">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0"
             style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
          {(intervenant?.prenom?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-800">{intervenant?.prenom} {intervenant?.nom}</p>
          <p className="text-sm text-slate-400">{intervenant?.specialite || 'Intervenant'}</p>
        </div>
      </div>
      {[
        { label: 'Email',    value: intervenant?.email    },
        { label: 'Téléphone', value: intervenant?.telephone },
        { label: 'Séances programmées', value: `${sessionCount} séances` },
      ].map(row => row.value && (
        <div key={row.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">{row.label}</span>
          <span className="text-sm font-medium text-slate-700">{row.value}</span>
        </div>
      ))}
      <button onClick={auth.logout}
        className="w-full mt-4 px-4 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors">
        Se déconnecter
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortailIntervenant({ auth }) {
  const toast = useToast();
  const [intervenant, setIntervenant] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('planning');
  const [selectedSession, setSelectedSession] = useState(null);

  const loadData = useCallback(async () => {
    const email = auth.user?.email;
    if (!email) return;
    setLoading(true);
    try {
      // Find intervenant doc by email
      const intSnap = await getDocs(query(collection(db, 'intervenants'), where('email', '==', email)));
      if (intSnap.empty) { setNotFound(true); setLoading(false); return; }
      const intDoc = { id: intSnap.docs[0].id, ...intSnap.docs[0].data() };
      setIntervenant(intDoc);

      // Load their sessions
      const sessSnap = await getDocs(query(collection(db, 'sessions'), where('intervenantId', '==', intDoc.id)));
      const sessList = [];
      sessSnap.forEach(d => sessList.push({ id: d.id, ...d.data() }));
      setSessions(sessList);
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCount = sessions.filter(s => s.statut === 'en_cours').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#005989] border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Compte non lié</h2>
          <p className="text-sm text-slate-500 mb-4">
            Aucun profil intervenant trouvé pour <strong>{auth.user?.email}</strong>.<br/>
            Contactez l'administration pour faire le lien avec votre compte.
          </p>
          <button onClick={auth.logout} className="px-4 py-2 bg-[#005989] text-white rounded-xl text-sm font-medium">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#002d47 0%,#005989 100%)' }} className="px-4 pt-6 pb-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-0.5">Portail intervenant</p>
              <h1 className="text-white font-bold text-xl">{intervenant?.prenom} {intervenant?.nom}</h1>
              <p className="text-blue-300 text-sm">{intervenant?.specialite || 'Intervenant IFTL'}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-black text-white">
              {(intervenant?.prenom?.[0] || '?').toUpperCase()}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-t-xl transition-colors relative ${
                  activeTab === tab.id ? 'bg-white text-[#005989]' : 'text-blue-200 hover:text-white'
                }`}>
                {tab.label}
                {tab.id === 'emargement' && openCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {openCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {activeTab === 'planning' && (
          <PlanningTab sessions={sessions} onOpenEmargement={setSelectedSession} />
        )}
        {activeTab === 'emargement' && (
          <EmargementTab sessions={sessions} onOpenEmargement={setSelectedSession} />
        )}
        {activeTab === 'profil' && (
          <ProfilTab intervenant={intervenant} auth={auth} sessionCount={sessions.length} />
        )}
      </div>

      {/* Emargement panel */}
      {selectedSession && (
        <EmargementPanel session={selectedSession} onClose={() => setSelectedSession(null)} toast={toast} />
      )}
    </div>
  );
}
