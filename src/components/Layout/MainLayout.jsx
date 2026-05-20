import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';

const BREADCRUMBS = {
  '/': 'Tableau de bord',
  '/planning': 'Planning / EDT',
  '/emargement': 'Émargement',
  '/apprenants': 'Apprenants',
  '/groupes': 'Groupes',
  '/intervenants': 'Intervenants',
  '/candidatures': 'Candidatures',
  '/rapports': 'Rapports',
  '/parametres': 'Paramètres',
};

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function MainLayout({ auth, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, userProfile } = auth;
  const location = useLocation();

  // Build breadcrumb
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = BREADCRUMBS[location.pathname] || BREADCRUMBS['/' + pathParts[0]] || 'Page';

  const initials = userProfile
    ? `${userProfile.prenom?.[0] || ''}${userProfile.nom?.[0] || ''}`.toUpperCase() ||
      user?.email?.[0]?.toUpperCase() || '?'
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar open={sidebarOpen} role={userProfile?.role} auth={auth} />

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-60' : 'ml-16'
        }`}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14 shadow-sm">
          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <MenuIcon />
            </button>

            <nav className="flex items-center gap-1.5 text-sm">
              <Link to="/" className="text-slate-500 hover:text-slate-700 transition-colors">
                Accueil
              </Link>
              {location.pathname !== '/' && (
                <>
                  <ChevronRightIcon />
                  <span className="text-slate-800 font-medium">{currentPage}</span>
                </>
              )}
            </nav>
          </div>

          {/* Right: notifications + avatar */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors relative">
              <BellIcon />
            </button>

            <Link
              to="/parametres"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
              title="Mon profil"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-700 leading-tight">
                  {userProfile?.prenom || user?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <p className="text-xs text-slate-400 capitalize leading-tight">{userProfile?.role || 'user'}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
