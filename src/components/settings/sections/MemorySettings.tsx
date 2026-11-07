import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { AppMemoryEntry, TaskMemoryEntry } from '@/types';
import { SettingsSearchInput } from '../components/SettingsSearchInput';
import { SettingsSegmentedControl } from '../components/SettingsSegmentedControl';
import { SettingsToggle } from '../components/SettingsToggle';
import { SettingsEmptyState } from '../components/SettingsEmptyState';
import {
  Brain,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  Folder,
  Check,
  X,
  FileText,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export const MemorySettings: React.FC = () => {
  const {
    taskMemories,
    appMemories,
    memoryConfig,
    addTaskMemory,
    deleteTaskMemory,
    addAppMemory,
    deleteAppMemory,
    toggleAppMemory,
    exportMemoryBackup,
    purgeExpiredMemories,
    memoryGovernance,
    refreshMemoryGovernance,
    resolveMemoryConflict,
    dismissMemoryConflict,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'task' | 'app' | 'governance'>('task');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // New Memory creation form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<AppMemoryEntry['category']>('preference');
  const [isSaving, setIsSaving] = useState(false);

  // Backup notice
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  useEffect(() => {
    void refreshMemoryGovernance();
  }, [refreshMemoryGovernance]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSaving(true);
    try {
      if (activeTab === 'task') {
        await addTaskMemory(newTitle.trim(), newContent.trim(), ['manual']);
      } else {
        await addAppMemory(
          newCategory,
          newTitle.trim(),
          newContent.trim(),
          newContent.trim(),
          1.0
        );
      }
      setNewTitle('');
      setNewContent('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create memory:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await exportMemoryBackup();
      if (res.success) {
        setBackupNotice(`Backup exported: ${res.path || 'Saved to downloads'}`);
        setTimeout(() => setBackupNotice(null), 4000);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handlePurge = async () => {
    if (!confirm('Purge expired memory records older than policy threshold?')) return;
    try {
      const count = await purgeExpiredMemories();
      setBackupNotice(`Purged ${count} expired records.`);
      setTimeout(() => setBackupNotice(null), 3000);
    } catch (err) {
      console.error('Purge failed:', err);
    }
  };

  const filteredTask = taskMemories.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApp = appMemories.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.details && m.details.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Auto-select first item if selection is invalid
  const currentList = activeTab === 'task' ? filteredTask : filteredApp;
  const selectedItem = currentList.find((i) => i.id === selectedId) || currentList[0] || null;

  return (
    <div className="space-y-4">
      {/* Top Status & Storage Details */}
      <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain size={15} className="text-[#F2F2F2]" />
            <span className="text-xs font-semibold text-[#F2F2F2]">
              Local Memory Engine
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SQLite FTS5 + Markdown
            </span>
          </div>
          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-2">
            <span>Storage directory:</span>
            <code className="text-[#F2F2F2] font-mono bg-[#141416] px-1.5 py-0.5 rounded border border-[#303034] text-[10px]">
              {memoryConfig.globalMemoryDirectory || '%APPDATA%\\Refx AI\\memory'}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#242426] hover:bg-[#303034] text-[#F2F2F2] border border-[#303034] text-xs font-medium transition-colors cursor-pointer"
          >
            <Download size={12} />
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={handlePurge}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1D1D1F] hover:bg-[#242426] text-[#A1A1AA] hover:text-[#F2F2F2] border border-[#303034] text-xs font-medium transition-colors cursor-pointer"
          >
            <span>Purge Expired</span>
          </button>
        </div>
      </div>

      {backupNotice && (
        <div className="p-2.5 rounded-md bg-[#242426] border border-[#303034] text-xs text-emerald-300 flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>{backupNotice}</span>
        </div>
      )}

      {/* Tabs & Search & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#303034]">
        <SettingsSegmentedControl
          value={activeTab}
          onChange={(v) => {
            setActiveTab(v);
            setSelectedId(null);
          }}
          options={[
            { id: 'task', label: 'Task Memories', count: taskMemories.length },
            { id: 'app', label: 'App Knowledge', count: appMemories.length },
            {
              id: 'governance',
              label: 'Governance',
              count: memoryGovernance?.conflicts?.length || 0,
            },
          ]}
        />

        {activeTab !== 'governance' && (
          <div className="flex items-center gap-2">
            <SettingsSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search memories..."
              className="w-48 sm:w-60"
            />
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F2F2F2] hover:bg-white text-[#171717] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Plus size={13} />
              <span>Add Record</span>
            </button>
          </div>
        )}
      </div>

      {/* Inline Creation Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateMemory}
          className="rounded-lg border border-[#303034] bg-[#1D1D1F] p-4 space-y-3 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-[#303034] pb-2">
            <span className="text-xs font-semibold text-[#F2F2F2]">
              New {activeTab === 'task' ? 'Task Memory Record' : 'App Knowledge Record'}
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#A1A1AA] hover:text-[#F2F2F2]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#A1A1AA]">Title / Key</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Coding Guidelines or Architectural Decision"
                required
                className="w-full bg-[#141416] border border-[#303034] rounded-md px-2.5 py-1.5 text-xs text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2]"
              />
            </div>
            {activeTab === 'app' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A1A1AA]">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-[#141416] border border-[#303034] rounded-md px-2.5 py-1.5 text-xs text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2]"
                >
                  <option value="preference">Preference</option>
                  <option value="fact">Fact</option>
                  <option value="workflow">Workflow</option>
                  <option value="context">Context</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#A1A1AA]">Content (Markdown)</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Memory content or instructions injected into agent context..."
              rows={4}
              required
              className="w-full bg-[#141416] border border-[#303034] rounded-md p-2.5 text-xs font-mono text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F2F2F2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newTitle.trim()}
              className="px-4 py-1.5 rounded-md bg-[#F2F2F2] text-[#171717] text-xs font-semibold hover:bg-white disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      )}

      {/* Main Dual-Pane for Task / App Memories */}
      {activeTab !== 'governance' && (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[420px]">
          {/* Left Column: List */}
          <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/50 p-2 space-y-1.5 overflow-y-auto custom-scrollbar max-h-[460px]">
            {currentList.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#A1A1AA]">
                {activeTab === 'task'
                  ? 'No task memories recorded yet.'
                  : 'No app knowledge records found.'}
              </div>
            ) : (
              currentList.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isApp = 'category' in item;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#303034] bg-[#242426] text-[#F2F2F2] shadow-xs'
                        : 'border-transparent hover:bg-[#1D1D1F] text-[#A1A1AA] hover:text-[#F2F2F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate text-[#F2F2F2]">
                        {item.title}
                      </span>
                      {isApp && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#141416] border border-[#303034] text-[#71717A] capitalize shrink-0">
                          {(item as AppMemoryEntry).category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] line-clamp-1 mt-1">
                      {'content' in item ? item.content : (item as AppMemoryEntry).summary}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Record Detail */}
          <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-4 flex flex-col justify-between">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#303034]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[#F2F2F2]">
                        {selectedItem.title}
                      </h4>
                      {'category' in selectedItem && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#141416] border border-[#303034] text-[#A1A1AA] capitalize">
                          {(selectedItem as AppMemoryEntry).category}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#71717A] font-mono mt-1 flex items-center gap-2">
                      <span>ID: {selectedItem.id}</span>
                      <span>·</span>
                      <span>
                        Created {new Date(selectedItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {'enabled' in selectedItem && (
                      <div className="flex items-center gap-1.5 mr-2">
                        <span className="text-[11px] text-[#A1A1AA]">Active</span>
                        <SettingsToggle
                          checked={(selectedItem as AppMemoryEntry).enabled}
                          onChange={() => toggleAppMemory(selectedItem.id)}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Delete this memory record?')) return;
                        if ('content' in selectedItem) {
                          await deleteTaskMemory(selectedItem.id);
                        } else {
                          await deleteAppMemory(selectedItem.id);
                        }
                      }}
                      className="p-1.5 text-[#A1A1AA] hover:text-rose-400 hover:bg-[#242426] rounded border border-[#303034] transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-[#A1A1AA]">Memory Content</div>
                  <div className="p-3 rounded-md bg-[#141416] border border-[#303034] font-mono text-xs text-[#F2F2F2] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
                    {'content' in selectedItem
                      ? selectedItem.content
                      : (selectedItem as AppMemoryEntry).details ||
                        (selectedItem as AppMemoryEntry).summary}
                  </div>
                </div>
              </div>
            ) : (
              <SettingsEmptyState
                icon={<Brain size={18} />}
                title="No memory selected"
                description="Select a record from the list to inspect its contents or click Add Record to register persistent context."
              />
            )}
          </div>
        </div>
      )}

      {/* Governance & Conflicts Tab */}
      {activeTab === 'governance' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#F2F2F2] flex items-center gap-2">
              <ShieldAlert size={14} className="text-[#A1A1AA]" />
              <span>Memory Conflicts & Governance Resolution</span>
            </h4>
            <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
              When two contradictory instructions or preferences are detected across conversations,
              Refx flags them here for manual resolution to keep prompt context coherent.
            </p>

            {memoryGovernance?.conflicts && memoryGovernance.conflicts.length > 0 ? (
              <div className="space-y-3 pt-2">
                {memoryGovernance.conflicts.map((c) => (
                  <div
                    key={c.pairKey}
                    className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                      <span>Conflict detected: {c.left.title} vs {c.right.title}</span>
                      <button
                        type="button"
                        onClick={() => dismissMemoryConflict(c.pairKey)}
                        className="text-[11px] text-[#A1A1AA] hover:text-[#F2F2F2]"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2 rounded bg-[#141416] border border-[#303034]">
                        <div className="font-semibold text-[#F2F2F2]">{c.left.title}</div>
                        <p className="text-[11px] text-[#A1A1AA] mt-1">{c.left.preview}</p>
                        <button
                          type="button"
                          onClick={() => resolveMemoryConflict(c.pairKey, c.left.id)}
                          className="mt-2 text-[10px] font-semibold text-emerald-400 hover:underline"
                        >
                          Keep Record A
                        </button>
                      </div>
                      <div className="p-2 rounded bg-[#141416] border border-[#303034]">
                        <div className="font-semibold text-[#F2F2F2]">{c.right.title}</div>
                        <p className="text-[11px] text-[#A1A1AA] mt-1">{c.right.preview}</p>
                        <button
                          type="button"
                          onClick={() => resolveMemoryConflict(c.pairKey, c.right.id)}
                          className="mt-2 text-[10px] font-semibold text-emerald-400 hover:underline"
                        >
                          Keep Record B
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#A1A1AA] rounded-md border border-dashed border-[#303034] bg-[#141416]/40">
                No active memory conflicts. All persistent records are aligned.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
