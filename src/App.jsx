import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/Auth/LoginPage';
import MainLayout from './components/Layout/MainLayout';
import PrivateRoute from './components/Routes/PrivateRoute';
import SetupPage from './components/Setup/SetupPage';
import DataProtectionNotice from './components/Legal/DataProtectionNotice';
import Dashboard from './components/Dashboard/Dashboard';
import ApprenantsPage from './components/Apprenants/ApprenantsPage';
import ApprenantDetail from './components/Apprenants/ApprenantDetail';
import PlanningPage from './components/Planning/PlanningPage';
import EmargementPage from './components/Emargement/EmargementPage';
import SessionAttendance from './components/Emargement/SessionAttendance';
import GroupesPage from './components/Groupes/GroupesPage';
import IntervenantsPage from './components/Intervenants/IntervenantsPage';
import CandidaturesAdminPage from './components/Candidatures/CandidaturesAdminPage';
import RapportsPage from './components/Rapports/RapportsPage';
import CandidaturePage from './components/Candidature/CandidaturePage';
import './App.css';

function App() {
  const auth = useAuth();

  const hasFirebaseConfig =
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/candidature" element={<CandidaturePage />} />
          <Route path="/login" element={
            !hasFirebaseConfig ? <SetupPage /> : <LoginPage auth={auth} />
          } />

          {/* Protected routes - wrapped in MainLayout */}
          <Route
            path="/*"
            element={
              !hasFirebaseConfig ? (
                <Navigate to="/setup" replace />
              ) : (
                <PrivateRoute auth={auth}>
                  <MainLayout auth={auth}>
                    <Routes>
                      <Route path="/" element={<Dashboard auth={auth} />} />
                      <Route path="/apprenants" element={<ApprenantsPage />} />
                      <Route path="/apprenants/:id" element={<ApprenantDetail />} />
                      <Route path="/planning" element={<PlanningPage />} />
                      <Route path="/emargement" element={<EmargementPage />} />
                      <Route path="/emargement/:id" element={<SessionAttendance />} />
                      <Route path="/groupes" element={<GroupesPage />} />
                      <Route path="/intervenants" element={<IntervenantsPage />} />
                      <Route path="/candidatures" element={<CandidaturesAdminPage />} />
                      <Route path="/rapports" element={<RapportsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </MainLayout>
                </PrivateRoute>
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <DataProtectionNotice />
    </>
  );
}

export default App;
