import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ auth, children }) {
  if (auth.loading) {
    return <div>Chargement...</div>;
  }
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
