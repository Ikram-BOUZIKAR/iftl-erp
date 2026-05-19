import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { studentsService } from '../../services/firestore';
import { usePresencesByStudent, useSessions, useGroupes } from '../../hooks/useData';
import { computeStudentAbsencesByModule, getAlertColor } from '../../services/absenceService';

const STATUT_LABELS = {
  present: 'Présent',
  absent_justifie: 'Absent Justifié',
  absent_non_justifie: 'Absent Non Justifié',
  retard: 'Retard'
};

const STATUT_COLORS = {
  present: 'bg-green-100 text-green-700',
  absent_justifie: 'bg-blue-100 text-blue-700',
  absent_non_justifie: 'bg-red-100 text-red-700',
  retard: 'bg-yellow-100 text-yellow-700'
};

export default function ApprenantDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const { data: presences } = usePresencesByStudent(id);
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();

  useEffect(() => {
    studentsService.getById(id).then(s => { setStudent(s); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement…</div>;
  if (!student) return <div className="p-8 text-center text-red-500">Apprenant introuvable</div>;

  const groupe = groupes.find(g => g.id === student.groupeId);
  const byModule = computeStudentAbsencesByModule(presences, sessions);

  const presencesWithSession = presences.map(p => ({
    ...p,
    session: sessions.find(s => s.id === p.sessionId)
  })).filter(p => p.session).sort((a, b) => new Date(b.session.date) - new Date(a.session.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/apprenants" className="text-gray-400 hover:text-gray-600 text-sm">← Apprenants</Link>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-6">
          <div className="shrink-0">
            {student.photoURL ? (
              <img src={student.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                {student.nom?.[0]}{student.prenom?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoField label="Nom complet" value={`${student.nom} ${student.prenom}`} />
            <InfoField label="Email" value={student.email} />
            <InfoField label="Téléphone" value={student.telephone || '—'} />
            <InfoField label="CIN" value={student.cin || '—'} />
            <InfoField label="Date de naissance" value={student.dateNaissance || '—'} />
            <InfoField label="Groupe" value={groupe?.nom || student.filiere || '—'} />
            <InfoField label="Filière" value={student.filiere || '—'} />
            <InfoField label="Niveau" value={student.niveau || '—'} />
            <InfoField label="Statut" value={student.statut} />
          </div>
        </div>
      </div>

      {/* Absence summary by module */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4">Récapitulatif des absences par module</h2>
        {Object.keys(byModule).length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune absence enregistrée</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(byModule).map(([module, data]) => {
              const color = data.alertLevel === 'danger' ? 'border-red-400 bg-red-50' :
                            data.alertLevel === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                            'border-green-400 bg-green-50';
              const textColor = data.alertLevel === 'danger' ? 'text-red-700' :
                                data.alertLevel === 'warning' ? 'text-yellow-700' :
                                'text-green-700';
              return (
                <div key={module} className={`rounded-lg border-l-4 p-4 ${color}`}>
                  <p className="font-semibold text-sm text-gray-900">{module}</p>
                  <p className={`text-2xl font-bold ${textColor} mt-1`}>{data.score.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.anjCount} ANJ · {data.retardCount} retard{data.retardCount > 1 ? 's' : ''} · {data.ajCount} AJ
                  </p>
                  {data.alertLevel !== 'ok' && (
                    <p className={`text-xs font-semibold mt-1 ${textColor}`}>
                      {data.alertLevel === 'danger' ? '⚠ DANGER ≥ 5' : '⚠ ALERTE ≥ 3'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Historique des présences ({presencesWithSession.length})</h2>
        </div>
        {presencesWithSession.length === 0 ? (
          <div className="p-6 text-gray-400 text-sm text-center">Aucun enregistrement</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Horaire</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {presencesWithSession.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {p.session.date ? new Date(p.session.date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.session.module}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {p.session.heureDebut} – {p.session.heureFin}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${STATUT_COLORS[p.statut] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUT_LABELS[p.statut] || p.statut}
                    </span>
                    {p.statut === 'retard' && p.heureArrivee && (
                      <span className="text-xs text-gray-400 ml-2">({p.heureArrivee})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 font-medium mt-0.5">{value}</p>
    </div>
  );
}
