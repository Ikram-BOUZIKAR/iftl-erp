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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Tableau de bord
              </h1>
              <p className="text-gray-600 mt-1">
                Connecté en tant que <span className="font-semibold text-purple-600">{user?.email}</span> • Rôle: <span className="font-semibold capitalize">{userProfile?.role}</span>
              </p>
            </div>
            <button
              onClick={logout}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition"
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
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm font-medium">Total Étudiants</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{students.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
            <p className="text-gray-600 text-sm font-medium">Rôle Utilisateur</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2 capitalize">{userProfile?.role}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-pink-500">
            <p className="text-gray-600 text-sm font-medium">État</p>
            <p className="text-lg font-semibold text-green-600 mt-2">✓ Connecté</p>
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-purple-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Liste des Étudiants</h2>
          
          {studentsLoading ? (
            <p className="text-gray-600">Chargement des étudiants...</p>
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-100 bg-purple-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Prénom</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Filière</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 10).map((student) => (
                    <tr key={student.id} className="border-b border-gray-200 hover:bg-purple-50 transition">
                      <td className="px-4 py-3 text-gray-800 font-medium">{student.nom}</td>
                      <td className="px-4 py-3 text-gray-800">{student.prenom}</td>
                      <td className="px-4 py-3 text-gray-600">{student.email}</td>
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
