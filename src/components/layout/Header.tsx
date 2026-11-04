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
}) => {
  const isTerminalOpen = bottomPanels.has('terminal');
  const isDiffOpen = bottomPanels.has('diff');

  return (
    <header className="h-10 shrink-0 bg-[#161618] border-b border-[#242427] flex items-center justify-between px-3 text-xs select-none z-10">
      {/* Left: Sidebar toggle if collapsed + Title / Workspace */}
      <div className="flex items-center gap-2 truncate">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 text-[#888891] hover:text-white hover:bg-[#202023] rounded transition-colors cursor-pointer"
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
          <div className="flex items-center gap-1.5 text-[#71717a] text-xs font-mono truncate">
            <span className="text-[#9c9ca4] truncate">{selectedWorkspace.name}</span>
          </div>
        )}
      </div>

      {/* Right Toolbar Action Buttons */}
      <div className="flex items-center gap-1">
        {/* File Explorer Toggle */}
        <button
          type="button"
          onClick={() => toggleDrawer('file-explorer')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
            activeDrawer === 'file-explorer'
              ? 'bg-[#242428] text-white border border-[#303036]'
              : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
          }`}
          title="Toggle File Explorer"
        >
          <FolderTree size={14} strokeWidth={1.8} />
          <span className="hidden sm:inline">Files</span>
        </button>

        {/* Diff / Changes Toggle */}
        <button
          type="button"
          onClick={() => toggleBottomPanel('diff')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
            isDiffOpen
              ? 'bg-[#242428] text-white border border-[#303036]'
              : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
          }`}
          title="Toggle Diff Review"
        >
          <Split size={14} strokeWidth={1.8} />
          <span className="hidden sm:inline">Diff</span>
        </button>

        {/* Terminal Toggle */}
        <button
          type="button"
          onClick={() => toggleBottomPanel('terminal')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
            isTerminalOpen
              ? 'bg-[#242428] text-white border border-[#303036]'
              : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
          }`}
          title="Toggle Terminal"
        >
          <Terminal size={14} strokeWidth={1.8} />
          <span className="hidden sm:inline">Terminal</span>
        </button>

        {/* Export Chat */}
        <button
          type="button"
          onClick={() => openModal('export')}
          className="p-1 text-[#888891] hover:text-white hover:bg-[#1e1e21] rounded transition-colors cursor-pointer"
          title="Export Conversation"
          aria-label="Export Conversation"
        >
          <Download size={14} strokeWidth={1.8} />
        </button>

        {/* Setup Guide */}
        <button
          type="button"
          onClick={() => openModal('onboarding')}
          className="p-1 text-[#888891] hover:text-white hover:bg-[#1e1e21] rounded transition-colors cursor-pointer"
          title="Setup Guide"
          aria-label="Setup Guide"
        >
          <HelpCircle size={14} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
};
