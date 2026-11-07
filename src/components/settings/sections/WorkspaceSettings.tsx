import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { desktopBridge } from '@/desktop/browser-preview-bridge';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsToggle } from '../components/SettingsToggle';
import { SettingsEmptyState } from '../components/SettingsEmptyState';
import {
  Folder,
  FolderOpen,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface TrashItem {
  id: string;
  type: string;
  data: any;
  deletedAt: number;
}

export const WorkspaceSettings: React.FC = () => {
  const {
    selectedWorkspace,
    openWorkspaceDialog,
    settings,
    updateSetting,
    fileTree,
  } = useAppStore();

  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  const ignoredPatterns =
    (settings.ignoredPatterns as string) ||
    'node_modules, target, .git, dist, build, .env, .next';
  const autoScanWorkspace = (settings.autoScanWorkspace as boolean) ?? true;
  const followSymlinks = (settings.followSymlinks as boolean) ?? false;

  const loadTrash = async () => {
    setIsLoadingTrash(true);
    try {
      const items = await desktopBridge.trash.listTrash();
      setTrashItems(Array.isArray(items) ? items : []);
    } catch {
      setTrashItems([]);
    } finally {
      setIsLoadingTrash(false);
    }
  };

  useEffect(() => {
    void loadTrash();
  }, []);

  const handleRestore = async (item: TrashItem) => {
    try {
      await desktopBridge.trash.restoreTrash(item.id);
      setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
      setRestoreNotice(`Restored ${item.data?.name || item.data?.title || item.type}`);
      setTimeout(() => setRestoreNotice(null), 3000);
    } catch (err) {
      console.error('Failed to restore:', err);
    }
  };

  const handlePurge = async (id: string) => {
    if (!confirm('Permanently delete this backup record? This action cannot be undone.')) {
      return;
    }
    try {
      await desktopBridge.trash.purgeTrash(id);
      setTrashItems((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to purge:', err);
    }
  };

  const handleClearAllTrash = async () => {
    if (!confirm('Permanently delete all items from the Backup Bin?')) return;
    try {
      for (const item of trashItems) {
        await desktopBridge.trash.purgeTrash(item.id);
      }
      setTrashItems([]);
    } catch (err) {
      console.error('Failed to clear trash:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Status Card */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">Active Workspace</h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Target project directory monitored for code editing, terminal execution, and indexing.
          </p>
        </div>

        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md bg-[#141416] border border-[#303034] flex items-center justify-center text-[#F2F2F2] shrink-0">
                <Folder size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#F2F2F2] truncate">
                  {selectedWorkspace?.name || 'No workspace opened'}
                </div>
                <div className="text-[11px] font-mono text-[#A1A1AA] truncate mt-0.5">
                  {selectedWorkspace?.path || 'Select a folder to initialize workspace containment'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={openWorkspaceDialog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F2F2F2] hover:bg-white text-[#171717] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <FolderOpen size={13} />
              <span>{selectedWorkspace ? 'Change Folder...' : 'Open Folder...'}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#303034] flex items-center justify-between text-[11px] text-[#71717A]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Filesystem operations strictly sandboxed to active workspace root</span>
            </span>
            <span className="font-mono text-[#A1A1AA]">
              {fileTree.length} root items monitored
            </span>
          </div>
        </div>
      </section>

      {/* File Management & Ignored Patterns */}
      <SettingsSection
        title="File Indexing & Exclusions"
        description="Filter patterns and scanning preferences for repository context."
      >
        <div className="p-3.5 space-y-2">
          <label className="text-[11px] font-medium text-[#A1A1AA]">Ignored File Patterns</label>
          <textarea
            value={ignoredPatterns}
            onChange={(e) => updateSetting('ignoredPatterns', e.target.value)}
            rows={2}
            placeholder="node_modules, .git, dist, build, .env"
            className="w-full bg-[#141416] border border-[#303034] rounded-md p-2.5 text-xs font-mono text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] resize-none"
          />
          <p className="text-[10px] text-[#71717A]">
            Comma-separated glob patterns excluded from search indexing, tree scanning, and AI prompts.
          </p>
        </div>

        <SettingsRow
          label="Auto-Scan on Open"
          description="Index workspace directory structure immediately when opened."
        >
          <SettingsToggle
            checked={autoScanWorkspace}
            onChange={(val) => updateSetting('autoScanWorkspace', val)}
            ariaLabel="Auto-scan on open"
          />
        </SettingsRow>

        <SettingsRow
          label="Follow Symlinks"
          description="Resolve symbolic links when traversing directory hierarchies."
        >
          <SettingsToggle
            checked={followSymlinks}
            onChange={(val) => updateSetting('followSymlinks', val)}
            ariaLabel="Follow symlinks"
          />
        </SettingsRow>
      </SettingsSection>

      {/* Backup Bin */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">
              Backup Bin
            </h3>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">
              Deleted workspaces and conversations are held here for 7 days before permanent removal.
            </p>
          </div>

          {trashItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllTrash}
              className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-[#242426] border border-[#303034] rounded-md transition-colors cursor-pointer"
            >
              Empty Bin
            </button>
          )}
        </div>

        {restoreNotice && (
          <div className="p-2.5 rounded-md bg-[#242426] border border-[#303034] text-xs text-emerald-300 flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>{restoreNotice}</span>
          </div>
        )}

        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 overflow-hidden">
          {trashItems.length === 0 ? (
            <SettingsEmptyState
              icon={<Trash2 size={18} />}
              title="Backup bin is empty"
              description="No deleted workspaces or conversation records are currently in the 7-day retention bin."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="divide-y divide-[#303034]/70 max-h-64 overflow-y-auto custom-scrollbar">
              {trashItems.map((item) => {
                const title = item.data?.name || item.data?.title || item.id;
                const dateStr = item.deletedAt
                  ? new Date(item.deletedAt).toLocaleString()
                  : 'Recently';
                return (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#242426]/30 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#F2F2F2] truncate">
                          {title}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#141416] border border-[#303034] text-[#A1A1AA] capitalize">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#71717A] font-mono">
                        Deleted: {dateStr}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[#F2F2F2] bg-[#242426] hover:bg-[#303034] border border-[#303034] transition-colors cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePurge(item.id)}
                        className="p-1.5 text-[#71717A] hover:text-rose-400 hover:bg-[#242426] rounded border border-[#303034] transition-colors cursor-pointer"
                        title="Permanently Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
