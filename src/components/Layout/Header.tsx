import React, { useRef, useEffect } from 'react';
import { Plus, LogOut, PanelLeft, Hammer, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  onNewChat: () => void;
  onToggleSidebar: () => void;
  /** Logo click: back to the dashboard (welcome screen). */
  onHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewChat, onToggleSidebar, onHome }) => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowUserMenu(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const initials = (user?.username ?? 'U').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="h-14 flex-shrink-0 bg-surface/80 backdrop-blur-md border-b border-line px-2 sm:px-3 z-20">
      <div className="h-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={onToggleSidebar} className="icon-btn" aria-label="Toggle conversation history" title="History">
            <PanelLeft size={18} />
          </button>
          <button
            onClick={onHome}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg min-w-0 hover:bg-surface-2 transition-colors"
            aria-label="Gesture Path — go to dashboard"
            title="Dashboard"
          >
            <img src="/images/Logo.svg" alt="" className="w-7 h-7 rounded-lg" />
            <span className="text-[15px] font-bold tracking-tight text-ink truncate">Gesture Path</span>
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={toggle}
            className="icon-btn"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button onClick={onNewChat} className="btn btn-primary h-9 px-3 sm:px-3.5" aria-label="New conversation">
            <Plus size={16} />
            <span className="hidden sm:inline">New chat</span>
          </button>

          <div className="relative ml-0.5" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 sm:pr-2.5 rounded-xl hover:bg-surface-2 transition-colors"
              aria-haspopup="menu"
              aria-expanded={showUserMenu}
              aria-label="Account menu"
            >
              <div className="w-8 h-8 rounded-full bg-brand-soft text-brand-ink flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
              <span className="hidden md:inline text-sm font-medium text-ink-2 max-w-32 truncate">{user?.username}</span>
            </button>

            {showUserMenu && (
              <div role="menu" className="absolute right-0 mt-2 w-64 card shadow-lift p-1.5 z-30 animate-rise-in">
                <div className="px-3 py-2.5 mb-1 border-b border-line">
                  <p className="text-sm font-semibold text-ink truncate">{user?.username}</p>
                  <p className="text-xs text-ink-3 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/builder"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
                >
                  <Hammer size={15} className="text-ink-3" />
                  Sign builder
                </Link>
                <button
                  role="menuitem"
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger-soft transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
