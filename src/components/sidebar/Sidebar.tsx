import React from 'react';
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

  const otherConversations = conversations.filter(
    (c) => c.id !== currentConversation?.id
  );

  return (
    <aside className="refx-sidebar w-[280px] shrink-0 h-screen flex flex-col text-foreground z-20 select-none">
      {/* Top Header: Logo + Collapse Sidebar Button */}
      <div className="h-16 px-5 flex items-center justify-between pt-2">
        <Logo width={26} height={26} className="text-white" />
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
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
          className="w-full rounded-xl border border-zinc-800 bg-[#121215] hover:bg-[#18181c] text-white flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-normal transition-all cursor-pointer shadow-xs"
        >
          <SquarePen size={16} strokeWidth={1.8} className="text-zinc-300" />
          <span>New Conversation</span>
        </button>

        <button
          type="button"
          onClick={() => {}}
          className="w-full text-zinc-400 hover:text-zinc-200 flex items-center gap-3 px-3.5 py-2 text-[14px] font-normal transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03]"
        >
          <History size={16} strokeWidth={1.8} className="text-zinc-400" />
          <span>Conversation History</span>
        </button>

        <button
          type="button"
          onClick={() => openModal('settings')}
          className="w-full text-zinc-400 hover:text-zinc-200 flex items-center gap-3 px-3.5 py-2 text-[14px] font-normal transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03]"
        >
          <Clock size={16} strokeWidth={1.8} className="text-zinc-400" />
          <span>Schedule Tasks</span>
        </button>
      </div>

      {/* Projects Section */}
      <section className="px-4 pt-7">
        <div className="flex items-center justify-between text-zinc-200 text-[14px] font-medium mb-2.5 px-1">
          <span>Projects</span>
          <button
            type="button"
            onClick={openWorkspaceDialog}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Open project folder"
          >
            <FolderPlus size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="space-y-1.5">
          {/* Active selected project */}
          {selectedWorkspace ? (
            <div className="rounded-xl border border-zinc-800/80 bg-[#141416] px-3.5 py-2.5 flex items-center justify-between text-[13px] text-zinc-200 group">
              <button
                type="button"
                onClick={() => setWorkspace(selectedWorkspace)}
                className="min-w-0 flex flex-1 items-center gap-2.5 text-left truncate cursor-pointer"
              >
                <Folder size={16} strokeWidth={1.8} className="text-zinc-400 shrink-0" />
                <span className="truncate text-zinc-200 font-medium">{selectedWorkspace.name}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRecentWorkspace(selectedWorkspace.path);
                }}
                className="p-1 text-zinc-500 hover:text-rose-400 transition-colors ml-2 shrink-0 cursor-pointer"
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
                className="rounded-xl border border-zinc-800/80 bg-[#141416] px-3.5 py-2.5 flex items-center justify-between text-[13px] text-zinc-300 group hover:border-zinc-700 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setWorkspace(ws)}
                  className="min-w-0 flex flex-1 items-center gap-2.5 text-left truncate cursor-pointer"
                >
                  <Folder size={16} strokeWidth={1.8} className="text-zinc-400 shrink-0" />
                  <span className="truncate text-zinc-200">{ws.name}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentWorkspace(ws.path);
                  }}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition-colors ml-2 shrink-0 cursor-pointer"
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
              className="w-full rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-white/[0.02] px-3.5 py-2.5 flex items-center gap-2.5 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <FolderPlus size={16} strokeWidth={1.8} className="text-zinc-500" />
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
                  className="px-3.5 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-300 flex items-center justify-between group cursor-pointer transition-colors rounded-lg hover:bg-white/[0.02]"
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
        </div>
      </section>

      {/* Conversation Section */}
      <section className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-4 pt-7">
        <div className="flex items-center justify-between text-zinc-200 text-[14px] font-medium mb-2.5 px-1">
          <span>Conversation</span>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <button
              type="button"
              className="hover:text-zinc-200 p-1 rounded-md transition-colors cursor-pointer"
              title="Filter conversations"
            >
              <ListFilter size={15} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              className="hover:text-zinc-200 p-1 rounded-md transition-colors cursor-pointer"
              title="New conversation"
            >
              <SquarePen size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {/* Active conversation box */}
          {currentConversation ? (
            <div className="rounded-xl border border-zinc-800 bg-[#161619] px-3.5 py-2.5 flex items-center justify-between text-[13px] text-white shadow-xs group">
              <span className="truncate text-zinc-100 font-normal">
                {currentConversation.title || 'New conversation'}
              </span>
              <div className="flex items-center gap-1.5 text-zinc-400 shrink-0 ml-2">
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
                  className="hover:text-white transition-colors cursor-pointer -rotate-45"
                  title="Pin conversation"
                >
                  <Pin size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startNewConversation}
              className="w-full text-left px-3.5 py-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Start new conversation...
            </button>
          )}

          {/* Real other conversations - styled as unselected items */}
          {otherConversations.map((c) => (
            <div
              key={c.id}
              className="group flex items-center justify-between px-3.5 py-2 text-[13px] text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => selectConversation(c.id)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {c.title}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity ml-2 shrink-0 p-0.5"
                title="Delete conversation"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="px-3.5 py-3 text-xs text-zinc-600">
              No conversations yet
            </div>
          )}
        </div>
      </section>

      {/* Bottom Pinned: Settings Button */}
      <div className="p-4 pt-2 border-t border-zinc-900/60">
        <button
          type="button"
          onClick={() => openModal('settings')}
          className="w-full text-zinc-400 hover:text-white flex items-center gap-3 px-3 py-2.5 text-[14px] transition-colors cursor-pointer rounded-xl hover:bg-white/[0.04]"
        >
          <Settings size={17} strokeWidth={1.8} className="text-zinc-400" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
