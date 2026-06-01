import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Sidebar from './Sidebar';

const BREADCRUMBS = {
  '/':             'Tableau de bord',
  '/planning':     'Planning / EDT',
  '/emargement':   'Émargement',
  '/modules':      'Modules & Référentiel',
  '/notes':        'Notes & Évaluations',
  '/absences':     'Absences & Retards',
  '/apprenants':   'Apprenants',
  '/groupes':      'Groupes & Promotions',
  '/intervenants': 'Intervenants',
  '/candidatures': 'Candidatures',
  '/inscriptions': 'Inscriptions',
  '/facturation':  'Facturation',
  '/stages':       'Stages & Alternance',
  '/documents':    'Documents',
  '/annonces':     'Annonces & Événements',
  '/rh':           'RH & Paie',
  '/bibliotheque': 'Bibliothèque & Ressources',
  '/transport':    'Transport & Flotte',
  '/collaboratif': 'Espace collaboratif',
  '/rapports':     'Rapports',
  '/statistiques': 'Statistiques',
  '/parametres':   'Paramètres',
};

const ROLE_LABELS = {
  admin:       'Administrateur',
  direction:   'Direction',
  scolarite:   'Scolarité',
  intervenant: 'Intervenant',
  apprenant:   'Apprenant',
  parent:      'Parent',
};

function Ico({ path, size = 'w-5 h-5' }) {
  return (
    <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
    </svg>
  );
}

export default function MainLayout({ auth, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, userProfile } = auth;
  const location = useLocation();

  const pathParts   = location.pathname.split('/').filter(Boolean);
  const currentPage = BREADCRUMBS[location.pathname] || BREADCRUMBS['/' + pathParts[0]] || 'Page';
  const isHome      = location.pathname === '/';

  const initials = userProfile
    ? (`${userProfile.prenom?.[0] || ''}${userProfile.nom?.[0] || ''}`).toUpperCase() ||
      user?.email?.[0]?.toUpperCase() || '?'
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = userProfile?.prenom
    ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim()
    : user?.email?.split('@')[0] || 'Utilisateur';

  const today = format(new Date(), 'EEE dd MMM', { locale: fr });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar open={sidebarOpen} role={userProfile?.role} auth={auth} />

      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-[60px]'}`}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-5 h-14 shadow-sm">

          {/* Gauche : burger + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
              aria-label="Toggle sidebar"
            >
              <Ico path="M4 6h16M4 12h16M4 18h16" />
            </button>

            <nav className="flex items-center gap-1.5 text-sm min-w-0">
              <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 text-xs">
                <Ico path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" size="w-4 h-4" />
              </Link>
              {!isHome && (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-slate-700 font-semibold truncate text-sm">{currentPage}</span>
                </>
              )}
            </nav>
          </div>

          {/* Droite : date + notif + avatar */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Date — visible sur grands écrans */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-medium capitalize px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 mr-1">
              <Ico path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size="w-3.5 h-3.5 text-slate-300" />
              {today}
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Notifications">
              <Ico path="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Avatar + nom */}
            <Link to="/parametres"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-colors group"
              title="Mon profil">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #005989, #0077b6)' }}>
                <span className="text-white text-[11px] font-black">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-400 capitalize leading-tight">
                  {ROLE_LABELS[userProfile?.role] || userProfile?.role || 'Utilisateur'}
                </p>
              </div>
              <svg className="w-3.5 h-3.5 text-slate-300 hidden sm:block group-hover:text-slate-500 transition-colors"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </header>

        {/* ── Contenu ───────────────────────────────────────────────────── */}
        <main className="flex-1 p-6">
          {children}
        </main>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            ERP Pédagogique · {new Date().getFullYear()}
          </p>
          <p className="text-[11px] text-slate-300">
            CNDP n° A-PO-268/2024
          </p>
        </footer>
      </div>
    </div>
  );
}
