import React, { useRef, useEffect } from 'react';
import { Plus, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewChat }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <header className="bg-gray-900/80 backdrop-blur-xl border-b border-white/5 px-5 py-3 z-20">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-md" />
            <img src="/images/Logo.svg" alt="Gesture Path" className="relative w-9 h-9 rounded-xl" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Gesture Path
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm text-gray-300">{user?.username}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 py-2 z-30">
                <div className="px-4 py-2 border-b border-white/10 mb-1">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                </div>
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-sm">
                  <Settings size={15} className="text-gray-500" />
                  Settings
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm"
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
