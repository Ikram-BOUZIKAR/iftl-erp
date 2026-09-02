import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/UI/Toast';
import { ConfirmProvider } from './components/UI/ConfirmDialog';
import LoginPage from './components/Auth/LoginPage';
import MainLayout from './components/Layout/MainLayout';
import PrivateRoute from './components/Routes/PrivateRoute';
import SetupPage from './components/Setup/SetupPage';
import DataProtectionNotice from './components/Legal/DataProtectionNotice';
import Dashboard from './components/Dashboard/Dashboard';
import ApprenantsPage from './components/Apprenants/ApprenantsPage';
import ApprenantDetail from './components/Apprenants/ApprenantDetail';
import PlanningPage from './components/Planning/PlanningPage';
import MasseHorairePage from './components/Planning/MasseHorairePage';
import EmargementPage from './components/Emargement/EmargementPage';
import SessionAttendance from './components/Emargement/SessionAttendance';
import GroupesPage from './components/Groupes/GroupesPage';
import IntervenantsPage from './components/Intervenants/IntervenantsPage';
import CandidaturesAdminPage from './components/Candidatures/CandidaturesAdminPage';
import RapportsPage from './components/Rapports/RapportsPage';
import CandidaturePage from './components/Candidature/CandidaturePage';
import SettingsPage from './components/Settings/SettingsPage';
import PortailResultats from './components/Portail/PortailResultats';
import PortailApprenant from './components/Portail/PortailApprenant';
import PortailIntervenant from './components/Portail/PortailIntervenant';
import RegisterPage from './components/Auth/RegisterPage';
// New modules
import ModulesPage from './components/Modules/ModulesPage';
import NotesPage from './components/Notes/NotesPage';
import AbsencesPage from './components/Absences/AbsencesPage';
import FacturationPage from './components/Facturation/FacturationPage';
import StagesPage from './components/Stages/StagesPage';
import DocumentsPage from './components/Documents/DocumentsPage';
import AnnoncesPage from './components/Communication/AnnoncesPage';
import StatistiquesPage from './components/Statistiques/StatistiquesPage';
import InscriptionsPage from './components/Inscriptions/InscriptionsPage';
import RHPage from './components/RH/RHPage';
import BibliothequeePage from './components/Bibliotheque/BibliothequeePage';
import TransportPage from './components/Transport/TransportPage';
import CollaboratifPage from './components/Collaboratif/CollaboratifPage';
import EmailsPage from './components/Emails/EmailsPage';
import FormationContinuePage from './components/FormationContinue/FormationContinuePage';
import RepairGroupesPage    from './components/Admin/RepairGroupesPage';
import PassageNiveauPage    from './components/Admin/PassageNiveauPage';
import DeduplicationPage    from './components/Admin/DeduplicationPage';
import './App.css';

function App() {
  const auth = useAuth();

  const hasFirebaseConfig =
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/candidature" element={<CandidaturePage />} />
            <Route path="/resultats" element={<PortailResultats />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/portail-apprenant" element={
              !hasFirebaseConfig ? <Navigate to="/setup" replace /> : (
                <PrivateRoute auth={auth}>
                  <PortailApprenant auth={auth} />
                </PrivateRoute>
              )
            } />
            <Route path="/portail-intervenant" element={
              !hasFirebaseConfig ? <Navigate to="/setup" replace /> : (
                <PrivateRoute auth={auth}>
                  <PortailIntervenant auth={auth} />
                </PrivateRoute>
              )
            } />
            <Route path="/login" element={
              !hasFirebaseConfig ? <SetupPage /> : <LoginPage auth={auth} />
            } />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                !hasFirebaseConfig ? (
                  <Navigate to="/setup" replace />
                ) : (
                  <PrivateRoute auth={auth}>
                    <MainLayout auth={auth}>
                      <Routes>
                        <Route path="/"              element={<Dashboard auth={auth} />} />
                        {/* Pédagogie */}
                        <Route path="/planning"      element={<PlanningPage />} />
                        <Route path="/masse-horaire" element={<MasseHorairePage />} />
                        <Route path="/emargement"    element={<EmargementPage />} />
                        <Route path="/emargement/:id" element={<SessionAttendance />} />
                        <Route path="/modules"       element={<ModulesPage />} />
                        <Route path="/notes"         element={<NotesPage />} />
                        <Route path="/absences"      element={<AbsencesPage />} />
                        {/* Population */}
                        <Route path="/apprenants"    element={<ApprenantsPage />} />
                        <Route path="/apprenants/:id" element={<ApprenantDetail />} />
                        <Route path="/groupes"       element={<GroupesPage />} />
                        <Route path="/intervenants"  element={<IntervenantsPage />} />
                        {/* Administratif */}
                        <Route path="/candidatures"  element={<CandidaturesAdminPage />} />
                        <Route path="/inscriptions"  element={<InscriptionsPage />} />
                        <Route path="/facturation"   element={<FacturationPage />} />
                        <Route path="/stages"        element={<StagesPage />} />
                        <Route path="/documents"     element={<DocumentsPage />} />
                        {/* RH & Paie */}
                        <Route path="/rh"            element={<RHPage />} />
                        {/* Formation Continue */}
                        <Route path="/formation-continue" element={<FormationContinuePage />} />
                        {/* Ressources */}
                        <Route path="/bibliotheque"  element={<BibliothequeePage />} />
                        <Route path="/transport"     element={<TransportPage />} />
                        {/* Communication */}
                        <Route path="/annonces"      element={<AnnoncesPage />} />
                        <Route path="/collaboratif"  element={<CollaboratifPage />} />
                        <Route path="/emails"        element={<EmailsPage />} />
                        {/* Analyse */}
                        <Route path="/rapports"      element={<RapportsPage />} />
                        <Route path="/statistiques"  element={<StatistiquesPage />} />
                        {/* Configuration */}
                        <Route path="/parametres"    element={<SettingsPage auth={auth} />} />
                        {/* Outils admin */}
                        <Route path="/admin/repair-groupes"    element={<RepairGroupesPage />} />
                        <Route path="/admin/passage-niveau"    element={<PassageNiveauPage />} />
                        <Route path="/admin/deduplication"     element={<DeduplicationPage />} />
                        <Route path="*"              element={<Navigate to="/" replace />} />
                      </Routes>
                    </MainLayout>
                  </PrivateRoute>
                )
              }
            />
          </Routes>
        </BrowserRouter>
        <DataProtectionNotice />
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
