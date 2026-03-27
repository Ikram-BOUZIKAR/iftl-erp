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

  if (authLoading) return <p>Chargement utilisateur...</p>;

  return (
    <main className="App p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p>
          Connecté en tant que <strong>{user?.email}</strong> ({userProfile?.role})
        </p>
        <button className="btn mt-3" onClick={logout}>Déconnexion</button>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3">Étudiants</h2>
        {studentsLoading ? (
          <p>Chargement des étudiants...</p>
        ) : (
          <><p>{students.length} étudiants enregistrés</p>
          <ul className="mt-2">
            {students.slice(0, 8).map((student) => (
              <li key={student.id} className="border rounded p-2 my-1">
                {student.nom} {student.prenom} ({student.email})
              </li>
            ))}
          </ul></>
        )}
      </section>
    </main>
  );
}
