import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatPromptInput } from '@/components/chat/ChatPromptInput';
import { Header } from '@/components/layout/Header';
import { FileExplorerDrawer } from '@/components/workspace/FileExplorerDrawer';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { DiffReviewPanel } from '@/components/diff/DiffReviewPanel';
import { ProviderModal } from '@/components/providers/ProviderModal';
import { MemoryModal } from '@/components/memory/MemoryModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PermissionModal } from '@/components/dialogs/PermissionModal';
import { ExportChatModal } from '@/components/dialogs/ExportChatModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    activeDrawer,
    toggleDrawer,
    bottomPanels,
    toggleBottomPanel,
    openModal,
    selectedWorkspace,
    pendingChanges,
    selectedFile,
    selectedFileContent,
    notification,
    dismissNotification,
  } = useAppStore();

  const pendingChangesCount = pendingChanges.filter((c) => c.status === 'pending').length;

  const hasBottomPanel = bottomPanels.size > 0;
  const hasBothPanels = bottomPanels.has('terminal') && bottomPanels.has('diff');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121214] text-[#e4e4e7] antialiased font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header (extracted component) */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          selectedWorkspace={selectedWorkspace}
          toggleDrawer={toggleDrawer}
          openModal={openModal}
          activeDrawer={activeDrawer}
          bottomPanels={bottomPanels}
          toggleBottomPanel={toggleBottomPanel}
          pendingChangesCount={pendingChangesCount}
        />

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

        {selectedFileContent !== null && (
          <div className="h-48 border-t border-[#242427] bg-[#131315] flex flex-col">
            <div className="px-3 py-1.5 border-b border-[#242427] text-xs text-[#9c9ca4] font-mono truncate">
              {selectedFile}
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-[#dedee3] whitespace-pre-wrap">{selectedFileContent}</pre>
          </div>
        )}

        {/* Bottom Panels: Terminal + Diff side by side when both open */}
        {hasBottomPanel && (
          <div className={`flex w-full border-t border-[#242427] bg-[#131315] ${
            hasBothPanels ? 'flex-row' : 'flex-col'
          }`}>
            {bottomPanels.has('terminal') && (
              <div className={`flex flex-col min-w-0 ${hasBothPanels ? 'flex-1 border-r border-[#242427]' : 'w-full'}`}>
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
