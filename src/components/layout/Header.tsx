import React from 'react';
import {
  PanelLeft,
  FolderTree,
  Split,
  Terminal,
  Download,
  HelpCircle,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import type { ActiveModal, ActiveDrawer } from '@/types';

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
}) => {
  const isTerminalOpen = bottomPanels.has('terminal');
  const isDiffOpen = bottomPanels.has('diff');

  return (
    <header className="h-10 shrink-0 bg-surface-raised border-b border-border flex items-center justify-between px-3 text-xs select-none z-10">
      {/* Left: Sidebar toggle if collapsed + Title / Workspace */}
      <div className="flex items-center gap-2 truncate">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 text-foreground-muted hover:text-foreground hover:bg-surface rounded transition-colors cursor-pointer"
            title="Open Sidebar"
            aria-label="Open Sidebar"
          >
            <PanelLeft size={16} strokeWidth={1.8} />
          </button>
        )}

        {isSidebarCollapsed && (
          <div className="flex items-center">
            <Logo width={16} height={16} className="w-4 h-4" />
          </div>
        )}

        {selectedWorkspace && (
          <div className="flex items-center gap-1.5 text-foreground-muted text-xs font-mono truncate">
            <span className="text-foreground-muted truncate">{selectedWorkspace.name}</span>
          </div>
        )}
      </div>

      {/* Right Toolbar Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Primary view controls as a segmented pill */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-raised border border-border">
          <button
            type="button"
            onClick={() => toggleDrawer('file-explorer')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              activeDrawer === 'file-explorer'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle File Explorer"
          >
            <FolderTree size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">Files</span>
          </button>
          <button
            type="button"
            onClick={() => toggleBottomPanel('diff')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              isDiffOpen
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle Diff Review"
          >
            <Split size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">Diff</span>
            {pendingChangesCount > 0 && (
              <span className="ml-0.5 px-1 text-[10px] rounded bg-amber-900/40 text-amber-300 font-mono">
                {pendingChangesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleBottomPanel('terminal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs ${
              isTerminalOpen
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
            title="Toggle Terminal"
          >
            <Terminal size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">Terminal</span>
          </button>
        </div>

        {/* Utility icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openModal('export')}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-[#1e1e21] rounded-md transition-colors cursor-pointer"
            title="Export Conversation"
            aria-label="Export Conversation"
          >
            <Download size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => openModal('onboarding')}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-[#1e1e21] rounded-md transition-colors cursor-pointer"
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
