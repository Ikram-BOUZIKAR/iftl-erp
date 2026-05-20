import { NavLink, useLocation } from 'react-router-dom';

// ── Inline SVG paths ──────────────────────────────────────────────────────────
// Extra icon paths for new modules
const EXTRA_PATHS = {
  rh:           'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  biblio:       'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  transport2:   'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  collab:       'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z',
};

const PATHS = {
  home:       'd="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"',
  calendar:   'd="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"',
  clipboard:  'd="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"',
  book:       'd="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"',
  award:      'd="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"',
  alert:      'd="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"',
  users:      'd="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"',
  layers:     'd="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"',
  userTie:    'd="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"',
  inbox:      'd="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"',
  userPlus:   'd="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"',
  card:       'd="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"',
  briefcase:  'd="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"',
  folder:     'd="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"',
  bell:       'd="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"',
  chart:      'd="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"',
  trending:   'd="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"',
  cog:        'd="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"',
  doc:        'd="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"',
  logout:     'd="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"',
};

function Ico({ k, cls = 'w-[18px] h-[18px] shrink-0' }) {
  const path = (PATHS[k] || '').replace(/^d="/, '').replace(/"$/, '');
  const extra = EXTRA_PATHS[k] || '';
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {path && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />}
      {extra && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={extra} />}
    </svg>
  );
}

// ── Role visibility ───────────────────────────────────────────────────────────
const ACCESS = {
  admin:       null,  // null = all
  direction:   null,
  scolarite:   ['/', '/planning', '/emargement', '/modules', '/notes', '/absences', '/apprenants', '/groupes', '/intervenants', '/candidatures', '/inscriptions', '/facturation', '/stages', '/documents', '/annonces', '/rapports', '/statistiques', '/parametres'],
  intervenant: ['/', '/planning', '/emargement', '/modules', '/notes', '/absences', '/apprenants', '/annonces'],
  apprenant:   ['/', '/planning', '/notes', '/absences', '/annonces'],
  parent:      ['/', '/notes', '/absences', '/annonces'],
};

function allowed(role, to) {
  const list = ACCESS[role];
  return !list || list.includes(to);
}

// ── Navigation tree ───────────────────────────────────────────────────────────
const SECTIONS = [
  {
    items: [
      { to: '/', label: 'Tableau de bord', icon: 'home', exact: true },
    ],
  },
  {
    label: 'Pédagogie',
    items: [
      { to: '/planning',    label: 'Planning / EDT',       icon: 'calendar' },
      { to: '/emargement',  label: 'Émargement',           icon: 'clipboard' },
      { to: '/modules',     label: 'Modules & Référentiel',icon: 'book' },
      { to: '/notes',       label: 'Notes & Évaluations',  icon: 'award' },
      { to: '/absences',    label: 'Absences & Retards',   icon: 'alert' },
    ],
  },
  {
    label: 'Population',
    items: [
      { to: '/apprenants',   label: 'Apprenants',           icon: 'users' },
      { to: '/groupes',      label: 'Groupes & Promotions', icon: 'layers' },
      { to: '/intervenants', label: 'Intervenants',         icon: 'userTie' },
    ],
  },
  {
    label: 'Administratif',
    items: [
      { to: '/candidatures', label: 'Candidatures',         icon: 'inbox',     badge: true },
      { to: '/inscriptions', label: 'Inscriptions',         icon: 'doc' },
      { to: '/facturation',  label: 'Facturation',          icon: 'card' },
      { to: '/rh',           label: 'RH & Paie',            icon: 'rh' },
      { to: '/stages',       label: 'Stages & Alternance',  icon: 'briefcase' },
      { to: '/documents',    label: 'Documents',            icon: 'folder' },
    ],
  },
  {
    label: 'Ressources',
    items: [
      { to: '/bibliotheque', label: 'Bibliothèque',         icon: 'biblio' },
      { to: '/transport',    label: 'Transport & Flotte',   icon: 'transport2' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/annonces',     label: 'Annonces & Événements', icon: 'bell' },
      { to: '/collaboratif', label: 'Espace collaboratif',   icon: 'collab' },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { to: '/rapports',     label: 'Rapports',     icon: 'chart' },
      { to: '/statistiques', label: 'Statistiques', icon: 'trending' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/parametres', label: 'Paramètres', icon: 'cog' },
    ],
  },
];

// ── NavItem ───────────────────────────────────────────────────────────────────
function Item({ item, open, badgeCount = 0 }) {
  const loc = useLocation();
  const active = item.exact
    ? loc.pathname === item.to
    : loc.pathname === item.to || loc.pathname.startsWith(item.to + '/');

  return (
    <NavLink
      to={item.to}
      end={!!item.exact}
      className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group"
      style={active
        ? { background: 'rgba(255,255,255,0.16)', color: '#fff' }
        : { color: 'rgba(255,255,255,0.55)' }
      }
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
    >
      {/* Yellow accent bar for active */}
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#f5c845' }} />}

      <Ico k={item.icon} />

      {open && <span className="flex-1 truncate leading-tight">{item.label}</span>}

      {/* Badge */}
      {open && badgeCount > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-red-500 text-white shrink-0">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
      {!open && badgeCount > 0 && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
      )}

      {/* Tooltip on collapse */}
      {!open && (
        <div className="pointer-events-none absolute left-[52px] top-1/2 -translate-y-1/2 bg-[#1e293b] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[60] shadow-xl border border-white/10">
          {item.label}
          {badgeCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded-full font-bold">{badgeCount}</span>}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1e293b]" />
        </div>
      )}
    </NavLink>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ open, role, auth, badges = {} }) {
  const { user, userProfile, logout } = auth || {};

  const initials = [userProfile?.prenom?.[0], userProfile?.nom?.[0]]
    .filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  const displayName = userProfile?.prenom
    ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim()
    : user?.email?.split('@')[0] || 'Utilisateur';

  const roleLabels = {
    admin: 'Administrateur', direction: 'Direction', scolarite: 'Scolarité',
    intervenant: 'Intervenant', apprenant: 'Apprenant', parent: 'Parent',
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 overflow-hidden ${open ? 'w-60' : 'w-[60px]'}`}
      style={{ background: 'linear-gradient(180deg,#002d47 0%,#003d63 30%,#005989 70%,#004a73 100%)' }}
    >
      {/* ── Logo ───────────────────────────────────────────────────────── */}
      <div className={`flex items-center shrink-0 h-14 border-b border-white/10 ${open ? 'px-4 gap-3' : 'justify-center'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md"
          style={{ background: '#f5c845' }}>
          <span className="font-black text-[11px]" style={{ color: '#003d63' }}>IF</span>
        </div>
        {open && (
          <div className="min-w-0">
            <p className="text-white font-black text-sm tracking-wider leading-tight">IFTL</p>
            <p className="text-[10px] leading-tight font-medium" style={{ color: 'rgba(245,200,69,0.8)' }}>
              ERP Pédagogique
            </p>
          </div>
        )}
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2"
        style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map((sec, si) => {
          const visible = sec.items.filter(i => allowed(role, i.to));
          if (!visible.length) return null;
          return (
            <div key={si}>
              {sec.label && open && (
                <p className="px-2.5 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {sec.label}
                </p>
              )}
              {sec.label && !open && si > 0 && (
                <div className="my-2 mx-2 border-t border-white/10" />
              )}
              {visible.map(item => (
                <Item
                  key={item.to}
                  item={item}
                  open={open}
                  badgeCount={item.badge ? (badges[item.to.slice(1)] || 0) : 0}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── User ───────────────────────────────────────────────────────── */}
      <div className={`shrink-0 border-t border-white/10 ${open ? 'p-3' : 'py-3 flex flex-col items-center gap-2'}`}>
        {open ? (
          <div className="flex items-center gap-2.5 px-1 py-1 rounded-xl group hover:bg-white/10 transition cursor-default">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow"
              style={{ background: '#f5c845' }}>
              <span className="text-xs font-black" style={{ color: '#003d63' }}>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">{displayName}</p>
              <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {roleLabels[role] || role || 'Utilisateur'}
              </p>
            </div>
            <button onClick={logout} title="Déconnexion"
              className="p-1.5 rounded-lg transition hover:bg-white/20 shrink-0"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Ico k="logout" cls="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow"
              style={{ background: '#f5c845' }} title={displayName}>
              <span className="text-xs font-black" style={{ color: '#003d63' }}>{initials}</span>
            </div>
            <button onClick={logout} title="Déconnexion"
              className="p-1.5 rounded-lg transition hover:bg-white/20"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Ico k="logout" cls="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
