import { useEffect } from 'react';
import { useStudents } from '../../hooks/useAuth';

export default function Dashboard({ auth }) {
  const { user, userProfile, logout, loading: authLoading } = auth;
  const { students, loading: studentsLoading, refetch } = useStudents();

  useEffect(() => {
    if (!authLoading) {
      refetch();
    }
  }, [authLoading, refetch]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><p>Chargement...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tableau de bord
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                <span className="font-medium">{user?.email}</span> • Rôle: <span className="uppercase text-xs font-semibold">{userProfile?.role}</span>
              </p>
            </div>
            <button
              onClick={logout}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-800">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Étudiants</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">{students.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-700">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Rôle</p>
            <p className="text-2xl font-bold text-gray-900 mt-2 uppercase">{userProfile?.role}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-600">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Statut</p>
            <p className="text-lg font-semibold text-green-700 mt-2">✓ Connecté</p>
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Étudiants</h2>
          
          {studentsLoading ? (
            <p className="text-gray-600">Chargement...</p>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-900">Nom</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-900">Prénom</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-900">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-900">Filière</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 20).map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-medium">{student.nom}</td>
                      <td className="px-4 py-3 text-gray-700">{student.prenom}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{student.email}</td>
                      <td className="px-4 py-3 text-gray-600">{student.filiere || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucun étudiant enregistré</p>
          )}
        </div>
      </main>
    </div>
  );
}
