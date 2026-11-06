import React from 'react';
import { PanelLeft } from 'lucide-react';
import type { ProjectWorkspace } from '@/types';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  selectedWorkspace: ProjectWorkspace | null;
  currentConversationTitle?: string;
}

export function formatConversationBreadcrumb(title: string | undefined): string {
  if (!title || !title.trim()) return 'New conversation';
  const trimmed = title.trim();
  const words = trimmed.split(/\s+/);
  const firstThree = words.slice(0, 3).join(' ');

  if (firstThree.length > 15) {
    return firstThree.slice(0, 15).trim() + '...';
  }
  if (words.length > 3 || trimmed.length > firstThree.length) {
    return firstThree + '...';
  }
  return firstThree;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarCollapsed,
  toggleSidebar,
  selectedWorkspace,
  currentConversationTitle = 'New conversation',
}) => {
  const projectName = selectedWorkspace?.name || 'No Project';
  const shortTitle = formatConversationBreadcrumb(currentConversationTitle);

  return (
    <header className="h-14 px-6 flex items-center justify-between select-none bg-transparent shrink-0 z-10">
      <div className="flex items-center gap-3 min-w-0 pr-40">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 text-foreground-muted hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Open sidebar"
          >
            <PanelLeft size={18} strokeWidth={1.8} />
          </button>
        )}
        <h1 className="text-[17px] font-normal tracking-tight text-foreground-muted truncate">
          <span className="text-foreground font-medium">{projectName}</span>
          <span className="text-foreground-muted mx-2 font-light">/</span>
          <span className="text-foreground-muted" title={currentConversationTitle}>
            {shortTitle}
          </span>
        </h1>
      </div>
    </header>
  );
};
