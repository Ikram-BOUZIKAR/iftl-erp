import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudents, useSessions, useGroupes } from '../../hooks/useData';
import { getStudentsAtRisk, getAlertColor } from '../../services/absenceService';
import { presencesService } from '../../services/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function KpiCard({ label, value, icon, color, to, subtitle }) {
  const colorMap = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'bg-violet-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100' },
  };
  const c = colorMap[color] || colorMap.indigo;

  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
          <span className={`text-xl ${c.text}`}>{icon}</span>
        </div>
      </div>
    </div>
  );

  if (to) return <Link to={to}>{inner}</Link>;
  return inner;
}

function QuickActionButton({ to, icon, label, variant = 'primary' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    secondary: 'border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  };
  return (
    <Link to={to} className={`${base} ${variants[variant]}`}>
      <span>{icon}</span>
      {label}
    </Link>
  );
}

function StatutBadge({ statut }) {
  const map = {
    planifiee: 'bg-slate-100 text-slate-600',
    en_cours: 'bg-emerald-100 text-emerald-700',
    terminee: 'bg-blue-100 text-blue-700',
    annulee: 'bg-red-100 text-red-600'
  };
  const labels = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 ${map[statut] || 'bg-slate-100 text-slate-600'}`}>
      {statut === 'en_cours' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>}
      {labels[statut] || statut}
    </span>
  );
}

export default function Dashboard({ auth }) {
  const { userProfile } = auth;
  const { data: students } = useStudents();
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();
  const [presences, setPresences] = useState([]);
  const [loadingPresences, setLoadingPresences] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const recent = sessions.filter(s => s.statut === 'terminee').slice(0, 50);
        const all = await Promise.all(recent.map(s => presencesService.getBySession(s.id)));
        setPresences(all.flat());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPresences(false);
      }
    };
    if (sessions.length > 0) loadAll();
    else setLoadingPresences(false);
  }, [sessions]);

  const atRisk = getStudentsAtRisk(students, presences, sessions);
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const openSessions = sessions.filter(s => s.statut === 'en_cours');

  const firstName = userProfile?.prenom || auth?.user?.email?.split('@')[0] || 'utilisateur';
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr });

  // Onboarding checks
  const isOnboarding = students.length === 0 && groupes.length === 0 && sessions.length === 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Hero greeting */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{today}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <QuickActionButton to="/planning" icon="+" label="Créer une séance" variant="primary" />
        <QuickActionButton to="/apprenants" icon="🎓" label="Ajouter un apprenant" variant="secondary" />
        <QuickActionButton to="/emargement" icon="✍" label="Émargement du jour" variant="secondary" />
        {openSessions.length > 0 && (
          <QuickActionButton to={`/emargement/${openSessions[0].id}`} icon="●" label={`${openSessions.length} séance${openSessions.length > 1 ? 's' : ''} en cours`} variant="success" />
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Apprenants" value={students.length} icon="🎓" color="indigo" to="/apprenants" subtitle="actifs" />
        <KpiCard label="Groupes" value={groupes.length} icon="👥" color="violet" to="/groupes" subtitle="configurés" />
        <KpiCard label="Séances aujourd'hui" value={todaySessions.length} icon="📅" color="emerald" to="/planning" subtitle={todaySessions.length === 0 ? 'Aucune prévue' : 'programmées'} />
        <KpiCard label="Alertes absences" value={atRisk.length} icon="⚠️" color={atRisk.length > 0 ? 'red' : 'emerald'} to="/rapports" subtitle={atRisk.length > 0 ? 'apprenants à risque' : 'Aucune alerte'} />
      </div>

      {/* Onboarding checklist */}
      {isOnboarding && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-indigo-900 mb-1">Bienvenue sur IFTL ERP !</h2>
          <p className="text-sm text-indigo-700 mb-4">Suivez ces étapes pour commencer à utiliser le système :</p>
          <div className="space-y-2">
            {[
              { label: 'Créez votre premier groupe', to: '/groupes', done: groupes.length > 0 },
              { label: 'Ajoutez des intervenants', to: '/intervenants', done: false },
              { label: 'Ajoutez des apprenants', to: '/apprenants', done: students.length > 0 },
              { label: 'Planifiez une séance', to: '/planning', done: sessions.length > 0 },
              { label: 'Configurez vos paramètres', to: '/parametres', done: false },
            ].map(step => (
              <Link key={step.label} to={step.to} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-300 transition-colors group">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-indigo-200'}`}>
                  {step.done ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-indigo-500"></div>
                  )}
                </div>
                <span className={`text-sm font-medium ${step.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{step.label}</span>
                <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Séances en cours
            </h2>
            {openSessions.length > 0 && (
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{openSessions.length}</span>
            )}
          </div>
          {openSessions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm">Aucune séance en cours</p>
              <Link to="/planning" className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
                Voir le planning →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {openSessions.map(s => (
                <li key={s.id}>
                  <Link
                    to={`/emargement/${s.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
                  >
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{s.module}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.heureDebut} – {s.heureFin} {s.salle ? `· ${s.salle}` : ''}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg shrink-0">
                      Émarger →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Students at risk */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-amber-500">⚠</span>
              Apprenants en alerte
            </h2>
            {atRisk.length > 0 && (
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{atRisk.length}</span>
            )}
          </div>
          {loadingPresences ? (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-400 text-sm mt-2">Calcul en cours…</p>
            </div>
          ) : atRisk.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-slate-500 text-sm font-medium">Aucun apprenant en alerte</p>
              <p className="text-slate-400 text-xs mt-1">Tout le monde est dans les clous !</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {atRisk.slice(0, 6).map(s => {
                const badge = s.alertLevel === 'danger'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200';
                return (
                  <li key={s.id}>
                    <Link
                      to={`/apprenants/${s.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {s.nom?.[0]}{s.prenom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{s.nom} {s.prenom}</p>
                          <p className="text-xs text-slate-400">{s.filiere || 'Filière inconnue'}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold border px-2 py-0.5 rounded-full shrink-0 ${badge}`}>
                        {s.maxScore.toFixed(1)} abs.
                      </span>
                    </Link>
                  </li>
                );
              })}
              {atRisk.length > 6 && (
                <li className="text-center pt-2">
                  <Link to="/rapports" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    Voir les {atRisk.length - 6} autres →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Today's schedule */}
      {todaySessions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Programme d'aujourd'hui</h2>
            <span className="text-xs text-slate-400">{todaySessions.length} séance{todaySessions.length > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySessions.map(s => (
              <Link key={s.id} to={`/emargement/${s.id}`}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              >
                <p className="font-semibold text-sm text-slate-800">{s.module}</p>
                <p className="text-xs text-slate-500 mt-1">{s.heureDebut} – {s.heureFin}</p>
                <p className="text-xs text-slate-400">{s.salle ? `${s.salle} · ` : ''}{s.type?.toUpperCase()}</p>
                <StatutBadge statut={s.statut} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
