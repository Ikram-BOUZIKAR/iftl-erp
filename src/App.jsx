import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/Auth/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import PrivateRoute from './components/Routes/PrivateRoute';
import SetupPage from './components/Setup/SetupPage';
import DataProtectionNotice from './components/Legal/DataProtectionNotice';
import './App.css';

function App() {
  const auth = useAuth();

  // Vérifier les clés Firebase
  const hasFirebaseConfig = 
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (auth.loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Chargement...</p></div>;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={
            !hasFirebaseConfig ? <SetupPage /> : <LoginPage auth={auth} />
          } />
          <Route
            path="/"
            element={
              !hasFirebaseConfig ? (
                <Navigate to="/setup" replace />
              ) : (
                <PrivateRoute auth={auth}>
                  <Dashboard auth={auth} />
                </PrivateRoute>
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <DataProtectionNotice />
    </>
  );
}

export default App;
