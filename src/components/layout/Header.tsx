import React from 'react';
import {
  PanelLeft,
  FolderTree,
  Split,
  Terminal,
  Download,
  HelpCircle,
  Search,
  FolderPlus,
  Plus,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import type { ActiveModal, ActiveDrawer } from '@/types';
import { useState } from 'react';
import type { Conversation } from '@/types';
import { useAppStore } from '@/stores/app-store';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  selectedWorkspace: { name: string } | null;
  toggleDrawer: (drawer: ActiveDrawer) => void;
  openModal: (modal: ActiveModal) => void;
  activeDrawer: ActiveDrawer;
  bottomPanels: Set<'terminal' | 'diff'>;
  toggleBottomPanel: (panel: 'terminal' | 'diff') => void;
  pendingChangesCount?: number;
  conversations?: Conversation[];
  onSelectConversation?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed,
  toggleSidebar,
  selectedWorkspace,
  toggleDrawer,
  openModal,
  activeDrawer,
  bottomPanels,
  toggleBottomPanel,
  pendingChangesCount = 0,
  conversations = [],
  onSelectConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { startNewConversation, openWorkspaceDialog } = useAppStore();
  const isTerminalOpen = bottomPanels.has('terminal');
  const isDiffOpen = bottomPanels.has('diff');

  return (
    <header className="h-12 shrink-0 bg-surface-raised/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 text-xs select-none z-10 transition-colors">
      {/* Left: Brand title "Ask AI" / REFX Chat */}
      <div className="flex items-center gap-3 truncate">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface rounded-xl transition-all cursor-pointer"
            title="Open Sidebar"
            aria-label="Open Sidebar"
          >
            <PanelLeft size={16} strokeWidth={1.8} />
          </button>
        )}

        <div className="flex items-center gap-2">
          {isSidebarCollapsed && <Logo width={18} height={18} className="w-4 h-4" />}
          <span className="text-sm font-semibold tracking-tight text-foreground">Ask AI</span>
          {selectedWorkspace && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface border border-border text-[11px] text-foreground-muted font-mono">
              {selectedWorkspace.name}
            </span>
          )}
        </div>
      </div>

      {/* Right Toolbar: Quick Pills + Dev Tools */}
      <div className="flex items-center gap-2">
        {/* Quick action pills matching modern desktop AI */}
        <div className="hidden md:flex items-center gap-1.5">
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised border border-border text-foreground transition-all text-xs shadow-xs">
              <Search size={13} strokeWidth={2} className="text-foreground-muted" />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
                placeholder="Search thread"
                className="bg-transparent outline-none text-foreground placeholder:text-foreground-muted w-24 focus:w-48 transition-all"
              />
            </div>
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full mt-1 left-0 w-72 bg-surface-raised border border-border rounded-xl shadow-xl py-1 z-50 text-xs max-h-64 overflow-auto">
                {conversations
                  .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 20)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => { onSelectConversation?.(c.id); setSearchQuery(''); setShowSearchResults(false); }}
                      className="w-full text-left px-3 py-1.5 text-foreground hover:bg-surface cursor-pointer"
                    >
                      {c.title}
                    </button>
                  ))}
                {conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-foreground-muted">No matches</div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openWorkspaceDialog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised border border-border text-foreground transition-all cursor-pointer text-xs shadow-xs"
            title="Open or create workspace folder"
          >
            <FolderPlus size={13} strokeWidth={2} className="text-foreground-muted" />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-surface hover:opacity-90 transition-all cursor-pointer text-xs font-medium shadow-xs active:scale-95"
            title="Start new conversation"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>New chat</span>
          </button>
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px h-4 bg-border mx-1" />

        {/* Dev View Controls: Files | Diff | Terminal as segmented pill */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-surface border border-border">
          <button
            type="button"
            onClick={() => toggleDrawer('file-explorer')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-xs ${
              activeDrawer === 'file-explorer'
                ? 'bg-surface-raised text-foreground font-medium shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle File Explorer"
          >
            <FolderTree size={13} strokeWidth={1.8} />
            <span className="hidden sm:inline">Files</span>
          </button>
          <button
            type="button"
            onClick={() => toggleBottomPanel('diff')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-xs ${
              isDiffOpen
                ? 'bg-surface-raised text-foreground font-medium shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle Diff Review"
          >
            <Split size={13} strokeWidth={1.8} />
            <span className="hidden sm:inline">Diff</span>
            {pendingChangesCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500/20 text-amber-500 font-mono font-bold">
                {pendingChangesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleBottomPanel('terminal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-xs ${
              isTerminalOpen
                ? 'bg-surface-raised text-foreground font-medium shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle Terminal"
          >
            <Terminal size={13} strokeWidth={1.8} />
            <span className="hidden sm:inline">Terminal</span>
          </button>
        </div>

        {/* Utility icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openModal('export')}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface rounded-xl transition-all cursor-pointer"
            title="Export Conversation"
            aria-label="Export Conversation"
          >
            <Download size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => openModal('onboarding')}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface rounded-xl transition-all cursor-pointer"
            title="Setup Guide"
            aria-label="Setup Guide"
          >
            <HelpCircle size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
};
