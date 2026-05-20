import { NavLink, useNavigate } from 'react-router-dom';

// SVG Icons
function DashboardIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-4a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function DocumentTextIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

const NAV_SECTIONS = [
  {
    title: 'Principal',
    items: [
      { to: '/', label: 'Tableau de bord', Icon: DashboardIcon, exact: true },
      { to: '/planning', label: 'Planning / EDT', Icon: CalendarIcon },
      { to: '/emargement', label: 'Émargement', Icon: ClipboardIcon },
    ]
  },
  {
    title: 'Gestion',
    items: [
      { to: '/apprenants', label: 'Apprenants', Icon: UsersIcon },
      { to: '/groupes', label: 'Groupes', Icon: GroupIcon },
      { to: '/intervenants', label: 'Intervenants', Icon: UserIcon },
      { to: '/candidatures', label: 'Candidatures', Icon: DocumentTextIcon },
      { to: '/rapports', label: 'Rapports', Icon: ChartBarIcon },
    ]
  },
  {
    title: 'Administration',
    items: [
      { to: '/parametres', label: 'Paramètres', Icon: CogIcon },
    ]
  },
];

function NavItem({ item, open }) {
  const { to, label, Icon, exact } = item;

  return (
    <NavLink
      to={to}
      end={exact}
      title={!open ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
        }`
      }
    >
      <Icon />
      {open && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ open, role, auth }) {
  const navigate = useNavigate();
  const { user, userProfile, logout } = auth || {};

  const initials = userProfile
    ? `${userProfile.prenom?.[0] || ''}${userProfile.nom?.[0] || ''}`.toUpperCase() ||
      user?.email?.[0]?.toUpperCase() || '?'
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = userProfile?.prenom
    ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim()
    : user?.email?.split('@')[0] || 'Utilisateur';

  const handleLogout = async () => {
    await logout?.();
    navigate('/login');
  };

  const allowedSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (role === 'apprenant') return ['/', '/rapports'].includes(item.to);
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 transition-all duration-300 ease-in-out ${
        open ? 'w-60' : 'w-16'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center px-4 py-5 border-b border-slate-700/50 ${open ? 'gap-3' : 'justify-center'}`}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-black tracking-tighter">IF</span>
        </div>
        {open && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">IFTL</p>
            <p className="text-slate-400 text-xs font-medium truncate">ERP System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {allowedSections.map(section => (
          <div key={section.title} className="mb-4">
            {open && (
              <p className="px-4 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            {!open && <div className="mx-3 mb-2 border-t border-slate-700/50" />}
            <div className={`space-y-0.5 ${open ? 'px-3' : 'px-2'}`}>
              {section.items.map(item => (
                <NavItem key={item.to} item={item} open={open} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile at bottom */}
      <div className={`border-t border-slate-700/50 p-3 ${!open && 'flex justify-center'}`}>
        {open ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{userProfile?.role || 'Utilisateur'}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogoutIcon />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 transition-colors"
          >
            <span className="text-white text-xs font-bold">{initials}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
