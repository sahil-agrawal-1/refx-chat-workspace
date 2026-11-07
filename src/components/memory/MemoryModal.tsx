import React, { useState, useEffect } from 'react';
import {
  Brain,
  Bookmark,
  Plus,
  Trash2,
  Pencil,
  Search,
  Database,
  Sparkles,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Toggle } from '@/components/common/Toggle';
import { useAppStore } from '@/stores/app-store';
import { desktopBridge } from '@/desktop/browser-preview-bridge';
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
    updateTaskMemory,
    clearTaskMemories,
    addAppMemory,
    deleteAppMemory,
    updateAppMemory,
    toggleAppMemory,
    clearAppMemories,
    exportMemoryBackup,
    restoreMemoryBackup,
    updateMemoryConfig,
    memoryGovernance,
    refreshMemoryGovernance,
    dismissMemoryConflict,
    resolveMemoryConflict,
    confirmMemory,
    purgeExpiredMemories,
    lastMemoryRetrieval,
    memoryVersions,
    fetchMemoryVersions,
    restoreMemoryVersion,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'task' | 'app' | 'settings' | 'review' | 'inspector'>('task');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskContent, setEditingTaskContent] = useState('');
  const [editingTaskTags, setEditingTaskTags] = useState('');
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingAppTitle, setEditingAppTitle] = useState('');
  const [editingAppSummary, setEditingAppSummary] = useState('');
  const [editingAppDetails, setEditingAppDetails] = useState('');

  useEffect(() => {
    if (activeModal === 'memory') {
      void refreshMemoryGovernance();
    }
  }, [activeModal, refreshMemoryGovernance]);

  // Task Memory Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');

  // App Memory Form
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
    try {
      if (editingTaskId) {
        await updateTaskMemory('default-task', editingTaskId, {
          title: newTaskTitle,
          content: newTaskContent,
          tags,
        });
      } else {
        await addTaskMemory(newTaskTitle, newTaskContent, tags);
      }
      setNewTaskTitle('');
      setNewTaskContent('');
      setNewTaskTags('');
      setEditingTaskId(null);
      setIsAdding(false);
    } catch {
      // The store already surfaced the encryption/write error. Keep the form
      // populated so the user can retry without losing their input.
    }
  };

  const handleCreateAppMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppTitle.trim() || !newAppSummary.trim()) return;
    try {
      if (editingAppId) {
        await updateAppMemory(editingAppId, {
          category: newAppCategory,
          title: newAppTitle,
          summary: newAppSummary,
          details: newAppDetails,
        });
      } else {
        await addAppMemory(newAppCategory, newAppTitle, newAppSummary, newAppDetails);
      }
      setNewAppTitle('');
      setNewAppSummary('');
      setNewAppDetails('');
      setEditingAppId(null);
      setIsAdding(false);
    } catch {
      // The store already surfaced the encryption/write error. Keep the form
      // populated so the user can retry without losing their input.
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'preference':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'convention':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'architecture':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'learning':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-surface text-foreground-muted border-border';
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'memory'}
      onClose={closeModal}
      title="Neural Memory Manager"
      subtitle="Local-first persistence: Session Context, Engineering Rules & Learned Preferences."
      icon={<Brain className="w-5 h-5 text-purple-400" />}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('task');
                setIsAdding(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'task'
                  ? 'bg-surface text-foreground border border-border shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <Bookmark size={13} className="text-indigo-400" />
              <span>Task Context</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-raised border border-border text-[10px] font-mono text-foreground-muted">
                {taskMemories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('app');
                setIsAdding(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'app'
                  ? 'bg-surface text-foreground border border-border shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <Sparkles size={13} className="text-purple-400" />
              <span>Learned Rules</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-raised border border-border text-[10px] font-mono text-foreground-muted">
                {appMemories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsAdding(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-surface text-foreground border border-border shadow-xs'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <Database size={13} className="text-foreground-muted" />
              <span>Storage Configuration</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('review');
                setIsAdding(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${activeTab === 'review' ? 'bg-surface text-foreground border border-border shadow-xs' : 'text-foreground-muted hover:text-foreground hover:bg-surface'}`}
            >
              <ShieldCheck size={13} className="text-amber-400" />
              <span>Review</span>
              {(memoryGovernance.counts.conflicts + memoryGovernance.counts.lowConfidence + memoryGovernance.counts.expired) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono text-amber-400">
                  {memoryGovernance.counts.conflicts + memoryGovernance.counts.lowConfidence + memoryGovernance.counts.expired}
                </span>
              )}
            </button>
          </div>
             <button
               type="button"
               onClick={() => { setActiveTab('inspector'); setIsAdding(false); }}
               className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${activeTab === 'inspector' ? 'bg-surface text-foreground border border-border shadow-xs' : 'text-foreground-muted hover:text-foreground hover:bg-surface'}`}
             >
               <Search size={13} className="text-foreground-muted" />
               <span>Inspector</span>
             </button>

          {/* Search bar & Add Button */}
          {activeTab !== 'settings' && (
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <Search size={13} className="text-foreground-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter memories..."
                  className="w-full bg-surface border border-border focus:border-accent rounded-full pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-foreground-muted focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-foreground-muted hover:text-foreground cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-surface hover:opacity-90 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Memory</span>
              </button>
              {activeTab === 'task' && taskMemories.length > 0 && (
                <button
                  type="button"
                  onClick={() => void clearTaskMemories()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
                >
                  <Trash2 size={13} strokeWidth={2.5} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Task Memory Content */}
        {activeTab === 'task' && (
          <div className="space-y-4">
            {/* Create Task Form */}
            {isAdding && (
              <form
                onSubmit={handleCreateTaskMemory}
                className="p-4 bg-surface border border-indigo-500/30 rounded-2xl space-y-3 text-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Bookmark size={13} className="text-indigo-400" />
                    New Task Context Memory
                  </span>
                  <button
                    type="button"
                    onClick={() => { setEditingTaskId(null); setEditingAppId(null); setIsAdding(false); }}
                    className="text-foreground-muted hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Title / Key summary (e.g., API authentication requirement)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-foreground placeholder-foreground-muted focus:outline-none focus:border-accent"
                  required
                />
                <textarea
                  placeholder="Full instructions or details to inject into prompts..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-foreground placeholder-foreground-muted resize-none focus:outline-none focus:border-accent custom-scrollbar"
                  required
                />
                <input
                  type="text"
                  placeholder="Tags (comma-separated, e.g. api, auth, security)"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-1.5 text-foreground placeholder-foreground-muted focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setEditingTaskId(null); setEditingAppId(null); setIsAdding(false); }}
                    className="px-3 py-1.5 text-foreground-muted hover:text-foreground rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-foreground text-surface hover:opacity-90 rounded-xl font-semibold cursor-pointer shadow-xs"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            )}

            {/* Task Memory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {filteredTaskMemories.length === 0 ? (
                <div className="col-span-2 py-12 text-center bg-surface border border-dashed border-border rounded-3xl space-y-2">
                  <Bookmark size={24} className="text-foreground-muted mx-auto" />
                  <div className="text-sm font-medium text-foreground">No task memories found</div>
                  <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                    Task memories pin important requirements or context to your current conversation.
                  </p>
                </div>
              ) : (
                filteredTaskMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-4 bg-surface hover:bg-surface-raised border border-border rounded-2xl space-y-2 transition-all group shadow-xs relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Bookmark size={13} />
                        </span>
                        <h4 className="font-semibold text-foreground text-xs truncate">{mem.title}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(mem.id);
                          setNewTaskTitle(mem.title);
                          setNewTaskContent(mem.content);
                          setNewTaskTags((mem.tags || []).join(', '));
                          setIsAdding(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-foreground rounded-lg transition-opacity cursor-pointer shrink-0"
                        title="Edit entry"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTaskMemory(mem.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-red-400 rounded-lg transition-opacity cursor-pointer shrink-0"
                        title="Forget entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <p className="text-xs text-foreground-muted leading-relaxed line-clamp-3 select-text">
                      {mem.content}
                    </p>

                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
                        {mem.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-surface-raised border border-border text-[10px] font-mono text-foreground-muted"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Learned Rules (App Memory) */}
        {activeTab === 'app' && (
          <div className="space-y-4">
            {/* Header info & Auto-memory toggle */}
            <div className="p-3.5 bg-surface border border-border rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-foreground">Continuous AI Learning</span>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Extracts preferred code styles, architectural decisions, and project patterns automatically.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={memoryConfig.autoMemoryEnabled}
                  onChange={(val) => {
                    void updateMemoryConfig({ autoMemoryEnabled: val }).catch(() => {});
                  }}
                />
                {appMemories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearAppMemories()}
                    className="px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-[11px] transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Create App Memory Form */}
            {isAdding && (
              <form
                onSubmit={handleCreateAppMemory}
                className="p-4 bg-surface border border-purple-500/30 rounded-2xl space-y-3 text-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles size={13} className="text-purple-400" />
                    New Application Rule
                  </span>
                  <button
                    type="button"
                    onClick={() => { setEditingTaskId(null); setEditingAppId(null); setIsAdding(false); }}
                    className="text-foreground-muted hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newAppCategory}
                    onChange={(e) => setNewAppCategory(e.target.value as any)}
                    className="bg-surface-raised border border-border rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none"
                  >
                    <option value="preference">Preference</option>
                    <option value="convention">Convention</option>
                    <option value="architecture">Architecture</option>
                    <option value="learning">Learning</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Rule Title"
                    value={newAppTitle}
                    onChange={(e) => setNewAppTitle(e.target.value)}
                    className="sm:col-span-2 bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-foreground placeholder-foreground-muted focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Summary instruction (e.g. Always use Tailwind v4 with CSS variables)"
                  value={newAppSummary}
                  onChange={(e) => setNewAppSummary(e.target.value)}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-foreground placeholder-foreground-muted focus:outline-none focus:border-accent"
                  required
                />
                <textarea
                  placeholder="Additional context or examples (optional)..."
                  value={newAppDetails}
                  onChange={(e) => setNewAppDetails(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-foreground placeholder-foreground-muted resize-none focus:outline-none focus:border-accent custom-scrollbar"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setEditingTaskId(null); setEditingAppId(null); setIsAdding(false); }}
                    className="px-3 py-1.5 text-foreground-muted hover:text-foreground rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-foreground text-surface hover:opacity-90 rounded-xl font-semibold cursor-pointer shadow-xs"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            )}

            {/* App Memory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {filteredAppMemories.length === 0 ? (
                <div className="col-span-2 py-12 text-center bg-surface border border-dashed border-border rounded-3xl space-y-2">
                  <Brain size={24} className="text-foreground-muted mx-auto" />
                  <div className="text-sm font-medium text-foreground">No application rules recorded</div>
                  <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                    Refx records preferences and engineering guidelines here so your AI stays aligned across sessions.
                  </p>
                </div>
              ) : (
                filteredAppMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-4 bg-surface hover:bg-surface-raised border border-border rounded-2xl space-y-2 transition-all group shadow-xs relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-medium uppercase tracking-wider ${getCategoryColor(
                            mem.category
                          )}`}
                        >
                          {mem.category}
                        </span>
                        <h4 className="font-semibold text-foreground text-xs truncate">{mem.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Toggle checked={mem.enabled} onChange={() => toggleAppMemory(mem.id)} />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAppId(mem.id);
                            setNewAppCategory(mem.category);
                            setNewAppTitle(mem.title);
                            setNewAppSummary(mem.summary);
                            setNewAppDetails(mem.details || '');
                            setIsAdding(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-foreground rounded-lg transition-opacity cursor-pointer"
                          title="Edit entry"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAppMemory(mem.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-red-400 rounded-lg transition-opacity cursor-pointer"
                          title="Forget entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed select-text">{mem.summary}</p>
                    {mem.details && (
                      <p className="text-[11px] text-foreground-muted italic line-clamp-2 select-text">
                        {mem.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Storage Configuration */}
        {activeTab === 'settings' && (
          <div className="space-y-4 text-xs">
            <div className="p-5 bg-surface border border-border rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Local SQLite Storage</h4>
                  <p className="text-foreground-muted text-xs">
                    Persistent transactional database located on your Windows workstation.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-foreground font-medium">Database Directory Path</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={memoryConfig.globalMemoryDirectory}
                    onChange={(e) => {
                      void updateMemoryConfig({ globalMemoryDirectory: e.target.value }).catch(() => {});
                    }}
                    className="flex-1 bg-surface-raised border border-border focus:border-accent rounded-xl px-3.5 py-2 text-foreground font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void updateMemoryConfig({
                        globalMemoryDirectory: '%APPDATA%\\Refx\\memory',
                      }).catch(() => {});
                    }}
                    className="px-3.5 py-2 bg-surface hover:bg-surface-raised text-foreground rounded-xl transition-all cursor-pointer text-xs border border-border font-medium"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="p-3 bg-surface-raised border border-border rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-foreground-muted">Total Entries</div>
                  <div className="text-base font-bold text-foreground font-mono">
                    {taskMemories.length + appMemories.length}
                  </div>
                </div>
                <div className="p-3 bg-surface-raised border border-border rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-foreground-muted">Storage Backend</div>
                  <div className="text-base font-bold text-emerald-500 font-mono uppercase">
                    {memoryConfig.storageBackend || 'SQLite'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void exportMemoryBackup()}
                  className="px-3.5 py-2 bg-surface hover:bg-surface-raised text-foreground rounded-xl transition-all cursor-pointer text-xs border border-border font-medium"
                >
                  Create Backup
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const folder = await desktopBridge.fs.selectFolderDialog();
                    if (folder) void restoreMemoryBackup(folder);
                  }}
                  className="px-3.5 py-2 bg-surface hover:bg-surface-raised text-foreground rounded-xl transition-all cursor-pointer text-xs border border-border font-medium"
                >
                  Restore Backup
                </button>
              </div>

              <div className="p-3.5 bg-surface-raised border border-border rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Encrypt memory files</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    {memoryConfig.encryptionEnabled
                      ? memoryConfig.encryptionAvailable === false
                        ? 'Encryption is enabled, but OS secure storage is currently unavailable. Encrypted files cannot be read or written.'
                        : 'Memory files are encrypted with OS secure storage (DPAPI). Plaintext fallback is disabled.'
                      : memoryConfig.encryptionAvailable === false
                        ? 'OS secure storage is unavailable, so encryption cannot be enabled.'
                        : 'Encrypt memory files at rest using OS secure storage.'}
                  </p>
                </div>
                <Toggle
                  checked={memoryConfig.encryptionEnabled === true}
                  disabled={
                    memoryConfig.encryptionEnabled !== true &&
                    memoryConfig.encryptionAvailable === false
                  }
                  onChange={(val) => {
                    void updateMemoryConfig({ encryptionEnabled: val }).catch(() => {});
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Memory health</h4>
                  <p className="text-foreground-muted text-[11px] mt-0.5">
                    {memoryGovernance.counts.conflicts} conflict(s), {memoryGovernance.counts.lowConfidence} low-confidence, {memoryGovernance.counts.expired} expired.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void purgeExpiredMemories()}
                  disabled={memoryGovernance.counts.expired === 0}
                  className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-[11px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Purge expired
                </button>
              </div>

              {memoryGovernance.expired.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-[10px] uppercase font-semibold text-foreground-muted">Expired memories</div>
                  {memoryGovernance.expired.map((item) => (
                    <div key={item.id} className="p-2.5 bg-surface-raised border border-border rounded-xl">
                      <div className="font-medium text-foreground text-xs truncate">{item.title}</div>
                      <div className="text-[11px] text-foreground-muted line-clamp-2 mt-0.5">{item.preview}</div>
                    </div>
                  ))}
                </div>
              )}

              {memoryGovernance.conflicts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-[10px] uppercase font-semibold text-foreground-muted">Conflicts</div>
                  {memoryGovernance.conflicts.map((conflict) => (
                    <div key={conflict.pairKey} className="p-3 bg-surface-raised border border-border rounded-xl space-y-2">
                      <div className="text-[11px] text-amber-400 font-medium">
                        {conflict.type} � {conflict.reason}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[conflict.left, conflict.right].map((side) => (
                          <div key={side.id} className="p-2 bg-surface border border-border rounded-lg space-y-1">
                            <div className="font-medium text-foreground text-xs truncate">{side.title}</div>
                            <div className="text-[11px] text-foreground-muted line-clamp-2">{side.preview}</div>
                            <button
                              type="button"
                              onClick={() => void resolveMemoryConflict(conflict.pairKey, side.id)}
                              className="mt-1 px-2.5 py-1 rounded-full bg-foreground text-surface text-[10px] font-semibold cursor-pointer"
                            >
                              Keep this
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void dismissMemoryConflict(conflict.pairKey)}
                        className="text-[10px] text-foreground-muted hover:text-foreground cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {memoryGovernance.lowConfidence.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-[10px] uppercase font-semibold text-foreground-muted">Low confidence (needs approval)</div>
                  {memoryGovernance.lowConfidence.map((item) => (
                    <div key={item.id} className="p-2.5 bg-surface-raised border border-border rounded-xl flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground text-xs truncate">{item.title}</div>
                        <div className="text-[11px] text-foreground-muted line-clamp-2 mt-0.5">{item.preview}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void confirmMemory(item.id, item.scope, item.taskId || undefined)}
                          className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 text-[10px] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.scope === 'app') void deleteAppMemory(item.id);
                            else void deleteTaskMemory(item.id);
                          }}
                          className="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-[10px] font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {memoryGovernance.counts.conflicts === 0 &&
                memoryGovernance.counts.lowConfidence === 0 &&
                memoryGovernance.counts.expired === 0 && (
                <div className="py-6 text-center text-foreground-muted text-xs">
                  No memory items need review.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inspector' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Retrieval inspector</h4>
              {!lastMemoryRetrieval ? (
                <div className="text-foreground-muted">No retrieval has run yet. Send a message to populate this view.</div>
              ) : (
                <>
                  <div className="text-[11px] text-foreground-muted">
                    {lastMemoryRetrieval.results.length} selected · {lastMemoryRetrieval.usedTokens}/{lastMemoryRetrieval.budgetTokens} tokens · {lastMemoryRetrieval.totalCandidates} candidates
                  </div>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                    {lastMemoryRetrieval.results.map((r) => (
                      <div key={r.id} className="p-2.5 bg-surface-raised border border-border rounded-xl space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground text-xs truncate">{r.title}</span>
                          <span className="text-[10px] font-mono text-amber-400">score {r.score}</span>
                        </div>
                        <div className="text-[11px] text-foreground-muted line-clamp-2">{r.text}</div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {r.reasons.map((reason, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded-full bg-surface border border-border text-[10px] text-foreground-muted">
                              {reason}
                            </span>
                          ))}
                          {r.matchedTerms.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-surface border border-border text-[10px] text-foreground-muted">
                              terms: {r.matchedTerms.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Version restore</h4>
              <div className="text-[11px] text-foreground-muted">Task memories with saved versions can be restored to an earlier snapshot.</div>
              {taskMemories.length === 0 ? (
                <div className="text-foreground-muted">No task memories.</div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                  {taskMemories.map((mem) => (
                    <div key={mem.id} className="p-2.5 bg-surface-raised border border-border rounded-xl space-y-1.5">
                      <div className="font-medium text-foreground text-xs truncate">{mem.title}</div>
                      <button
                        type="button"
                        onClick={() => void fetchMemoryVersions(mem.id)}
                        className="text-[10px] text-foreground-muted hover:text-foreground cursor-pointer"
                      >
                        Load versions
                      </button>
                      {memoryVersions.length > 0 && memoryVersions[0]?.memoryId === mem.id && (
                        <div className="space-y-1 pt-1 border-t border-border">
                          {memoryVersions.map((version) => (
                            <div key={version.id} className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-foreground-muted">
                                {new Date(version.createdAt).toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => void restoreMemoryVersion(mem.id, version.id)}
                                className="px-2 py-0.5 rounded-full bg-foreground text-surface text-[10px] font-semibold cursor-pointer"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
