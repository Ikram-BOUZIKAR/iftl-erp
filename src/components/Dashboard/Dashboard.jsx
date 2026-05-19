import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudents, useSessions, useGroupes } from '../../hooks/useData';
import { getStudentsAtRisk, getAlertColor } from '../../services/absenceService';
import { presencesService } from '../../services/firestore';

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
        // Load presences for all recent sessions
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

  const stats = [
    { label: 'Apprenants', value: students.length, icon: '🎓', to: '/apprenants', color: 'blue' },
    { label: 'Groupes', value: groupes.length, icon: '👥', to: '/groupes', color: 'purple' },
    { label: 'Séances aujourd\'hui', value: todaySessions.length, icon: '📅', to: '/planning', color: 'green' },
    { label: 'Alertes absences', value: atRisk.length, icon: '⚠️', to: '/rapports', color: 'red' },
  ];

  const colorMap = {
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    red: 'border-red-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble du système pédagogique</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} to={stat.to} className={`bg-white rounded-xl p-5 border-l-4 ${colorMap[stat.color]} shadow-sm hover:shadow-md transition`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Séances en cours ({openSessions.length})
          </h2>
          {openSessions.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune séance en cours</p>
          ) : (
            <ul className="space-y-2">
              {openSessions.map(s => (
                <li key={s.id}>
                  <Link
                    to={`/emargement/${s.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition border border-green-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.module}</p>
                      <p className="text-xs text-gray-500">{s.heureDebut} – {s.heureFin} • {s.salle}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded">
                      Émargement ouvert
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Students at risk */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            ⚠️ Apprenants en alerte ({atRisk.length})
          </h2>
          {loadingPresences ? (
            <p className="text-gray-400 text-sm">Calcul en cours…</p>
          ) : atRisk.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucun apprenant en alerte</p>
          ) : (
            <ul className="space-y-2">
              {atRisk.slice(0, 8).map(s => {
                const color = getAlertColor(s.alertLevel);
                const badge = s.alertLevel === 'danger'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-yellow-100 text-yellow-700 border-yellow-300';
                return (
                  <li key={s.id}>
                    <Link
                      to={`/apprenants/${s.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{s.nom} {s.prenom}</p>
                        <p className="text-xs text-gray-500">{s.filiere || 'Filière inconnue'}</p>
                      </div>
                      <span className={`text-xs font-bold border px-2 py-1 rounded ${badge}`}>
                        {s.maxScore.toFixed(1)} abs.
                      </span>
                    </Link>
                  </li>
                );
              })}
              {atRisk.length > 8 && (
                <li className="text-center">
                  <Link to="/rapports" className="text-xs text-blue-600 hover:underline">
                    Voir les {atRisk.length - 8} autres →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Today's schedule */}
      {todaySessions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-3">📅 Programme d'aujourd'hui</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySessions.map(s => (
              <Link key={s.id} to={`/emargement/${s.id}`}
                className="p-3 rounded-lg border border-gray-200 hover:border-gray-400 transition"
              >
                <p className="font-semibold text-sm text-gray-900">{s.module}</p>
                <p className="text-xs text-gray-500 mt-1">{s.heureDebut} – {s.heureFin}</p>
                <p className="text-xs text-gray-400">{s.salle} • {s.type?.toUpperCase()}</p>
                <StatutBadge statut={s.statut} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatutBadge({ statut }) {
  const map = {
    planifiee: 'bg-gray-100 text-gray-600',
    en_cours: 'bg-green-100 text-green-700',
    terminee: 'bg-blue-100 text-blue-700',
    annulee: 'bg-red-100 text-red-600'
  };
  const labels = { planifiee: 'Planifiée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded mt-2 ${map[statut] || 'bg-gray-100 text-gray-600'}`}>
      {labels[statut] || statut}
    </span>
  );
}
