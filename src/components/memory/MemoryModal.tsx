import React, { useState } from 'react';
import {
  Brain,
  Bookmark,
  Plus,
  Trash2,
  Folder,
  Search,
  Database,
  Sparkles,
  Check,
  Tag,
  Shield,
  Layers,
  Settings2,
  X,
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
  const [isAdding, setIsAdding] = useState(false);

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
    await addTaskMemory(newTaskTitle, newTaskContent, tags);
    setNewTaskTitle('');
    setNewTaskContent('');
    setNewTaskTags('');
    setIsAdding(false);
  };

  const handleCreateAppMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppTitle.trim() || !newAppSummary.trim()) return;
    await addAppMemory(newAppCategory, newAppTitle, newAppSummary, newAppDetails);
    setNewAppTitle('');
    setNewAppSummary('');
    setNewAppDetails('');
    setIsAdding(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'preference':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'convention':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'architecture':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'learning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242427] pb-3">
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
                  ? 'bg-white/10 text-white border border-white/15 shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark size={13} className="text-indigo-400" />
              <span>Task Context</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/5 text-[10px] font-mono text-zinc-400">
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
                  ? 'bg-white/10 text-white border border-white/15 shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={13} className="text-purple-400" />
              <span>Learned Rules</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/5 text-[10px] font-mono text-zinc-400">
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
                  ? 'bg-white/10 text-white border border-white/15 shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database size={13} className="text-zinc-400" />
              <span>Storage Configuration</span>
            </button>
          </div>

          {/* Search bar & Add Button */}
          {activeTab !== 'settings' && (
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <Search size={13} className="text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter memories..."
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-zinc-500 rounded-full pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Memory</span>
              </button>
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
                className="p-4 bg-[#18181b] border border-indigo-500/30 rounded-2xl space-y-3 text-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Bookmark size={13} className="text-indigo-400" />
                    New Task Context Memory
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Title / Key summary (e.g., API authentication requirement)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#141416] border border-[#27272a] rounded-xl px-3.5 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  required
                />
                <textarea
                  placeholder="Full instructions or details to inject into prompts..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  rows={3}
                  className="w-full bg-[#141416] border border-[#27272a] rounded-xl px-3.5 py-2 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 custom-scrollbar"
                  required
                />
                <input
                  type="text"
                  placeholder="Tags (comma-separated, e.g. api, auth, security)"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  className="w-full bg-[#141416] border border-[#27272a] rounded-xl px-3.5 py-1.5 text-zinc-300 placeholder-zinc-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold cursor-pointer shadow-xs"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            )}

            {/* Task Memory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {filteredTaskMemories.length === 0 ? (
                <div className="col-span-2 py-12 text-center bg-[#18181b]/50 border border-dashed border-[#27272a] rounded-3xl space-y-2">
                  <Bookmark size={24} className="text-zinc-600 mx-auto" />
                  <div className="text-sm font-medium text-zinc-400">No task memories found</div>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Task memories pin important requirements or context to your current conversation.
                  </p>
                </div>
              ) : (
                filteredTaskMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-4 bg-[#18181b]/70 hover:bg-[#18181b] border border-white/5 hover:border-white/15 rounded-2xl space-y-2 transition-all group shadow-xs relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                          <Bookmark size={13} />
                        </span>
                        <h4 className="font-semibold text-zinc-200 text-xs truncate">{mem.title}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTaskMemory(mem.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded-lg transition-opacity cursor-pointer shrink-0"
                        title="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 select-text">
                      {mem.content}
                    </p>

                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                        {mem.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-zinc-400"
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
            <div className="p-3.5 bg-[#18181b] border border-white/5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-zinc-200">Continuous AI Learning</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Extracts preferred code styles, architectural decisions, and project patterns automatically.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={memoryConfig.autoMemoryEnabled}
                  onChange={(val) => updateMemoryConfig({ autoMemoryEnabled: val })}
                />
                {appMemories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => clearAppMemories()}
                    className="px-3 py-1 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-[11px] transition-colors cursor-pointer"
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
                className="p-4 bg-[#18181b] border border-purple-500/30 rounded-2xl space-y-3 text-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-purple-400" />
                    New Application Rule
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newAppCategory}
                    onChange={(e) => setNewAppCategory(e.target.value as any)}
                    className="bg-[#141416] border border-[#27272a] rounded-xl px-3 py-2 text-zinc-200 text-xs focus:outline-none"
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
                    className="sm:col-span-2 bg-[#141416] border border-[#27272a] rounded-xl px-3.5 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Summary instruction (e.g. Always use Tailwind v4 with CSS variables)"
                  value={newAppSummary}
                  onChange={(e) => setNewAppSummary(e.target.value)}
                  className="w-full bg-[#141416] border border-[#27272a] rounded-xl px-3.5 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  required
                />
                <textarea
                  placeholder="Additional context or examples (optional)..."
                  value={newAppDetails}
                  onChange={(e) => setNewAppDetails(e.target.value)}
                  rows={2}
                  className="w-full bg-[#141416] border border-[#27272a] rounded-xl px-3.5 py-2 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 custom-scrollbar"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold cursor-pointer shadow-xs"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            )}

            {/* App Memory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {filteredAppMemories.length === 0 ? (
                <div className="col-span-2 py-12 text-center bg-[#18181b]/50 border border-dashed border-[#27272a] rounded-3xl space-y-2">
                  <Brain size={24} className="text-zinc-600 mx-auto" />
                  <div className="text-sm font-medium text-zinc-400">No application rules recorded</div>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Refx records preferences and engineering guidelines here so your AI stays aligned across sessions.
                  </p>
                </div>
              ) : (
                filteredAppMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-4 bg-[#18181b]/70 hover:bg-[#18181b] border border-white/5 hover:border-white/15 rounded-2xl space-y-2 transition-all group shadow-xs relative"
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
                        <h4 className="font-semibold text-zinc-200 text-xs truncate">{mem.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Toggle checked={mem.enabled} onChange={() => toggleAppMemory(mem.id)} />
                        <button
                          type="button"
                          onClick={() => deleteAppMemory(mem.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded-lg transition-opacity cursor-pointer"
                          title="Delete memory"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed select-text">{mem.summary}</p>
                    {mem.details && (
                      <p className="text-[11px] text-zinc-500 italic line-clamp-2 select-text">
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
            <div className="p-5 bg-[#18181b] border border-white/5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Database size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-zinc-100">Local SQLite Storage</h4>
                  <p className="text-zinc-400 text-xs">
                    Persistent transactional database located on your Windows workstation.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-zinc-300 font-medium">Database Directory Path</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={memoryConfig.globalMemoryDirectory}
                    onChange={(e) => updateMemoryConfig({ globalMemoryDirectory: e.target.value })}
                    className="flex-1 bg-[#141416] border border-[#27272a] focus:border-zinc-500 rounded-xl px-3.5 py-2 text-zinc-100 font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateMemoryConfig({
                        globalMemoryDirectory: '%APPDATA%\\Refx\\memory',
                      })
                    }
                    className="px-3.5 py-2 bg-[#222226] hover:bg-[#2b2b30] text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer text-xs border border-white/5 font-medium"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                <div className="p-3 bg-[#141416] border border-white/5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500">Total Entries</div>
                  <div className="text-base font-bold text-white font-mono">
                    {taskMemories.length + appMemories.length}
                  </div>
                </div>
                <div className="p-3 bg-[#141416] border border-white/5 rounded-xl space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500">Storage Backend</div>
                  <div className="text-base font-bold text-emerald-400 font-mono uppercase">
                    {memoryConfig.storageBackend || 'SQLite'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
