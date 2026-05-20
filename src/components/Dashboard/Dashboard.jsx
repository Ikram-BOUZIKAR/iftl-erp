import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStudents, useSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { getStudentsAtRisk } from '../../services/absenceService';
import { presencesService } from '../../services/firestore';

const BRAND = {
  blue: '#005989',
  yellow: '#f5c845',
  red: '#c8141b',
  green: '#c8d45d',
  orange: '#d75930',
};

function KpiCard({ label, value, icon, from, to: toColor, to: linkTo, isLink }) {
  const inner = (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${toColor} 100%)`,
        boxShadow: `0 8px 24px ${from}40`,
      }}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 bottom-0 w-14 h-14 rounded-full bg-white/5" />
      <div className="relative">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl mb-3">
          {icon}
        </div>
        <p className="text-3xl font-bold leading-none">{value}</p>
        <p className="text-sm font-medium text-white/80 mt-1">{label}</p>
      </div>
    </div>
  );
  return isLink ? <Link to={linkTo}>{inner}</Link> : inner;
}

function SessionCard({ session, groupeNom }) {
  const isLive = session.statut === 'en_cours';
  return (
    <Link to={`/emargement/${session.id}`}
      className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
      <div
        className="w-1 h-12 rounded-full shrink-0"
        style={{ background: isLive ? BRAND.green : '#e2e8f0' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800 text-sm truncate">{session.module}</p>
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: `${BRAND.green}25`, color: '#5a7a0a' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BRAND.green }} />
              LIVE
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {session.heureDebut} – {session.heureFin} · {groupeNom}{session.salle ? ` · ${session.salle}` : ''}
        </p>
      </div>
      <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function AlertRow({ student }) {
  const isDanger = student.alertLevel === 'danger';
  const color = isDanger ? BRAND.red : BRAND.orange;
  return (
    <Link to={`/apprenants/${student.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
        style={{ background: color }}>
        {student.nom?.[0]}{student.prenom?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{student.nom} {student.prenom}</p>
        <p className="text-xs text-slate-400 truncate">{student.filiere || '—'}</p>
      </div>
      <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 text-white"
        style={{ background: color }}>
        {student.maxScore.toFixed(1)} abs.
      </span>
    </Link>
  );
}

function OnboardingStep({ done, label, to, step }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
      style={{
        borderColor: done ? '#c8d45d50' : `${BRAND.blue}30`,
        background: done ? `${BRAND.green}10` : `${BRAND.blue}08`,
        opacity: done ? 0.7 : 1,
      }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
        style={{ background: done ? BRAND.green : BRAND.blue }}>
        {done ? '✓' : step}
      </div>
      <p className={`text-sm font-medium flex-1 ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{label}</p>
      {!done && (
        <svg className="w-4 h-4 shrink-0" style={{ color: BRAND.blue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </Link>
  );
}

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
      } catch (e) { console.error(e); }
      finally { setLoadingPresences(false); }
    };
    if (sessions.length > 0) load();
    else setLoadingPresences(false);
  }, [sessions]);

  const now = new Date();
  const today = format(now, 'EEEE dd MMMM yyyy', { locale: fr });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = userProfile?.prenom || user?.email?.split('@')[0] || '';

  const todaySessions = sessions.filter(s => s.date && new Date(s.date).toDateString() === now.toDateString());
  const liveSessions = sessions.filter(s => s.statut === 'en_cours');
  const atRisk = getStudentsAtRisk(students, presences, sessions);
  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';

  const isEmpty = students.length === 0 && groupes.length === 0 && sessions.length === 0;
  const onboardingSteps = [
    { done: intervenants.length > 0, label: 'Ajouter des intervenants', to: '/intervenants' },
    { done: groupes.length > 0, label: 'Créer un groupe de formation', to: '/groupes' },
    { done: students.length > 0, label: 'Enregistrer des apprenants', to: '/apprenants' },
    { done: sessions.length > 0, label: 'Planifier une première séance', to: '/planning' },
  ];
  const onboardingProgress = onboardingSteps.filter(s => s.done).length;

  const presenceRate = presences.length > 0
    ? Math.round((presences.filter(p => p.statut === 'present').length / presences.length) * 100)
    : null;

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-7 text-white"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue} 0%, #003d63 70%, #002d47 100%)`,
          boxShadow: `0 12px 40px ${BRAND.blue}40`,
        }}
      >
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full" style={{ background: `${BRAND.yellow}12` }} />
        <div className="absolute right-32 bottom-0 translate-y-1/2 w-40 h-40 rounded-full" style={{ background: `${BRAND.green}08` }} />
        {/* Bande accent gauche */}
        <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full" style={{ background: BRAND.yellow }} />

        <div className="relative pl-4 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-sm font-medium capitalize" style={{ color: `${BRAND.yellow}cc` }}>{today}</p>
            <h1 className="text-2xl font-bold mt-1">
              {greeting}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {liveSessions.length > 0
                ? `${liveSessions.length} séance${liveSessions.length > 1 ? 's' : ''} en cours · émargement ouvert`
                : todaySessions.length > 0
                ? `${todaySessions.length} séance${todaySessions.length > 1 ? 's' : ''} prévue${todaySessions.length > 1 ? 's' : ''} aujourd'hui`
                : 'Aucune séance planifiée aujourd\'hui'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap shrink-0">
            <Link to="/planning"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter séance
            </Link>
            <Link to="/emargement"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: BRAND.yellow, color: BRAND.blue, boxShadow: `0 4px 12px ${BRAND.yellow}50` }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Émargement
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Apprenants" value={students.length} icon="🎓"
          from={BRAND.blue} toColor="#003d63" isLink linkTo="/apprenants" />
        <KpiCard label="Groupes actifs" value={groupes.filter(g => g.actif !== false).length} icon="👥"
          from="#6a7d10" toColor={BRAND.green} isLink linkTo="/groupes" />
        <KpiCard label="Séances aujourd'hui" value={todaySessions.length} icon="📅"
          from={BRAND.orange} toColor="#b04020" isLink linkTo="/planning" />
        <KpiCard
          label="Alertes absences" value={atRisk.length} icon="⚠️"
          from={atRisk.length > 0 ? BRAND.red : BRAND.green}
          toColor={atRisk.length > 0 ? '#8e0e12' : '#6a7d10'}
          isLink linkTo="/rapports"
        />
      </div>

      {/* ── Onboarding ───────────────────────────────────── */}
      {isEmpty && (
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: `${BRAND.blue}30` }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-slate-800">🚀 Démarrage rapide</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${BRAND.blue}15`, color: BRAND.blue }}>
              {onboardingProgress}/4 complété
            </span>
          </div>
          <p className="text-slate-500 text-sm mb-4">Suivez ces étapes pour configurer votre ERP.</p>
          <div className="w-full rounded-full h-1.5 mb-4" style={{ background: '#e2e8f0' }}>
            <div className="h-1.5 rounded-full transition-all"
              style={{ width: `${(onboardingProgress / 4) * 100}%`, background: BRAND.blue }} />
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((s, i) => (
              <OnboardingStep key={i} step={i + 1} done={s.done} label={s.label} to={s.to} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Séances du jour ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${BRAND.blue}15` }}>
                <svg className="w-4 h-4" style={{ color: BRAND.blue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-bold text-slate-800">Séances du jour</h2>
            </div>
            <Link to="/planning" className="text-xs font-medium hover:underline" style={{ color: BRAND.blue }}>Voir tout →</Link>
          </div>
          <div className="p-4 space-y-2">
            {todaySessions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${BRAND.yellow}20` }}>
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Aucune séance aujourd'hui</p>
                <Link to="/planning" className="inline-block mt-2 text-xs font-medium hover:underline" style={{ color: BRAND.blue }}>
                  Planifier une séance →
                </Link>
              </div>
            ) : todaySessions.map(s => (
              <SessionCard key={s.id} session={s} groupeNom={getGroupeName(s.groupeId)} />
            ))}
          </div>
        </div>

        {/* ── Alertes absences ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${BRAND.red}15` }}>
                <svg className="w-4 h-4" style={{ color: BRAND.red }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-bold text-slate-800">Apprenants en alerte</h2>
              {atRisk.length > 0 && (
                <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: BRAND.red }}>{atRisk.length}</span>
              )}
            </div>
            <Link to="/rapports" className="text-xs font-medium hover:underline" style={{ color: BRAND.blue }}>Rapport →</Link>
          </div>
          <div className="p-4">
            {loadingPresences ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                  style={{ borderColor: `${BRAND.blue}40`, borderTopColor: BRAND.blue }} />
                <p className="text-slate-400 text-xs">Calcul en cours…</p>
              </div>
            ) : atRisk.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${BRAND.green}25` }}>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Aucun apprenant en alerte</p>
                <p className="text-xs text-slate-400 mt-1">Tout va bien !</p>
              </div>
            ) : (
              <div className="space-y-1">
                {atRisk.slice(0, 7).map(s => <AlertRow key={s.id} student={s} />)}
                {atRisk.length > 7 && (
                  <Link to="/rapports" className="block text-center text-xs font-medium hover:underline pt-2" style={{ color: BRAND.blue }}>
                    + {atRisk.length - 7} autre{atRisk.length - 7 > 1 ? 's' : ''} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────── */}
      {(students.length > 0 || sessions.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total séances', value: sessions.length, icon: '📊', color: BRAND.blue },
            { label: 'Séances terminées', value: sessions.filter(s => s.statut === 'terminee').length, icon: '✅', color: BRAND.green },
            { label: 'Intervenants', value: intervenants.length, icon: '👤', color: BRAND.orange },
            { label: 'Taux présence', value: loadingPresences ? '…' : (presenceRate !== null ? `${presenceRate}%` : '—'), icon: '📈', color: BRAND.yellow },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${item.color}18` }}>
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
