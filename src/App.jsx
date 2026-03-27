import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/Auth/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import PrivateRoute from './components/Routes/PrivateRoute';
import DataProtectionNotice from './components/Legal/DataProtectionNotice';
import './App.css';

function App() {
  const auth = useAuth();

  if (auth.loading) {
    return <div className="App p-6">Chargement...</div>;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage auth={auth} />} />
          <Route
            path="/"
            element={
              <PrivateRoute auth={auth}>
                <Dashboard auth={auth} />
              </PrivateRoute>
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
