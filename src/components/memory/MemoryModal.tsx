import React, { useState } from 'react';
import {
  Brain,
  Bookmark,
  Plus,
  Trash2,
  Folder,
  Search,
  Database,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Toggle } from '@/components/common/Toggle';
import { useAppStore } from '@/stores/app-store';
import { filterMemories } from '@/utils/diff';
import type { AppMemoryEntry } from '@/types';

export const MemoryModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    taskMemories,
    appMemories,
    memoryConfig,
    addTaskMemory,
    deleteTaskMemory,
    addAppMemory,
    deleteAppMemory,
    toggleAppMemory,
    clearAppMemories,
    updateMemoryConfig,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'task' | 'app' | 'settings'>('task');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');

  const [isAddingApp, setIsAddingApp] = useState(false);
  const [newAppCategory, setNewAppCategory] = useState<AppMemoryEntry['category']>('preference');
  const [newAppTitle, setNewAppTitle] = useState('');
  const [newAppSummary, setNewAppSummary] = useState('');
  const [newAppDetails, setNewAppDetails] = useState('');

  if (activeModal !== 'memory') return null;

  const filteredTaskMemories = filterMemories(taskMemories, searchQuery);
  const filteredAppMemories = filterMemories(appMemories, searchQuery);

  const handleCreateTaskMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskContent.trim()) return;
    const tags = newTaskTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await addTaskMemory(newTaskTitle, newTaskContent, tags);
    setNewTaskTitle('');
    setNewTaskContent('');
    setNewTaskTags('');
    setIsAddingTask(false);
  };

  const handleCreateAppMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppTitle.trim() || !newAppSummary.trim()) return;
    await addAppMemory(newAppCategory, newAppTitle, newAppSummary, newAppDetails);
    setNewAppTitle('');
    setNewAppSummary('');
    setNewAppDetails('');
    setIsAddingApp(false);
  };

  return (
    <Modal
      isOpen={activeModal === 'memory'}
      onClose={closeModal}
      title="Memory Manager"
      subtitle="Local persistence: Task Context and Application Learnings."
      maxWidth="max-w-3xl"
    >
      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('task')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              activeTab === 'task'
                ? 'bg-surface text-foreground font-medium border border-border'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Bookmark size={14} strokeWidth={1.8} className="text-foreground-muted" />
            <span>Task Memory</span>
            <span className="text-[10px] text-foreground-muted font-mono">
              ({taskMemories.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              activeTab === 'app'
                ? 'bg-surface text-foreground font-medium border border-border'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Brain size={14} strokeWidth={1.8} className="text-foreground-muted" />
            <span>Application Memory</span>
            <span className="text-[10px] text-foreground-muted font-mono">
              ({appMemories.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-surface text-foreground font-medium border border-border'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Database size={14} strokeWidth={1.8} className="text-foreground-muted" />
            <span>Storage Directory</span>
          </button>
        </div>

        {activeTab !== 'settings' && (
          <div className="relative w-44">
            <Search size={14} strokeWidth={1.8} className="text-foreground-muted absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-surface border border-border rounded-md pl-7 pr-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-border"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Task Memory */}
      {activeTab === 'task' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <p className="text-foreground-muted">
              Task Memory stores instructions and requirements pinned to the active conversation.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="flex items-center gap-1 px-2.5 py-1 bg-surface hover:bg-surface text-foreground rounded-md transition-colors cursor-pointer text-xs border border-border"
            >
              <Plus size={14} strokeWidth={1.8} />
              <span>Add Entry</span>
            </button>
          </div>

          {isAddingTask && (
            <form onSubmit={handleCreateTaskMemory} className="p-3 bg-surface-raised border border-border rounded-lg space-y-2 text-xs">
              <input
                type="text"
                placeholder="Title / Context summary"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-1.5 text-foreground"
                required
              />
              <textarea
                placeholder="Content details..."
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                rows={2}
                className="w-full bg-surface border border-border rounded px-3 py-1.5 text-foreground resize-none"
                required
              />
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={newTaskTags}
                onChange={(e) => setNewTaskTags(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-1 text-foreground-muted"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-2.5 py-1 text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-white text-black hover:bg-zinc-200 rounded font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
            {filteredTaskMemories.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground-muted bg-surface rounded-lg border border-border">
                No saved memories.
              </div>
            ) : (
              filteredTaskMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-2.5 bg-surface-raised border border-border rounded-lg space-y-1 text-xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bookmark size={14} strokeWidth={1.8} className="text-foreground-muted" />
                      <span className="font-medium text-foreground">{mem.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTaskMemory(mem.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-red-400 rounded transition-opacity cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                  <p className="text-foreground-muted leading-relaxed">{mem.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Application Memory */}
      {activeTab === 'app' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs bg-surface-raised p-2.5 rounded-lg border border-border">
            <div>
              <span className="font-medium text-foreground">Automatic Learnings</span>
              <p className="text-foreground-muted text-[11px] mt-0.5">
                Developer conventions and settings persisted across tasks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                checked={memoryConfig.autoMemoryEnabled}
                onChange={(val) => updateMemoryConfig({ autoMemoryEnabled: val })}
              />
              {appMemories.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearAppMemories()}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsAddingApp(!isAddingApp)}
              className="flex items-center gap-1 px-2.5 py-1 bg-surface hover:bg-surface text-foreground rounded-md transition-colors cursor-pointer text-xs border border-border"
            >
              <Plus size={14} strokeWidth={1.8} />
              <span>Add Memory</span>
            </button>
          </div>

          {isAddingApp && (
            <form onSubmit={handleCreateAppMemory} className="p-3 bg-surface-raised border border-border rounded-lg space-y-2 text-xs">
              <div className="flex gap-2">
                <select
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value as any)}
                  className="bg-surface border border-border rounded px-2 py-1 text-foreground"
                >
                  <option value="preference">Preference</option>
                  <option value="convention">Convention</option>
                  <option value="architecture">Architecture</option>
                </select>
                <input
                  type="text"
                  placeholder="Title"
                  value={newAppTitle}
                  onChange={(e) => setNewAppTitle(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded px-3 py-1 text-foreground"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Rule summary"
                value={newAppSummary}
                onChange={(e) => setNewAppSummary(e.target.value)}
                className="w-full bg-surface border border-border rounded px-3 py-1 text-foreground"
                required
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingApp(false)}
                  className="px-2.5 py-1 text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-white text-black hover:bg-zinc-200 rounded font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
            {filteredAppMemories.length === 0 ? (
              <div className="p-6 text-center text-xs text-foreground-muted bg-surface rounded-lg border border-border">
                No saved memories.
              </div>
            ) : (
              filteredAppMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-2.5 bg-surface-raised border border-border rounded-lg space-y-1 text-xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-surface text-foreground-muted">
                        {mem.category}
                      </span>
                      <span className="font-medium text-foreground">{mem.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Toggle checked={mem.enabled} onChange={() => toggleAppMemory(mem.id)} />
                      <button
                        type="button"
                        onClick={() => deleteAppMemory(mem.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-red-400 rounded transition-opacity cursor-pointer"
                        title="Delete memory"
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                  <p className="text-foreground-muted">{mem.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Storage */}
      {activeTab === 'settings' && (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 bg-surface-raised border border-border rounded-lg space-y-2.5">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Folder size={16} strokeWidth={1.8} className="text-foreground-muted" />
              Database Directory
            </h4>
            <p className="text-foreground-muted text-[11px]">
              Filesystem directory for Windows SQLite storage in Stage 2/3.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={memoryConfig.globalMemoryDirectory}
                onChange={(e) => updateMemoryConfig({ globalMemoryDirectory: e.target.value })}
                className="flex-1 bg-surface border border-border rounded-md px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  updateMemoryConfig({
                    globalMemoryDirectory: '%APPDATA%\\Refx\\memory',
                  })
                }
                className="px-3 py-1.5 bg-surface hover:bg-surface text-foreground rounded-md transition-colors cursor-pointer text-xs border border-border"
              >
                Default
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
