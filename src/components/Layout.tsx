import { NavLink, Outlet } from 'react-router-dom';
import { FlaskConical, Terminal, FolderOpen, Clock } from 'lucide-react';

const navItems = [
  { to: '/', label: '编辑器', icon: Terminal },
  { to: '/cases', label: '用例', icon: FolderOpen },
  { to: '/history', label: '历史', icon: Clock },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <nav className="sticky top-0 z-50 flex items-center gap-6 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-3">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <FlaskConical size={24} />
          <span className="text-lg font-bold tracking-wide">PromptLab</span>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
