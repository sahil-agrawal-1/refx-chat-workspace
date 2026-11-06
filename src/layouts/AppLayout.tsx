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
  Files,
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
    conversations,
    selectConversation,
    deleteConversation,
    activeModal,
    closeModal,
    selectedFile,
    selectedFileContent,
    notification,
    dismissNotification,
  } = useAppStore();

  const pendingChangesCount = pendingChanges.filter((c) => c.status === 'pending').length;
  const hasBottomPanel = bottomPanels.size > 0;
  const hasBothPanels = bottomPanels.has('terminal') && bottomPanels.has('diff');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-foreground antialiased font-sans select-none">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative bg-surface">
        {/* Clean Top Header (Breadcrumbs) */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          selectedWorkspace={selectedWorkspace}
          currentConversationTitle={currentConversation?.title || 'New conversation'}
        />

        {/* Floating Overview Widget (Top-Right, matching Figma design) */}
        <div
          className={`absolute top-4 z-20 transition-all duration-300 ${
            activeDrawer === 'file-explorer' ? 'right-[318px]' : 'right-6'
          }`}
        >
          <div
            className={`rounded-xl border border-border/80 bg-surface-raised/90 p-2 shadow-2xl backdrop-blur-md space-y-1 transition-all duration-300 overflow-hidden ${
              activeDrawer === 'file-explorer' ? 'w-11 min-w-0' : 'min-w-[130px]'
            }`}
          >
            {activeDrawer !== 'file-explorer' && (
              <div className="text-[11px] font-medium text-foreground-muted px-2 py-0.5 select-none">
                Overview
              </div>
            )}
            <button
              type="button"
              onClick={() => toggleBottomPanel('diff')}
              className={`w-full flex items-center rounded-lg text-xs transition-all duration-200 cursor-pointer ${
                activeDrawer === 'file-explorer'
                  ? 'justify-center px-0 py-1.5'
                  : 'justify-between px-2.5 py-1.5'
              } ${
                bottomPanels.has('diff')
                  ? 'bg-surface-raised text-white'
                  : 'text-foreground-muted hover:bg-surface-raised/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-foreground-muted shrink-0" />
                {activeDrawer !== 'file-explorer' && <span>Review</span>}
              </div>
              {activeDrawer !== 'file-explorer' && pendingChangesCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full">
                  {pendingChangesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleBottomPanel('terminal')}
              className={`w-full flex items-center rounded-lg text-xs transition-all duration-200 cursor-pointer ${
                activeDrawer === 'file-explorer'
                  ? 'justify-center px-0 py-1.5'
                  : 'gap-2 px-2.5 py-1.5'
              } ${
                bottomPanels.has('terminal')
                  ? 'bg-surface-raised text-white'
                  : 'text-foreground-muted hover:bg-surface-raised/60 hover:text-white'
              }`}
            >
              <Terminal size={14} className="text-foreground-muted shrink-0" />
              {activeDrawer !== 'file-explorer' && <span>Terminal</span>}
            </button>
            <button
              type="button"
              onClick={() => toggleDrawer('file-explorer')}
              className={`w-full flex items-center rounded-lg text-xs transition-all duration-200 cursor-pointer ${
                activeDrawer === 'file-explorer'
                  ? 'justify-center px-0 py-1.5'
                  : 'gap-2 px-2.5 py-1.5'
              } ${
                activeDrawer === 'file-explorer'
                  ? 'bg-surface-raised text-white'
                  : 'text-foreground-muted hover:bg-surface-raised/60 hover:text-white'
              }`}
            >
              <Files size={14} className="text-foreground-muted shrink-0" />
              {activeDrawer !== 'file-explorer' && <span>Files</span>}
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-surface border-b border-border px-4 py-1.5 flex items-center justify-between text-xs animate-in slide-in-from-top-1 z-30">
            <div className="flex items-center gap-2">
              {notification.type === 'success' && (
                <CheckCircle2 size={14} strokeWidth={1.8} className="text-emerald-400 shrink-0" />
              )}
              {notification.type === 'warning' && (
                <AlertCircle size={14} strokeWidth={1.8} className="text-amber-400 shrink-0" />
              )}
              {notification.type === 'info' && (
                <Info size={14} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
              )}
              <div>
                <span className="font-medium text-foreground">{notification.title}: </span>
                <span className="text-foreground-muted">{notification.message}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissNotification}
              className="p-1 text-foreground-muted hover:text-white rounded cursor-pointer"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {/* Central Workspace Canvas */}
        <div className="flex-1 flex overflow-hidden relative min-h-0 transition-all duration-300 pr-60">
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            <ChatMessageList />
            <ChatPromptInput />
          </div>
        </div>

        <FileExplorerDrawer />

        {/* File preview bar if a file was selected from drawer */}
        {selectedFileContent !== null && (
          <div className="h-44 border-t border-border bg-surface flex flex-col shrink-0">
            <div className="px-3 py-1.5 border-b border-border text-xs text-foreground-muted font-mono truncate">
              {selectedFile}
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-foreground whitespace-pre-wrap">
              {selectedFileContent}
            </pre>
          </div>
        )}

        {/* Bottom Docked Panels: Terminal / Diff side-by-side */}
        {hasBottomPanel && (
          <div
            className={`flex w-full border-t border-border bg-surface shrink-0 ${
              hasBothPanels ? 'flex-row' : 'flex-col'
            }`}
          >
            {bottomPanels.has('terminal') && (
              <div
                className={`flex flex-col min-w-0 ${
                  hasBothPanels ? 'flex-1 border-r border-border' : 'w-full'
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

              {/* Conversation History (full-page overlay) */}
        {activeModal === 'conversation-history' && (
          <div className="absolute inset-0 z-30 bg-surface overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Conversation History</h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg cursor-pointer"
                  title="Close"
                >
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>
              {conversations.length === 0 ? (
                <div className="text-foreground-muted text-sm">No conversations yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        selectConversation(conv.id);
                        closeModal();
                      }}
                      className="h-[64px] w-[200px] rounded-xl border border-border bg-surface-raised px-3 py-2 text-left flex flex-col justify-center gap-1 hover:bg-surface-card transition-colors cursor-pointer"
                    >
                      <span className="truncate text-foreground text-[13px] font-medium">
                        {conv.title || 'New conversation'}
                      </span>
                      <span className="text-[11px] text-foreground-muted truncate">
                        {new Date(conv.updatedAt || conv.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

{/* Modals: Unified Settings (housing Models & Memory), Permissions, Export, Onboarding */}
      <SettingsModal />
      <PermissionModal />
      <ExportChatModal />
      <OnboardingModal />
    </div>
  );
};
