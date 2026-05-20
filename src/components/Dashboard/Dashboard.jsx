import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStudents, useSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { getStudentsAtRisk } from '../../services/absenceService';
import { presencesService } from '../../services/firestore';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, gradient, to, delta }) {
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 ${gradient}`}>
      {/* BG decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 bottom-0 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
            {icon}
          </div>
          {delta !== undefined && (
            <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
              {delta >= 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold mt-3 leading-none">{value}</p>
        <p className="text-sm font-medium text-white/80 mt-1">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, groupeNom }) {
  const isLive = session.statut === 'en_cours';
  return (
    <Link to={`/emargement/${session.id}`}
      className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group">
      <div className={`w-1 h-12 rounded-full shrink-0 ${isLive ? 'bg-emerald-400' : 'bg-slate-200'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800 text-sm truncate">{session.module}</p>
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {session.heureDebut} – {session.heureFin} · {groupeNom} {session.salle ? `· ${session.salle}` : ''}
        </p>
      </div>
      <div className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────
function AlertRow({ student }) {
  const isDanger = student.alertLevel === 'danger';
  return (
    <Link to={`/apprenants/${student.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
      }`}>
        {student.nom?.[0]}{student.prenom?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{student.nom} {student.prenom}</p>
        <p className="text-xs text-slate-400 truncate">{student.filiere || 'Filière non définie'}</p>
      </div>
      <div className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
        isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
      }`}>
        {student.maxScore.toFixed(1)} abs.
      </div>
    </Link>
  );
}

// ─── Onboarding step ──────────────────────────────────────────────────────────
function OnboardingStep({ done, label, to, step }) {
  return (
    <Link to={to} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
      done
        ? 'border-emerald-200 bg-emerald-50/50 opacity-60'
        : 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 hover:bg-indigo-50'
    }`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'
      }`}>
        {done ? '✓' : step}
      </div>
      <p className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{label}</p>
      {!done && (
        <svg className="w-4 h-4 text-indigo-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </Link>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ auth }) {
  const { userProfile, user } = auth;
  const { data: students } = useStudents();
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [presences, setPresences] = useState([]);
  const [loadingPresences, setLoadingPresences] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const recent = sessions.filter(s => s.statut === 'terminee').slice(0, 60);
        const all = await Promise.all(recent.map(s => presencesService.getBySession(s.id)));
        setPresences(all.flat());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPresences(false);
      }
    };
    if (sessions.length > 0) load();
    else setLoadingPresences(false);
  }, [sessions]);

  const now = new Date();
  const today = format(now, 'EEEE dd MMMM yyyy', { locale: fr });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = userProfile?.prenom || user?.email?.split('@')[0] || '';

  const todaySessions = sessions.filter(s => {
    if (!s.date) return false;
    return new Date(s.date).toDateString() === now.toDateString();
  });
  const liveSessions = sessions.filter(s => s.statut === 'en_cours');
  const atRisk = getStudentsAtRisk(students, presences, sessions);

  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';

  // Onboarding
  const isEmpty = students.length === 0 && groupes.length === 0 && sessions.length === 0;
  const onboardingSteps = [
    { done: intervenants.length > 0, label: 'Ajouter des intervenants', to: '/intervenants' },
    { done: groupes.length > 0, label: 'Créer un groupe de formation', to: '/groupes' },
    { done: students.length > 0, label: 'Enregistrer des apprenants', to: '/apprenants' },
    { done: sessions.length > 0, label: 'Planifier une première séance', to: '/planning' },
  ];
  const onboardingProgress = onboardingSteps.filter(s => s.done).length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Hero greeting ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-7 text-white shadow-xl">
        {/* Decorations */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute right-24 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium capitalize">{today}</p>
            <h1 className="text-2xl font-bold mt-1">
              {greeting}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {liveSessions.length > 0
                ? `${liveSessions.length} séance${liveSessions.length > 1 ? 's' : ''} en cours · émargement ouvert`
                : todaySessions.length > 0
                ? `${todaySessions.length} séance${todaySessions.length > 1 ? 's' : ''} prévue${todaySessions.length > 1 ? 's' : ''} aujourd'hui`
                : 'Aucune séance aujourd\'hui'}
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link to="/planning"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter séance
            </Link>
            <Link to="/emargement"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Émargement
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Apprenants" value={students.length}
          icon="🎓"
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          to="/apprenants"
        />
        <KpiCard
          label="Groupes actifs" value={groupes.filter(g => g.actif !== false).length}
          icon="👥"
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
          to="/groupes"
        />
        <KpiCard
          label="Séances aujourd'hui" value={todaySessions.length}
          icon="📅"
          gradient="bg-gradient-to-br from-sky-500 to-sky-700"
          to="/planning"
        />
        <KpiCard
          label="Alertes absences" value={atRisk.length}
          icon="⚠️"
          gradient={atRisk.length > 0 ? "bg-gradient-to-br from-rose-500 to-red-700" : "bg-gradient-to-br from-emerald-500 to-emerald-700"}
          to="/rapports"
        />
      </div>

      {/* ── Onboarding checklist (only when starting) ─────────── */}
      {isEmpty && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-slate-800">🚀 Démarrage rapide</h2>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {onboardingProgress}/4 complété
            </span>
          </div>
          <p className="text-slate-500 text-sm mb-4">Suivez ces étapes pour configurer votre ERP.</p>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(onboardingProgress / 4) * 100}%` }} />
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((s, i) => (
              <OnboardingStep key={i} step={i + 1} done={s.done} label={s.label} to={s.to} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Sessions du jour ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-bold text-slate-800">Séances du jour</h2>
            </div>
            <Link to="/planning" className="text-xs text-indigo-600 hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="p-4 space-y-2">
            {todaySessions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Aucune séance aujourd'hui</p>
                <Link to="/planning" className="inline-block mt-2 text-xs text-indigo-600 hover:underline">Planifier une séance →</Link>
              </div>
            ) : (
              todaySessions.map(s => (
                <SessionCard key={s.id} session={s} groupeNom={getGroupeName(s.groupeId)} />
              ))
            )}
          </div>
        </div>

        {/* ── Alertes absences ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-bold text-slate-800">Apprenants en alerte</h2>
              {atRisk.length > 0 && (
                <span className="text-xs font-bold bg-red-100 text-red-600 w-5 h-5 rounded-full flex items-center justify-center">{atRisk.length}</span>
              )}
            </div>
            <Link to="/rapports" className="text-xs text-indigo-600 hover:underline font-medium">Voir rapport →</Link>
          </div>
          <div className="p-4">
            {loadingPresences ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-xs">Calcul en cours…</p>
              </div>
            ) : atRisk.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Aucun apprenant en alerte</p>
                <p className="text-slate-400 text-xs mt-1">Tout va bien !</p>
              </div>
            ) : (
              <div className="space-y-1">
                {atRisk.slice(0, 7).map(s => <AlertRow key={s.id} student={s} />)}
                {atRisk.length > 7 && (
                  <Link to="/rapports" className="block text-center text-xs text-indigo-600 hover:underline pt-2">
                    + {atRisk.length - 7} autre{atRisk.length - 7 > 1 ? 's' : ''} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      {(students.length > 0 || sessions.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total séances', value: sessions.length, icon: '📊', color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Séances terminées', value: sessions.filter(s => s.statut === 'terminee').length, icon: '✅', color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Intervenants actifs', value: intervenants.length, icon: '👤', color: 'text-violet-600 bg-violet-50' },
            { label: 'Taux présence', value: loadingPresences ? '…' : (presences.length > 0 ? `${Math.round((presences.filter(p => p.statut === 'present').length / presences.length) * 100)}%` : '—'), icon: '📈', color: 'text-sky-600 bg-sky-50' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{item.value}</p>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
