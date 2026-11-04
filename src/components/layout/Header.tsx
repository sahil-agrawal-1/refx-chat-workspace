import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import type { ActiveModal, ActiveDrawer } from '@/types';
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
  const { startNewConversation, openWorkspaceDialog } = useAppStore();
  const isTerminalOpen = bottomPanels.has('terminal');
  const isDiffOpen = bottomPanels.has('diff');

  return (
    <header className="h-12 shrink-0 bg-[#141416]/90 backdrop-blur-md border-b border-[#242427] flex items-center justify-between px-4 text-xs select-none z-10">
      {/* Left: Brand title "Ask AI" / REFX Chat */}
      <div className="flex items-center gap-3 truncate">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            title="Open Sidebar"
            aria-label="Open Sidebar"
          >
            <PanelLeft size={16} strokeWidth={1.8} />
          </button>
        )}

        <div className="flex items-center gap-2">
          {isSidebarCollapsed && <Logo width={18} height={18} className="w-4 h-4" />}
          <span className="text-sm font-semibold tracking-tight text-white">Ask AI</span>
          {selectedWorkspace && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1e1e24] border border-white/5 text-[11px] text-zinc-400 font-mono">
              {selectedWorkspace.name}
            </span>
          )}
        </div>
      </div>

      {/* Right Toolbar: Quick Pills (matching Image 2) + Dev Tools */}
      <div className="flex items-center gap-2">
        {/* Quick action pills from Image 2 */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleDrawer('history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181b] hover:bg-[#222226] border border-white/5 hover:border-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs"
            title="Search conversations"
          >
            <Search size={13} strokeWidth={2} className="text-zinc-400" />
            <span>Search thread</span>
          </button>

          <button
            type="button"
            onClick={openWorkspaceDialog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181b] hover:bg-[#222226] border border-white/5 hover:border-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs"
            title="Open or create workspace folder"
          >
            <FolderPlus size={13} strokeWidth={2} className="text-zinc-400" />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer text-xs font-medium shadow-xs active:scale-95"
            title="Start new conversation"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>New chat</span>
          </button>
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px h-4 bg-white/10 mx-1" />

        {/* Dev View Controls: Files | Diff | Terminal as segmented pill */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-[#18181b] border border-[#27272a]">
          <button
            type="button"
            onClick={() => toggleDrawer('file-explorer')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-xs ${
              activeDrawer === 'file-explorer'
                ? 'bg-[#27272d] text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
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
                ? 'bg-[#27272d] text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Toggle Diff Review"
          >
            <Split size={13} strokeWidth={1.8} />
            <span className="hidden sm:inline">Diff</span>
            {pendingChangesCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                {pendingChangesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleBottomPanel('terminal')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors cursor-pointer text-xs ${
              isTerminalOpen
                ? 'bg-[#27272d] text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
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
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
            title="Export Conversation"
            aria-label="Export Conversation"
          >
            <Download size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => openModal('onboarding')}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
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
