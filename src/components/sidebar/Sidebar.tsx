import React from 'react';
import {
  Plus,
  History,
  Clock,
  FolderPlus,
  Settings,
  Folder,
  Layers,
  Trash2,
  Cpu,
  Brain,
  PanelLeftClose,
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
    openWorkspaceDialog,
    taskMemories,
    appMemories,
    providers,
  } = useAppStore();

  if (isSidebarCollapsed) {
    return null;
  }

  const connectedProvidersCount = providers.filter((p) => p.status === 'connected').length;

  return (
    <aside className="w-64 shrink-0 h-screen bg-surface-raised border-r border-border flex flex-col select-none text-foreground z-20">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center">
          <Logo width={36} height={48} className="w-6 h-6" />
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 text-foreground-muted hover:text-white hover:bg-[#222225] rounded-md transition-colors cursor-pointer"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Primary Actions */}
      <div className="px-3 py-2 space-y-1">
        {/* + New Conversation button */}
        <button
          type="button"
          onClick={startNewConversation}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#262629] hover:bg-[#2f2f33] text-white rounded-lg text-xs font-normal transition-colors text-left border border-[#313136] cursor-pointer"
        >
          <Plus size={16} strokeWidth={2} className="text-white" />
          <span>New Conversation</span>
        </button>

        {/* Navigation items */}
        <div className="pt-1 space-y-0.5">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[#a4a4ac] hover:text-white hover:bg-surface rounded-md transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <History size={16} strokeWidth={1.8} className="text-foreground-muted" />
              <span>Conversation History</span>
            </div>
            <span className="text-[11px] text-foreground-muted font-mono">
              {conversations.length}
            </span>
          </div>

          <div
            onClick={() => openModal('settings')}
            className="flex items-center justify-between px-3 py-1.5 text-xs text-[#a4a4ac] hover:text-white hover:bg-surface rounded-md transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.8} className="text-foreground-muted" />
              <span>Schedule Tasks</span>
            </div>
            <span className="text-[10px] text-foreground-muted font-mono">
              Stage 2
            </span>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="px-3 pt-3 pb-2 border-t border-border">
        <div className="flex items-center justify-between px-2 text-xs font-medium text-foreground-muted">
          <span>Projects</span>
          <button
            type="button"
            onClick={openWorkspaceDialog}
            className="p-1 hover:text-white hover:bg-[#222225] rounded transition-colors cursor-pointer"
            aria-label="Select workspace folder"
            title="Select workspace folder"
          >
            <FolderPlus size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Workspaces list or honest empty state */}
        <div className="mt-1 space-y-0.5">
          {recentWorkspaces.length === 0 && !selectedWorkspace ? (
            <div className="px-2.5 py-2 text-[11px] text-[#6d6d75] italic">
              No workspace selected
            </div>
          ) : (
            <>
              {selectedWorkspace && (
                <div
                  onClick={() => setWorkspace(selectedWorkspace)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer bg-surface text-white font-medium border border-border"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
                    <span className="truncate">{selectedWorkspace.name}</span>
                  </div>
                </div>
              )}
              {recentWorkspaces
                .filter((ws) => ws.path !== selectedWorkspace?.path)
                .map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => setWorkspace(ws)}
                    className="flex items-center justify-between px-2.5 py-1 rounded-md text-xs cursor-pointer text-[#91919a] hover:text-white hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Recent Conversations List or honest empty state */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 custom-scrollbar border-t border-border">
        <div className="px-2 pb-1 text-[11px] font-medium text-foreground-muted uppercase tracking-wider">
          Conversations
        </div>
        {conversations.length === 0 ? (
          <div className="px-2 py-4 text-center text-[11px] text-[#6b6b74]">
            No conversations yet.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = currentConversation?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#252529] text-white font-medium border border-border'
                    : 'text-[#91919a] hover:text-white hover:bg-[#1e1e21]'
                }`}
              >
                <span className="truncate flex-1 pr-1">{conv.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-red-400 rounded transition-opacity cursor-pointer"
                  title="Delete chat"
                  aria-label="Delete chat"
                >
                  <Trash2 size={14} strokeWidth={1.8} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Lower Navigation & Professional Status Indicators */}
      <div className="p-3 border-t border-border space-y-1 bg-surface">
        {/* Model Providers Button */}
        <button
          type="button"
          onClick={() => openModal('providers')}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-foreground-muted hover:text-white hover:bg-[#1e1e21] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Cpu size={16} strokeWidth={1.8} className="text-foreground-muted" />
            <span>Model Providers</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
              connectedProvidersCount > 0
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                : 'text-foreground-muted'
            }`}
          >
            {connectedProvidersCount > 0 ? `${connectedProvidersCount} connected` : 'None'}
          </span>
        </button>

        {/* Memory Manager Button */}
        <button
          type="button"
          onClick={() => openModal('memory')}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-foreground-muted hover:text-white hover:bg-[#1e1e21] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Brain size={16} strokeWidth={1.8} className="text-foreground-muted" />
            <span>Memory Manager</span>
          </div>
          <span className="text-[10px] text-foreground-muted font-mono">
            {taskMemories.length + appMemories.length}
          </span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => openModal('settings')}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-foreground-muted hover:text-white hover:bg-[#1e1e21] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings size={16} strokeWidth={1.8} className="text-foreground-muted" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] text-foreground-muted font-mono">v1.0</span>
        </button>

        {/* Stage Notice */}
        <div className="pt-2 px-1">
          <div className="flex items-center justify-between text-[10px] text-[#606068] px-1 py-0.5">
            <span className="flex items-center gap-1">
              <Layers size={14} strokeWidth={1.8} />
              Desktop Bridge
            </span>
            <span className="font-mono text-zinc-400">Stage 1</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
