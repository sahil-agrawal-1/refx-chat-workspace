import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatPromptInput } from '@/components/chat/ChatPromptInput';
import { Header } from '@/components/layout/Header';
import { FileExplorerDrawer } from '@/components/workspace/FileExplorerDrawer';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { DiffReviewPanel } from '@/components/diff/DiffReviewPanel';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PermissionModal } from '@/components/dialogs/PermissionModal';
import { ExportChatModal } from '@/components/dialogs/ExportChatModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  Terminal,
  X,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    activeDrawer,
    toggleDrawer,
    bottomPanels,
    toggleBottomPanel,
    selectedWorkspace,
    pendingChanges,
    currentConversation,
    selectedFile,
    selectedFileContent,
    notification,
    dismissNotification,
  } = useAppStore();

  const pendingChangesCount = pendingChanges.filter((c) => c.status === 'pending').length;
  const hasBottomPanel = bottomPanels.size > 0;
  const hasBothPanels = bottomPanels.has('terminal') && bottomPanels.has('diff');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-foreground antialiased font-sans select-none">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative bg-black">
        {/* Clean Top Header (Breadcrumbs) */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          selectedWorkspace={selectedWorkspace}
          currentConversationTitle={currentConversation?.title || 'New conversation'}
        />

        {/* Floating Overview Widget (Top-Right, matching Figma design) */}
        <div className="absolute right-6 top-4 z-20">
          <div className="rounded-xl border border-zinc-800/80 bg-[#111114]/90 p-2 shadow-2xl backdrop-blur-md min-w-[130px] space-y-1">
            <div className="text-[11px] font-medium text-zinc-500 px-2 py-0.5 select-none">
              Overview
            </div>
            <button
              type="button"
              onClick={() => toggleBottomPanel('diff')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                bottomPanels.has('diff')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-zinc-400" />
                <span>Review</span>
              </div>
              {pendingChangesCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full">
                  {pendingChangesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleBottomPanel('terminal')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                bottomPanels.has('terminal')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
              }`}
            >
              <Terminal size={14} className="text-zinc-400" />
              <span>Terminal</span>
            </button>
            <button
              type="button"
              onClick={() => toggleDrawer('file-explorer')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                activeDrawer === 'file-explorer'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
              }`}
            >
              <Terminal size={14} className="text-zinc-400" />
              <span>Terminal</span>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-1.5 flex items-center justify-between text-xs animate-in slide-in-from-top-1 z-30">
            <div className="flex items-center gap-2">
              {notification.type === 'success' && (
                <CheckCircle2 size={14} strokeWidth={1.8} className="text-emerald-400 shrink-0" />
              )}
              {notification.type === 'warning' && (
                <AlertCircle size={14} strokeWidth={1.8} className="text-amber-400 shrink-0" />
              )}
              {notification.type === 'info' && (
                <Info size={14} strokeWidth={1.8} className="text-zinc-400 shrink-0" />
              )}
              <div>
                <span className="font-medium text-zinc-100">{notification.title}: </span>
                <span className="text-zinc-400">{notification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissNotification}
              className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Central Workspace Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatMessageList />
          <ChatPromptInput />
          <FileExplorerDrawer />
        </div>

        {/* File preview bar if a file was selected from drawer */}
        {selectedFileContent !== null && (
          <div className="h-44 border-t border-zinc-800 bg-[#0c0c0e] flex flex-col shrink-0">
            <div className="px-3 py-1.5 border-b border-zinc-800 text-xs text-zinc-400 font-mono truncate">
              {selectedFile}
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-zinc-200 whitespace-pre-wrap">
              {selectedFileContent}
            </pre>
          </div>
        )}

        {/* Bottom Docked Panels: Terminal / Diff side-by-side */}
        {hasBottomPanel && (
          <div
            className={`flex w-full border-t border-zinc-800 bg-[#0c0c0e] shrink-0 ${
              hasBothPanels ? 'flex-row' : 'flex-col'
            }`}
          >
            {bottomPanels.has('terminal') && (
              <div
                className={`flex flex-col min-w-0 ${
                  hasBothPanels ? 'flex-1 border-r border-zinc-800' : 'w-full'
                }`}
              >
                <TerminalPanel />
              </div>
            )}
            {bottomPanels.has('diff') && (
              <div className={`flex flex-col min-w-0 ${hasBothPanels ? 'flex-1' : 'w-full'}`}>
                <DiffReviewPanel />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals: Unified Settings (housing Models & Memory), Permissions, Export, Onboarding */}
      <SettingsModal />
      <PermissionModal />
      <ExportChatModal />
      <OnboardingModal />
    </div>
  );
};
