import React, { useState } from 'react';
import { MessageSquare, X, Trash2, Plus, Search } from 'lucide-react';
import { Chat } from '../../types';
import { taskFor } from '../../modes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
}

function groupLabel(iso: string): string {
  const d = new Date(iso).getTime();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d >= startOfToday) return 'Today';
  if (d >= startOfToday - 86400000) return 'Yesterday';
  if (d >= startOfToday - 6 * 86400000) return 'Previous 7 days';
  return 'Older';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
}) => {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const sorted = [...chats]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
  const groups: Array<{ label: string; chats: Chat[] }> = [];
  for (const chat of sorted) {
    const label = groupLabel(chat.updatedAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.chats.push(chat);
    else groups.push({ label, chats: [chat] });
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-ink/30 dark:bg-black/60 backdrop-blur-[2px] z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Conversation history"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[280px] flex-shrink-0 flex flex-col bg-surface border-r border-line transition-transform duration-200 lg:transition-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 lg:h-12 border-b border-line lg:border-0">
          <h2 className="eyebrow">History</h2>
          <button onClick={onClose} className="icon-btn lg:hidden -mr-1.5" aria-label="Close history">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-3 lg:pt-0 space-y-2">
          <button onClick={onNewChat} className="btn btn-secondary w-full">
            <Plus size={16} />
            New conversation
          </button>
          {chats.length > 0 && (
            <label className="relative block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="input h-9 pl-8 text-[13px] bg-surface-2 border-transparent focus:bg-surface"
              />
            </label>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {chats.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={18} className="text-ink-3" />
              </div>
              <p className="text-sm font-medium text-ink-2">No conversations yet</p>
              <p className="text-xs mt-1 text-ink-3">Your conversations will appear here.</p>
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-center text-sm text-ink-3 py-8">No matches for “{query}”</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-2.5 pb-1.5 eyebrow">{group.label}</div>
                {group.chats.map((chat) => {
                  const task = taskFor(chat.settings);
                  const Icon = task.icon;
                  const active = chat.id === activeChatId;
                  return (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-2.5 pl-2.5 pr-1.5 py-2 rounded-xl cursor-pointer transition-colors ${
                        active ? 'bg-brand-soft' : 'hover:bg-surface-2'
                      }`}
                      onClick={() => onSelectChat(chat)}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        task.group === 'from-sign' ? 'bg-sign-soft text-sign-ink' : 'bg-brand-soft text-brand-ink'
                      } ${active ? 'bg-surface' : ''}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-[13px] ${active ? 'font-semibold text-brand-ink' : 'font-medium text-ink'}`}>{chat.title}</p>
                        <p className="text-[11px] text-ink-3 truncate">{task.title}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="icon-btn w-7 h-7 hover:text-danger hover:bg-danger-soft lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Delete conversation ${chat.title}`}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </nav>
      </aside>
    </>
  );
};
