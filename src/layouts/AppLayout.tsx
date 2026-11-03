import React from 'react';
import {
  PanelLeft,
  FolderTree,
  Terminal,
  Split,
  Download,
  HelpCircle,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatPromptInput } from '@/components/chat/ChatPromptInput';
import { Logo } from '@/components/ui/Logo';
import { FileExplorerDrawer } from '@/components/workspace/FileExplorerDrawer';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { DiffReviewPanel } from '@/components/diff/DiffReviewPanel';
import { ProviderModal } from '@/components/providers/ProviderModal';
import { MemoryModal } from '@/components/memory/MemoryModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PermissionModal } from '@/components/dialogs/PermissionModal';
import { ExportChatModal } from '@/components/dialogs/ExportChatModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

export const AppLayout: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    activeDrawer,
    toggleDrawer,
    bottomPanel,
    setBottomPanel,
    openModal,
    selectedWorkspace,
    pendingChanges,
    notification,
    dismissNotification,
  } = useAppStore();

  const pendingChangesCount = pendingChanges.filter((c) => c.status === 'pending').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121214] text-[#e4e4e7] antialiased font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header / Windows Title Bar Area */}
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
                <span className="text-[#9c9ca4] truncate">
                  {selectedWorkspace.name}
                </span>
              </div>
            )}
          </div>

          {/* Right Toolbar Action Buttons */}
          <div className="flex items-center gap-1">
            {/* File Explorer Toggle */}
            <button
              type="button"
              onClick={() => toggleDrawer('file-explorer')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                activeDrawer === 'file-explorer'
                  ? 'bg-[#242428] text-white font-medium border border-[#303036]'
                  : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
              }`}
              title="Toggle Files"
            >
              <FolderTree size={14} strokeWidth={1.8} />
              <span className="hidden sm:inline">Files</span>
            </button>

            {/* Diffs Review Toggle */}
            <button
              type="button"
              onClick={() => setBottomPanel(bottomPanel === 'diff' ? null : 'diff')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                bottomPanel === 'diff'
                  ? 'bg-[#242428] text-white font-medium border border-[#303036]'
                  : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
              }`}
              title="Toggle Modifications"
            >
              <Split size={14} strokeWidth={1.8} />
              <span className="hidden sm:inline">Diff</span>
              {pendingChangesCount > 0 && (
                <span className="px-1 text-[10px] rounded bg-zinc-800 text-zinc-300 font-mono">
                  {pendingChangesCount}
                </span>
              )}
            </button>

            {/* Integrated Terminal Toggle */}
            <button
              type="button"
              onClick={() => setBottomPanel(bottomPanel === 'terminal' ? null : 'terminal')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer text-xs ${
                bottomPanel === 'terminal'
                  ? 'bg-[#242428] text-white font-medium border border-[#303036]'
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

        {/* Notification Toast */}
        {notification && (
          <div className="bg-[#18181b] border-b border-[#242427] px-4 py-1.5 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle2 size={14} strokeWidth={1.8} className="text-emerald-400 shrink-0" />}
              {notification.type === 'warning' && <AlertCircle size={14} strokeWidth={1.8} className="text-amber-400 shrink-0" />}
              {notification.type === 'info' && <Info size={14} strokeWidth={1.8} className="text-[#888891] shrink-0" />}
              <div>
                <span className="font-medium text-white">{notification.title}: </span>
                <span className="text-[#9c9ca4]">{notification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissNotification}
              className="p-1 text-[#71717a] hover:text-white rounded cursor-pointer"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Central Workspace Layout: Left Content, Right Explorer Drawer */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ChatMessageList />
            <ChatPromptInput />
          </div>

          <FileExplorerDrawer />
        </div>

        {/* Bottom Panels */}
        <TerminalPanel />
        <DiffReviewPanel />
      </div>

      {/* Modals */}
      <ProviderModal />
      <MemoryModal />
      <SettingsModal />
      <PermissionModal />
      <ExportChatModal />
      <OnboardingModal />
    </div>
  );
};
