import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

const links = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/decks', label: 'Decks', icon: '📚' },
  { to: '/stats', label: 'Analytics', icon: '📊' },
  { to: '/import', label: 'Import', icon: '📥' },
];

export default function Navbar() {
  const location = useLocation();
  const { dark, toggle } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 fixed left-0 top-0 bottom-0 p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-brand-500">FlashMind</span>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? 'bg-brand-50 dark:bg-brand-700/20 text-brand-600 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span>{dark ? '☀️' : '🌙'}</span>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex z-50">
        {links.map(l => (
          <Link key={l.to} to={l.to}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
              location.pathname === l.to
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
            <span className="text-lg mb-0.5">{l.icon}</span>{l.label}
          </Link>
        ))}
        <button onClick={toggle}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="text-lg mb-0.5">{dark ? '☀️' : '🌙'}</span>
          {dark ? 'Light' : 'Dark'}
        </button>
      </nav>
    </>
  );
}
