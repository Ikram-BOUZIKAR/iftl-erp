import { useState } from 'react';
import Sidebar from './Sidebar';

export default function MainLayout({ auth, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, userProfile, logout } = auth;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={sidebarOpen} role={userProfile?.role} />

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-56' : 'ml-14'
        }`}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14 shadow-sm">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              {user?.email}
            </span>
            <span className="text-xs uppercase font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {userProfile?.role}
            </span>
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition"
            >
              Déconnexion
            </button>
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
