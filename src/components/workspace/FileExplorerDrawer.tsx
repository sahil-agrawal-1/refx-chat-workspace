import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  ChevronRight,
  ChevronDown,
  X,
  FolderPlus,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { FileItem } from '@/types';

export const FileExplorerDrawer: React.FC = () => {
  const {
    activeDrawer,
    toggleDrawer,
    selectedWorkspace,
    fileTree,
    selectedFile,
    selectFile,
    openWorkspaceDialog,
    pendingChanges,
    loadDirectory,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  if (activeDrawer !== 'file-explorer') return null;

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = !prev[path];
      if (next) {
        const item = findItem(fileTree, path);
        if (item && item.isDirectory && (!item.children || item.children.length === 0)) {
          loadDirectory(path).catch(() => {});
        }
      }
      return { ...prev, [path]: next };
    });
  };

  const findItem = (items: FileItem[], target: string): FileItem | null => {
    for (const item of items) {
      if (item.path === target) return item;
      if (item.children) {
        const found = findItem(item.children, target);
        if (found) return found;
      }
    }
    return null;
  };

  const isFileModified = (path: string) => {
    return pendingChanges.some((c) => c.filePath === path && c.status === 'pending');
  };

  const renderTree = (items: FileItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = !!expandedFolders[item.path];
      const isSelected = selectedFile === item.path;
      const modified = isFileModified(item.path);

      if (item.isDirectory) {
        return (
          <div key={item.path} className="select-none">
            <div
              onClick={() => toggleFolder(item.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className="flex items-center gap-1.5 py-1 pr-2 rounded hover:bg-surface text-xs text-foreground-muted hover:text-foreground cursor-pointer transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={14} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
              ) : (
                <ChevronRight size={14} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
              ) : (
                <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </div>

            {isExpanded && item.children && (
              <div>{renderTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={item.path}
          onClick={() => selectFile(item.path)}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          className={`flex items-center justify-between py-1 pr-2.5 rounded text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-surface text-foreground font-medium'
              : 'text-foreground-muted hover:text-foreground hover:bg-surface'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <FileCode size={14} strokeWidth={1.8} className={`shrink-0 ${isSelected ? 'text-zinc-200' : 'text-foreground-muted'}`} />
            <span className="truncate">{item.name}</span>
          </div>

          {modified && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />
          )}
        </div>
      );
    });
  };

  return (
    <aside className="w-72 shrink-0 h-full bg-surface-raised border-l border-border flex flex-col z-10 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 truncate">
          <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
          <span className="font-medium text-foreground truncate">
            {selectedWorkspace ? selectedWorkspace.name : 'Workspace'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openWorkspaceDialog}
            className="p-1 text-foreground-muted hover:text-foreground rounded hover:bg-surface"
            title="Open Folder"
          >
            <FolderPlus size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => toggleDrawer(null)}
            className="p-1 text-foreground-muted hover:text-foreground rounded hover:bg-surface"
            title="Close Explorer"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Path Breadcrumb if workspace active */}
      {selectedWorkspace && (
        <div className="px-3.5 py-1.5 bg-surface border-b border-border text-[11px] font-mono text-foreground-muted truncate">
          {selectedWorkspace.path}
        </div>
      )}

      {/* File Tree or honest empty state */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {!selectedWorkspace ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mx-auto text-foreground-muted">
              <Folder size={16} strokeWidth={1.8} />
            </div>
            <div className="space-y-1">
              <h4 className="text-foreground font-medium text-xs">No workspace selected</h4>
              <p className="text-[11px] text-foreground-muted leading-relaxed">
                Select a folder to let the AI work with your project files.
              </p>
            </div>
            <button
              type="button"
              onClick={openWorkspaceDialog}
              className="w-full py-1.5 bg-[#252529] hover:bg-[#2d2d33] text-foreground rounded text-xs transition-colors cursor-pointer border border-[#313136]"
            >
              Select Folder
            </button>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="p-6 text-center text-foreground-muted space-y-1">
            <p className="text-xs">No files detected</p>
            <p className="text-[11px] text-[#55555d]">
              Directory indexing active in native Electron host.
            </p>
          </div>
        ) : (
          renderTree(fileTree)
        )}
      </div>

      <div className="p-2.5 border-t border-border text-[11px] text-foreground-muted flex items-center justify-between bg-surface">
        <span>Workspace Bridge</span>
        <span className="font-mono text-[#91919a]">
          {selectedWorkspace ? 'Connected' : 'Inactive'}
        </span>
      </div>
    </aside>
  );
};
