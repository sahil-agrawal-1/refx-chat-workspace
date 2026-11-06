import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Folder,
  FolderPlus,
  History,
  SquarePen,
  Settings,
  Trash2,
  PanelLeft,
  ListFilter,
  Pin,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Logo } from '@/components/ui/Logo';

export const Sidebar: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    conversations,
    currentConversation,
    startNewConversation,
    selectConversation,
    deleteConversation,
    openModal,
    selectedWorkspace,
    recentWorkspaces,
    setWorkspace,
    removeRecentWorkspace,
    openWorkspaceDialog,
  } = useAppStore();

  if (isSidebarCollapsed) return null;

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('refx_pinned_conversations');
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const [conversationSort, setConversationSort] = useState<'newest' | 'oldest'>('newest');
  const [isConversationFilterOpen, setIsConversationFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConversationFilterOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsConversationFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isConversationFilterOpen]);

  const otherConversations = conversations.filter(
    (c) => c.id !== currentConversation?.id && !pinnedIds.has(c.id)
  );
  const pinnedConversations = conversations.filter((c) => pinnedIds.has(c.id));

  const sortedOtherConversations = [...otherConversations].sort((a, b) =>
    conversationSort === 'newest' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt
  );

  const togglePinConversation = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('refx_pinned_conversations', JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <aside className="refx-sidebar w-[280px] shrink-0 h-screen flex flex-col text-foreground z-20 select-none">
      {/* Top Header: Logo + Collapse Sidebar Button */}
      <div className="h-16 px-5 flex items-center justify-between pt-2">
        <Logo width={26} height={26} className="text-white" />
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 text-foreground-muted hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Primary Actions: New Conversation, History, Schedule Tasks */}
      <div className="px-4 pt-2 space-y-1.5">
        <button
          type="button"
          onClick={startNewConversation}
          className="w-full rounded-xl border border-border bg-surface-raised hover:bg-surface-card text-foreground flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-normal transition-all cursor-pointer shadow-xs"
        >
          <SquarePen size={16} strokeWidth={1.8} className="text-foreground-muted" />
          <span>New Conversation</span>
        </button>

        <button
          type="button"
          onClick={() => openModal('conversation-history')}
          className="w-full text-foreground-muted hover:text-foreground flex items-center gap-3 px-3.5 py-2 text-[14px] font-normal transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03]"
        >
          <History size={16} strokeWidth={1.8} className="text-foreground-muted" />
          <span>Conversation History</span>
        </button>

        <button
          type="button"
          onClick={() => openModal('settings')}
          className="w-full text-foreground-muted hover:text-foreground flex items-center gap-3 px-3.5 py-2 text-[14px] font-normal transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03]"
        >
          <Clock size={16} strokeWidth={1.8} className="text-foreground-muted" />
          <span>Schedule Tasks</span>
        </button>
      </div>

      {/* Projects Section */}
      <section className="px-4 pt-7">
        <div className="flex items-center justify-between text-foreground text-[14px] font-medium mb-2.5 px-1">
          <span>Projects</span>
          <button
            type="button"
            onClick={openWorkspaceDialog}
            className="text-foreground-muted hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
            title="Open project folder"
          >
            <FolderPlus size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-1.5">
          {/* Active selected project */}
          {selectedWorkspace ? (
            <div className="rounded-xl border border-border/80 bg-surface-card px-3.5 py-2.5 flex items-center justify-between text-[13px] text-foreground group">
              <button
                type="button"
                onClick={() => setWorkspace(selectedWorkspace)}
                className="min-w-0 flex flex-1 items-center gap-2.5 text-left truncate cursor-pointer"
              >
                <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
                <span className="truncate text-foreground font-medium">{selectedWorkspace.name}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecentWorkspace(selectedWorkspace.path);
                }}
                className="p-1 text-foreground-muted hover:text-rose-400 transition-colors ml-2 shrink-0 cursor-pointer"
                title="Delete project"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </div>
          ) : recentWorkspaces.length > 0 ? (
            /* If no active workspace is selected, show recent workspaces as clickable cards with delete icon */
            recentWorkspaces.slice(0, 3).map((ws) => (
              <div
                key={ws.id}
                className="rounded-xl border border-border/80 bg-surface-card px-3.5 py-2.5 flex items-center justify-between text-[13px] text-foreground-muted group hover:border-zinc-700 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setWorkspace(ws)}
                  className="min-w-0 flex flex-1 items-center gap-2.5 text-left truncate cursor-pointer"
                >
                  <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
                  <span className="truncate text-foreground">{ws.name}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentWorkspace(ws.path);
                  }}
                  className="p-1 text-foreground-muted hover:text-rose-400 transition-colors ml-2 shrink-0 cursor-pointer"
                  title="Delete project"
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>
              </div>
            ))
          ) : (
            /* Clean empty state when no workspace exists */
            <button
              type="button"
              onClick={openWorkspaceDialog}
              className="w-full rounded-xl border border-dashed border-border hover:border-zinc-700 bg-transparent hover:bg-white/[0.02] px-3.5 py-2.5 flex items-center gap-2.5 text-[13px] text-foreground-muted hover:text-foreground-muted transition-colors cursor-pointer"
            >
              <FolderPlus size={16} strokeWidth={1.8} className="text-foreground-muted" />
              <span>Open project folder</span>
            </button>
          )}

          {/* Additional recent projects if one is already selected */}
          {selectedWorkspace &&
            recentWorkspaces
              .filter((item) => item.path !== selectedWorkspace?.path)
              .slice(0, 2)
              .map((ws) => (
                <div
                  key={ws.id}
                  className="px-3.5 py-1.5 text-[13px] text-foreground-muted hover:text-foreground-muted flex items-center justify-between group cursor-pointer transition-colors rounded-lg hover:bg-white/[0.02]"
                >
                  <button
                    type="button"
                    onClick={() => setWorkspace(ws)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {ws.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentWorkspace(ws.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-rose-400 transition-opacity"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
        </div>
      </section>

      {/* Pinned conversations (move here when pinned) */}
      <section className="px-4 pt-5">
        <div className="flex items-center gap-2 text-foreground-muted text-[12px] font-medium mb-1.5 px-1">
          <Pin size={13} strokeWidth={1.8} className="text-foreground-muted" />
          <span>Pinned</span>
        </div>
        <div className="space-y-1">
          {pinnedConversations.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-foreground-muted">No pinned conversations</div>
          ) : (
            pinnedConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between px-3.5 py-2 text-[13px] transition-colors cursor-pointer rounded-lg ${
                  currentConversation?.id === c.id
                    ? 'bg-surface-raised text-foreground border border-border'
                    : 'text-foreground-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-left">{c.title}</span>
                <div className="flex items-center gap-1 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinConversation(c.id);
                    }}
                    className="text-foreground-muted hover:text-foreground transition-colors p-0.5"
                    title="Unpin conversation"
                  >
                    <Pin size={13} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    className="text-foreground-muted hover:text-rose-400 transition-colors p-0.5"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Conversation Section */}
      <section className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 pt-7">
        <div className="flex items-center justify-between text-foreground text-[14px] font-medium mb-2.5 px-1">
          <span>Conversation</span>
          <div className="flex items-center gap-1.5 text-foreground-muted">
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsConversationFilterOpen((prev) => !prev)}
                className="hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                title="Filter conversations"
              >
                <ListFilter size={15} strokeWidth={1.8} />
              </button>
              {isConversationFilterOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-border bg-surface-raised shadow-lg z-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setConversationSort('newest');
                      setIsConversationFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      conversationSort === 'newest'
                        ? 'bg-surface text-foreground font-medium'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConversationSort('oldest');
                      setIsConversationFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      conversationSort === 'oldest'
                        ? 'bg-surface text-foreground font-medium'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                    }`}
                  >
                    Oldest
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={startNewConversation}
              className="hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              title="New conversation"
            >
              <SquarePen size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {/* Active conversation box */}
          {currentConversation && !pinnedIds.has(currentConversation.id) ? (
            <div className="rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 flex items-center justify-between text-[13px] text-foreground shadow-xs group">
              <span className="truncate text-foreground font-normal">
                {currentConversation.title || 'New conversation'}
              </span>
              <div className="flex items-center gap-1.5 text-foreground-muted shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => deleteConversation(currentConversation.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all cursor-pointer p-0.5"
                  title="Delete conversation"
                >
                  <Trash2 size={13} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => togglePinConversation(currentConversation.id)}
                  className="hover:text-white transition-colors cursor-pointer -rotate-45"
                  title="Pin conversation"
                >
                  <Pin size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ) : currentConversation ? null : (
            <button
              type="button"
              onClick={startNewConversation}
              className="w-full text-left px-3.5 py-2 text-xs text-foreground-muted hover:text-foreground-muted"
            >
              Start new conversation...
            </button>
          )}

          {/* Real other conversations - styled as unselected items */}
          {sortedOtherConversations.map((c) => (
            <div
              key={c.id}
              className="group flex items-center justify-between px-3.5 py-2 text-[13px] text-foreground-muted hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => selectConversation(c.id)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {c.title}
              </button>
              <div className="flex items-center gap-1 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinConversation(c.id);
                  }}
                  className="text-foreground-muted hover:text-foreground transition-colors p-0.5"
                  title="Pin conversation"
                >
                  <Pin size={13} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="text-foreground-muted hover:text-rose-400 transition-colors p-0.5"
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="px-3.5 py-3 text-xs text-foreground-muted">
              No conversations yet
            </div>
          )}
        </div>
      </section>

      {/* Bottom Pinned: Settings Button */}
      <div className="p-4 pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => openModal('settings')}
          className="w-full text-foreground-muted hover:text-white flex items-center gap-3 px-3 py-2.5 text-[14px] transition-colors cursor-pointer rounded-xl hover:bg-white/[0.04]"
        >
          <Settings size={17} strokeWidth={1.8} className="text-foreground-muted" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
