import { Navigate, useLocation } from 'react-router-dom';

export default function PrivateRoute({ auth, children }) {
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#005989] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Apprenants have a dedicated portal — redirect them away from the admin layout
  if (
    auth.userProfile?.role === 'apprenant' &&
    !location.pathname.startsWith('/portail-apprenant')
  ) {
    return <Navigate to="/portail-apprenant" replace />;
  }

  return children;
}
