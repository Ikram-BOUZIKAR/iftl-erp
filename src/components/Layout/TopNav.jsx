import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBranding } from '../../contexts/BrandingContext';
import LanguageSwitcher from '../UI/LanguageSwitcher';
import { HelpButton } from '../UI/HelpGuide';

const ACCESS = {
  admin:       null,
  direction:   ['/', '/planning', '/planning-rentree', '/masse-horaire', '/emargement', '/modules', '/notes', '/absences', '/releves', '/apprenants', '/groupes', '/intervenants', '/candidatures', '/inscriptions', '/reinscriptions', '/facturation', '/rh', '/formation-continue', '/stages', '/documents', '/bibliotheque', '/transport', '/annonces', '/collaboratif', '/emails', '/rapports', '/statistiques'],
  scolarite:   ['/', '/planning', '/planning-rentree', '/masse-horaire', '/emargement', '/modules', '/notes', '/absences', '/releves', '/apprenants', '/groupes', '/intervenants', '/candidatures', '/inscriptions', '/reinscriptions', '/facturation', '/stages', '/documents', '/annonces', '/emails', '/rapports', '/statistiques', '/parametres'],
  intervenant: ['/', '/planning', '/masse-horaire', '/emargement', '/modules', '/notes', '/apprenants', '/annonces'],
  apprenant:   ['/', '/planning', '/notes', '/annonces'],
  parent:      ['/', '/notes', '/annonces'],
};

function allowed(role, to) {
  const list = ACCESS[role];
  return !list || list.includes(to);
}

const GROUPS = [
  {
    id: 'pedagogy',
    labelKey: 'nav.section_pedagogy',
    items: [
      { to: '/planning',         labelKey: 'nav.planning'        },
      { to: '/emargement',       labelKey: 'nav.emargement'      },
      { to: '/modules',          labelKey: 'nav.modules'         },
      { to: '/notes',            labelKey: 'nav.notes'           },
      { to: '/releves',          labelKey: 'nav.releves'         },
      { to: '/absences',         labelKey: 'nav.absences'        },
      { to: '/masse-horaire',    labelKey: 'nav.masseHoraire'    },
      { to: '/planning-rentree', labelKey: 'nav.planningRentree' },
    ],
  },
  {
    id: 'people',
    labelKey: 'nav.section_people',
    items: [
      { to: '/apprenants',   labelKey: 'nav.apprenants'   },
      { to: '/groupes',      labelKey: 'nav.groupes'      },
      { to: '/intervenants', labelKey: 'nav.intervenants' },
    ],
  },
  {
    id: 'admin',
    labelKey: 'nav.section_admin',
    items: [
      { to: '/candidatures',        labelKey: 'nav.candidatures'        },
      { to: '/inscriptions',        labelKey: 'nav.inscriptions'        },
      { to: '/reinscriptions',      labelKey: 'nav.reinscriptions'      },
      { to: '/facturation',         labelKey: 'nav.facturation'         },
      { to: '/rh',                  labelKey: 'nav.rh'                  },
      { to: '/formation-continue',  labelKey: 'nav.formationContinue'   },
      { to: '/stages',              labelKey: 'nav.stages'              },
      { to: '/documents',           labelKey: 'nav.documents'           },
    ],
  },
  {
    id: 'resources',
    labelKey: 'nav.section_resources',
    items: [
      { to: '/bibliotheque', labelKey: 'nav.bibliotheque' },
      { to: '/transport',    labelKey: 'nav.transport'    },
      { to: '/annonces',     labelKey: 'nav.annonces'     },
      { to: '/collaboratif', labelKey: 'nav.collaboratif' },
      { to: '/emails',       labelKey: 'nav.emails'       },
      { to: '/rapports',     labelKey: 'nav.rapports'     },
      { to: '/statistiques', labelKey: 'nav.statistiques' },
    ],
  },
];

function Dropdown({ group, role, onClose }) {
  const { t } = useTranslation();
  const visible = group.items.filter(item => allowed(role, item.to));
  if (!visible.length) return null;
  return (
    <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-scale-in">
      {visible.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`
          }
        >
          {t(item.labelKey, { defaultValue: item.labelKey })}
        </NavLink>
      ))}
    </div>
  );
}

export default function TopNav({ auth, children }) {
  const { t, i18n } = useTranslation();
  const { branding } = useBranding();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  const { user, userProfile, signOut } = auth;
  const role = userProfile?.role || 'admin';

  const initials = userProfile
    ? (`${userProfile.prenom?.[0] || ''}${userProfile.nom?.[0] || ''}`).toUpperCase() ||
      user?.email?.[0]?.toUpperCase() || '?'
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = userProfile?.prenom
    ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim()
    : user?.email?.split('@')[0] || t('roles.user');

  const instituteName = branding.instituteName || t('footer.erp_name');

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setOpenGroup(null); }, [location.pathname]);

  const isRTL = i18n.language === 'ar';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      {/* ── Top Nav Bar ──────────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className="sticky top-0 z-40 shadow-md"
        style={{ background: `var(--brand-primary, #005989)` }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center h-[58px] px-4 gap-2">

          {/* Logo + name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-4">
            {branding.logoURL ? (
              <img src={branding.logoURL} alt="logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background: `var(--brand-accent, #f5c845)`, color: 'var(--brand-primary, #005989)' }}>
                {instituteName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="hidden sm:block text-white font-bold text-[13px] leading-tight max-w-[160px] truncate">
              {instituteName}
            </span>
          </Link>

          {/* Dashboard direct link */}
          <NavLink to="/" end
            className={({ isActive }) =>
              `hidden lg:flex items-center px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`
            }
          >
            {t('nav.dashboard')}
          </NavLink>

          {/* Group dropdowns */}
          {GROUPS.map(group => {
            const visible = group.items.filter(item => allowed(role, item.to));
            if (!visible.length) return null;
            const isGroupActive = visible.some(item =>
              location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            );
            return (
              <div key={group.id} className="relative hidden lg:block">
                <button
                  onClick={() => setOpenGroup(openGroup === group.id ? null : group.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
                    isGroupActive || openGroup === group.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t(group.labelKey, { defaultValue: group.id })}
                  <svg className={`w-3.5 h-3.5 transition-transform ${openGroup === group.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openGroup === group.id && (
                  <Dropdown group={group} role={role} onClose={() => setOpenGroup(null)} />
                )}
              </div>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Help */}
          <HelpButton role={role} color="#fff" />

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* User chip */}
          <div className="w-px h-5 bg-white/20 mx-1" />
          <Link to="/parametres"
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
              style={{ background: `var(--brand-accent, #f5c845)`, color: `var(--brand-primary, #005989)` }}>
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{displayName}</p>
              <p className="text-[10px] text-white/55 capitalize">{t(`roles.${role}`, { defaultValue: role })}</p>
            </div>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 max-h-[80vh] overflow-y-auto">
            <NavLink to="/" end onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-semibold border-b border-slate-100 ${isActive ? 'text-indigo-700 bg-indigo-50' : 'text-slate-700'}`
              }>
              {t('nav.dashboard')}
            </NavLink>
            {GROUPS.map(group => {
              const visible = group.items.filter(item => allowed(role, item.to));
              if (!visible.length) return null;
              return (
                <div key={group.id}>
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50">
                    {t(group.labelKey, { defaultValue: group.id })}
                  </div>
                  {visible.map(item => (
                    <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center px-6 py-2.5 text-sm font-medium border-b border-slate-50 ${isActive ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`
                      }>
                      {t(item.labelKey, { defaultValue: item.labelKey })}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6">
        {children}
      </main>

      <footer className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>{t('footer.erp_name')} · {new Date().getFullYear()}</span>
        <span className="text-slate-300">{t('footer.cndp')}</span>
      </footer>
    </div>
  );
}
