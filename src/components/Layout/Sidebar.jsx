import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: '▦', exact: true },
  { to: '/planning', label: 'Planning / EDT', icon: '📅' },
  { to: '/emargement', label: 'Émargement', icon: '✍️' },
  { to: '/apprenants', label: 'Apprenants', icon: '🎓' },
  { to: '/groupes', label: 'Groupes', icon: '👥' },
  { to: '/intervenants', label: 'Intervenants', icon: '👤' },
  { to: '/candidatures', label: 'Candidatures', icon: '📋' },
  { to: '/rapports', label: 'Rapports', icon: '📊' },
];

export default function Sidebar({ open, role }) {
  const allowed = navItems.filter(item => {
    if (role === 'apprenant') return ['/', '/rapports'].includes(item.to);
    return true;
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 text-white transition-all duration-300 ${
        open ? 'w-56' : 'w-14'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 px-3 py-5 border-b border-gray-700 ${!open && 'justify-center'}`}>
        <span className="text-2xl font-black tracking-tight">IF</span>
        {open && <span className="text-sm font-semibold text-gray-300">TL-ERP</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {allowed.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <span className="text-base shrink-0">{item.icon}</span>
            {open && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {open && (
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
          IFTL-ERP v1.0
        </div>
      )}
    </aside>
  );
}
