import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Folder,
  Terminal,
  Shield,
  Info,
  Sliders,
  Check,
  Plus,
  Trash2,
  Moon,
  Sun,
  Laptop,
  Brain,
  Cpu,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Palette,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Toggle } from '@/components/common/Toggle';
import { useAppStore } from '@/stores/app-store';
import { desktopBridge } from '@/desktop/browser-preview-bridge';
import { Logo } from '@/components/ui/Logo';
import type { ProviderConfig, AppMemoryEntry } from '@/types';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    isElectron,
    settings,
    updateSetting,
    providers,
    selectedProvider,
    selectedModel,
    setSelectedModel,
    effort,
    setEffort,
    saveProviderConfig,
    verifyProviderConnection,
    taskMemories,
    appMemories,
    addTaskMemory,
    deleteTaskMemory,
    addAppMemory,
    deleteAppMemory,
    toggleAppMemory,
    refreshMemoryGovernance,
    memoryGovernance,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'skills' | 'models' | 'memory' | 'workspace' | 'terminal' | 'security' | 'about'
  >('general');

  // Switch tab automatically if opened via openModal('providers') or openModal('memory')
  useEffect(() => {
    if (activeModal === 'providers') {
      setActiveTab('models');
    } else if (activeModal === 'memory') {
      setActiveTab('memory');
    }
  }, [activeModal]);

  // Skills state
  const [skills, setSkills] = useState<any[]>([]);
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const skillFileInputRef = useRef<HTMLInputElement>(null);

  // Providers state
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providers[0]?.id || 'ollama');
  const [showApiKey, setShowApiKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; models: string[]; message?: string } | null>(null);

  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0] || null;
  const [providerForm, setProviderForm] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    if (currentProvider) {
      setProviderForm({ ...currentProvider, apiKey: currentProvider.apiKey || '' });
      setVerifyResult(null);
    }
  }, [selectedProviderId, currentProvider]);

  // Memory manager state
  const [memoryTab, setMemoryTab] = useState<'task' | 'app'>('task');
  const [memorySearch, setMemorySearch] = useState('');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemContent, setNewMemContent] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<AppMemoryEntry['category']>('preference');

  // Workspace state
  const [trashItems, setTrashItems] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'skills') {
      desktopBridge.skills
        .listSkills()
        .then((s) => setSkills(Array.isArray(s) ? s : []))
        .catch(() => setSkills([]));
    }
    if (activeTab === 'workspace') {
      desktopBridge.trash
        .listTrash()
        .then((t) => setTrashItems(Array.isArray(t) ? t : []))
        .catch(() => setTrashItems([]));
    }
    if (activeTab === 'memory') {
      void refreshMemoryGovernance();
    }
  }, [activeTab, refreshMemoryGovernance]);

  const defaultShell = (settings.defaultShell as string) || 'powershell.exe';
  const fontSize = (settings.fontSize as string) || '14';
  const securityPolicy = (settings.securityPolicy as 'always' | 'high_risk' | 'never') || 'high_risk';
  const ignoredPatterns =
    (settings.ignoredPatterns as string) || 'node_modules, target, .git, dist, build, .env';

  const setDefaultShell = (v: string) => updateSetting('defaultShell', v);
  const setFontSize = (v: string) => updateSetting('fontSize', v);
  const setSecurityPolicy = (v: 'always' | 'high_risk' | 'never') => updateSetting('securityPolicy', v);

  // If modal is neither settings, providers, nor memory, don't render
  const isOpen = activeModal === 'settings' || activeModal === 'providers' || activeModal === 'memory';
  if (!isOpen) return null;

  const NAV_ITEMS = [
    { id: 'general', label: 'General', icon: <Sliders size={15} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
    { id: 'skills', label: 'Skills & Tools', icon: <Sparkles size={15} /> },
    { id: 'models', label: 'Models & Providers', icon: <Cpu size={15} />, badge: `${providers.filter((p) => p.status === 'connected').length} active` },
    { id: 'memory', label: 'Memory Manager', icon: <Brain size={15} />, badge: `${taskMemories.length + appMemories.length}` },
    { id: 'workspace', label: 'Workspace & Files', icon: <Folder size={15} /> },
    { id: 'terminal', label: 'Terminal & Shell', icon: <Terminal size={15} /> },
    { id: 'security', label: 'Security & Policies', icon: <Shield size={15} /> },
    { id: 'about', label: 'About REFX', icon: <Info size={15} /> },
  ];

  const handleSaveAndVerifyProvider = async () => {
    if (!providerForm) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      await saveProviderConfig(providerForm);
      const res = await verifyProviderConnection(providerForm.id);
      setVerifyResult(res);
      if (res.success && res.models.length > 0) {
        setProviderForm((prev) => prev ? { ...prev, status: 'connected', discoveredModels: res.models } : prev);
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        models: [],
        message: err.message || 'Verification failed unexpectedly.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemTitle.trim() || !newMemContent.trim()) return;
    try {
      if (memoryTab === 'task') {
        await addTaskMemory(newMemTitle, newMemContent, ['manual']);
      } else {
        await addAppMemory(newMemCategory, newMemTitle, newMemContent, newMemContent);
      }
      setNewMemTitle('');
      setNewMemContent('');
      setShowAddMemory(false);
    } catch (err) {
      console.error('Failed to create memory:', err);
    }
  };

  const filteredTaskMemories = taskMemories.filter(
    (m) =>
      m.title.toLowerCase().includes(memorySearch.toLowerCase()) ||
      m.content.toLowerCase().includes(memorySearch.toLowerCase())
  );
  const filteredAppMemories = appMemories.filter(
    (m) =>
      m.title.toLowerCase().includes(memorySearch.toLowerCase()) ||
      m.summary.toLowerCase().includes(memorySearch.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Settings"
      subtitle="Refx AI engine preferences, appearance, skills, model providers & memory."
      icon={<Settings className="w-5 h-5 text-foreground-muted" />}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[460px] text-foreground">
        {/* Left Navigation Sidebar */}
        <div className="md:col-span-4 border-r border-border pr-3 space-y-1 text-xs select-none">
          <div className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider px-2 pb-2">
            Configuration
          </div>
          {NAV_ITEMS.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-surface-raised/90 text-foreground shadow-xs border border-border'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isSelected ? 'text-foreground' : 'text-foreground-muted'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface border border-border text-foreground-muted">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content View */}
        <div className="md:col-span-8 space-y-4 text-xs overflow-y-auto max-h-[580px] custom-scrollbar pr-2">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-smooth-in">
              <div className="bg-surface-card border border-border rounded-2xl divide-y divide-border/80 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Editor Font Size</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">
                      Font scale for chat code blocks, diffs, and terminal logs.
                    </p>
                  </div>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="bg-surface border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none"
                  >
                    <option value="12">12px (Compact)</option>
                    <option value="14">14px (Standard)</option>
                    <option value="16">16px (Comfortable)</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Reasoning Effort Tier</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">
                      Default thinking effort budget for supported models.
                    </p>
                  </div>
                  <select
                    value={effort}
                    onChange={(e) => setEffort(e.target.value)}
                    className="bg-surface border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none"
                  >
                    <option value="Auto">Auto</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Max">Max</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Auto Save Memory</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">
                      Automatically store context summaries during active tasks.
                    </p>
                  </div>
                  <Toggle
                    checked={(settings.autoSaveMemory as boolean) ?? true}
                    onChange={(val) => updateSetting('autoSaveMemory', val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 animate-smooth-in">
              <div>
                <label className="block text-foreground font-semibold mb-2">Theme Preference</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'Dark', label: 'Dark Mode', icon: <Moon size={16} /> },
                    { id: 'Light', label: 'Light Mode', icon: <Sun size={16} /> },
                    { id: 'System', label: 'System Default', icon: <Laptop size={16} /> },
                  ].map((t) => {
                    const isCurrent = ((settings.theme as string) || 'Dark') === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateSetting('theme', t.id)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                          isCurrent
                            ? 'bg-surface-raised border-2 border-indigo-500 text-foreground font-semibold shadow-md ring-2 ring-indigo-500/20'
                            : 'bg-surface-card border-border text-foreground-muted hover:text-foreground hover:bg-surface-raised/50'
                        }`}
                      >
                        <span className={isCurrent ? 'text-indigo-400' : 'text-foreground-muted'}>{t.icon}</span>
                        <span className="text-xs">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-surface-card border border-border rounded-2xl divide-y divide-border/80 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Interface Density</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">Compact or comfortable layout padding.</p>
                  </div>
                  <select
                    value={(settings.density as string) || 'Comfortable'}
                    onChange={(e) => updateSetting('density', e.target.value)}
                    className="bg-surface border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none"
                  >
                    <option value="Comfortable">Comfortable</option>
                    <option value="Compact">Compact</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Reduce Motion</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">Disable smooth transitions and animations.</p>
                  </div>
                  <Toggle
                    checked={Boolean(settings.reduceMotion)}
                    onChange={(val) => updateSetting('reduceMotion', val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Skills & Tools Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-3 animate-smooth-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Agent Skills</h4>
                  <p className="text-foreground-muted text-[11px] mt-0.5">
                    Extend your AI assistant with custom instructions and workflow tools.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={skillFileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt,.json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        let payload: any = {
                          name: file.name.replace(/\.[^.]+$/, ''),
                          description: '',
                          instructions: text,
                          enabled: true,
                          applyByDefault: false,
                        };
                        if (file.name.toLowerCase().endsWith('.json')) {
                          try {
                            const parsed = JSON.parse(text);
                            payload = {
                              name: parsed.name || payload.name,
                              description: parsed.description || '',
                              instructions: parsed.instructions || parsed.content || text,
                              enabled: parsed.enabled ?? true,
                              applyByDefault: parsed.applyByDefault ?? false,
                            };
                          } catch {
                            // Fall back to treating the file as plain instructions.
                          }
                        }
                        const created = await desktopBridge.skills.saveSkill(payload);
                        setSkills((prev) => [created, ...prev]);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => skillFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-raised text-foreground rounded-xl font-medium cursor-pointer text-xs shadow-xs border border-border"
                  >
                    <Upload size={13} strokeWidth={2.5} />
                    <span>Upload Skill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSkillName('');
                      setNewSkillDescription('');
                      setNewSkillInstructions('');
                      setIsCreatingSkill(true);
                    }}
                    disabled={isCreatingSkill}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised hover:bg-surface-card text-foreground rounded-xl font-medium cursor-pointer text-xs shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>New Skill</span>
                  </button>
                </div>
              </div>

              {isCreatingSkill && (
                <div className="p-4 bg-surface-card border border-border rounded-2xl space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">File name</label>
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="my-skill"
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Description (optional)</label>
                    <input
                      type="text"
                      value={newSkillDescription}
                      onChange={(e) => setNewSkillDescription(e.target.value)}
                      placeholder="What this skill does"
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Important instructions</label>
                    <textarea
                      value={newSkillInstructions}
                      onChange={(e) => setNewSkillInstructions(e.target.value)}
                      placeholder="# Skill Guidelines\n..."
                      rows={6}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingSkill(false)}
                      disabled={isSavingSkill}
                      className="px-3.5 py-2 bg-surface hover:bg-surface-raised text-foreground rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newSkillName.trim() || !newSkillInstructions.trim()) return;
                        setIsSavingSkill(true);
                        try {
                          const created = await desktopBridge.skills.saveSkill({
                            id: newSkillName.trim(),
                            name: newSkillName.trim(),
                            description: newSkillDescription.trim(),
                            instructions: newSkillInstructions.trim(),
                            enabled: true,
                            applyByDefault: false,
                          });
                          setSkills((prev) => [created, ...prev]);
                          setIsCreatingSkill(false);
                          setNewSkillName('');
                          setNewSkillDescription('');
                          setNewSkillInstructions('');
                        } finally {
                          setIsSavingSkill(false);
                        }
                      }}
                      disabled={isSavingSkill || !newSkillName.trim() || !newSkillInstructions.trim()}
                      className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingSkill ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {skills.length === 0 ? (
                  <div className="p-8 text-center bg-surface-card border border-dashed border-border rounded-2xl text-foreground-muted">
                    No custom skills registered yet. Click "New Skill" above to register instructions.
                  </div>
                ) : (
                  skills.map((sk) => (
                    <div
                      key={sk.id}
                      className="p-3.5 bg-surface-card border border-border rounded-2xl flex items-center justify-between group"
                    >
                      <div className="space-y-1 truncate pr-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={13} className="text-indigo-400" />
                          <span className="font-semibold text-foreground text-xs">{sk.name}</span>
                          {sk.applyByDefault && (
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-mono">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-muted truncate">{sk.description || 'No description provided.'}</p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await desktopBridge.skills.deleteSkill(sk.id);
                          setSkills((prev) => prev.filter((s) => s.id !== sk.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-foreground-muted hover:text-rose-400 rounded-lg transition-opacity cursor-pointer shrink-0"
                        title="Delete skill"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Models & Providers Tab */}
          {activeTab === 'models' && (
            <div className="space-y-4 animate-smooth-in">
              {/* Active Model Selector Header */}
              <div className="p-4 bg-surface-card border border-border rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span>Active Model:</span>
                    <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      {selectedModel || 'None Selected'}
                    </span>
                  </div>
                  <p className="text-foreground-muted text-[11px] mt-1">
                    Provider: {selectedProvider?.name || 'Local'} • Effort: {effort || 'Auto'}
                  </p>
                </div>
              </div>

              {/* Provider Selector Chips */}
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider px-1">
                  Available Providers
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {providers.map((p) => {
                    const isSelected = p.id === selectedProviderId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProviderId(p.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-surface-raised border-zinc-600 text-white shadow-xs'
                            : 'bg-surface-card border-border/80 text-foreground-muted hover:text-white hover:bg-surface-raised/50'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <div className="font-medium text-xs truncate">{p.name}</div>
                          <div className="text-[10px] text-foreground-muted capitalize">{p.type}</div>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            p.status === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider Configuration Panel */}
              {providerForm && (
                <div className="p-4 bg-surface-card border border-border rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <div className="font-semibold text-foreground text-sm">{providerForm.name} Setup</div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        providerForm.status === 'connected'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-surface-raised text-foreground-muted border border-zinc-700'
                      }`}
                    >
                      {providerForm.status}
                    </span>
                  </div>

                  {/* API Key Field (if not local ollama) */}
                  {providerForm.type !== 'ollama' && (
                    <div className="space-y-1">
                      <label className="text-foreground-muted font-medium text-[11px] block">API Key</label>
                      <div className="relative flex items-center">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={providerForm.apiKey || ''}
                          onChange={(e) =>
                            setProviderForm((prev) => (prev ? { ...prev, apiKey: e.target.value } : prev))
                          }
                          placeholder="Enter your API credential"
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-zinc-600 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 text-foreground-muted hover:text-foreground-muted cursor-pointer"
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Base URL (if custom or local) */}
                  {providerForm.type === 'ollama' && (
                    <div className="space-y-1">
                      <label className="text-foreground-muted font-medium text-[11px] block">Endpoint URL</label>
                      <input
                        type="text"
                        value={providerForm.baseUrl || 'http://127.0.0.1:11434'}
                        onChange={(e) =>
                          setProviderForm((prev) => (prev ? { ...prev, baseUrl: e.target.value } : prev))
                        }
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  )}

                  {/* Action row: Save & Verify */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={handleSaveAndVerifyProvider}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-raised hover:bg-surface-card text-foreground rounded-xl font-medium transition-colors cursor-pointer shadow-xs"
                    >
                      {verifying ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-foreground-muted" />
                          <span>Verifying Connection...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span>Save & Test Connection</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Verification result feedback */}
                  {verifyResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        verifyResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      {verifyResult.success ? (
                        <div>
                          Connection succeeded! Discovered {verifyResult.models.length} model(s).
                        </div>
                      ) : (
                        <div>{verifyResult.message || 'Connection verification failed.'}</div>
                      )}
                    </div>
                  )}

                  {/* Discovered Models List */}
                  {providerForm.discoveredModels.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
                        Available Models ({providerForm.discoveredModels.length})
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                        {providerForm.discoveredModels.map((m) => {
                          const isActive = selectedModel === m;
                          return (
                            <div
                              key={m}
                              className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border/80 text-xs"
                            >
                              <span className="font-mono text-foreground-muted truncate">{m}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedModel(m, providerForm.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-surface-raised hover:bg-zinc-700 text-foreground-muted'
                                }`}
                              >
                                {isActive ? 'Active' : 'Set Active'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Memory Manager Tab */}
          {activeTab === 'memory' && (
            <div className="space-y-4 animate-smooth-in">
              {/* Memory Overview Card */}
              <div className="p-4 bg-surface-card border border-border rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span>Memory Engine:</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      SQLite FTS5 Active
                    </span>
                  </div>
                  <p className="text-foreground-muted text-[11px] mt-1">
                    {taskMemories.length} task memories • {appMemories.length} persistent app knowledge items
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMemory(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised hover:bg-surface-card text-foreground rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-xs"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Add Memory</span>
                </button>
              </div>

              {/* Add Memory Modal/Form popup */}
              {showAddMemory && (
                <form
                  onSubmit={handleCreateMemory}
                  className="p-4 bg-surface-raised border border-zinc-700/80 rounded-2xl space-y-3 animate-smooth-in"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-semibold text-foreground text-xs">New Memory Record</span>
                    <button
                      type="button"
                      onClick={() => setShowAddMemory(false)}
                      className="text-foreground-muted hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newMemTitle}
                    onChange={(e) => setNewMemTitle(e.target.value)}
                    placeholder="Title / Key (e.g., Preferred Styling)"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none"
                    required
                  />
                  <textarea
                    value={newMemContent}
                    onChange={(e) => setNewMemContent(e.target.value)}
                    placeholder="Content / instruction details..."
                    rows={3}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none resize-none"
                    required
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddMemory(false)}
                      className="px-3 py-1 text-foreground-muted hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-xs font-medium cursor-pointer"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-tabs & Search Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center bg-surface-card p-1 rounded-xl border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setMemoryTab('task')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      memoryTab === 'task' ? 'bg-surface-raised text-white font-medium' : 'text-foreground-muted hover:text-white'
                    }`}
                  >
                    Task Memories ({taskMemories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemoryTab('app')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      memoryTab === 'app' ? 'bg-surface-raised text-white font-medium' : 'text-foreground-muted hover:text-white'
                    }`}
                  >
                    App Knowledge ({appMemories.length})
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-foreground-muted" />
                  <input
                    type="text"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Search memories..."
                    className="w-full bg-surface-card border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Memory Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {memoryTab === 'task' &&
                  (filteredTaskMemories.length === 0 ? (
                    <div className="p-8 text-center bg-surface-card border border-dashed border-border rounded-2xl text-foreground-muted">
                      No task memories found.
                    </div>
                  ) : (
                    filteredTaskMemories.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-surface-card border border-border rounded-xl flex items-start justify-between group"
                      >
                        <div className="space-y-1 min-w-0 pr-3">
                          <div className="font-semibold text-foreground text-xs truncate">{m.title}</div>
                          <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed">{m.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTaskMemory(m.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-foreground-muted hover:text-rose-400 rounded-lg transition-opacity cursor-pointer shrink-0"
                          title="Delete memory"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  ))}

                {memoryTab === 'app' &&
                  (filteredAppMemories.length === 0 ? (
                    <div className="p-8 text-center bg-surface-card border border-dashed border-border rounded-2xl text-foreground-muted">
                      No persistent app memories found.
                    </div>
                  ) : (
                    filteredAppMemories.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-surface-card border border-border rounded-xl flex items-start justify-between group"
                      >
                        <div className="space-y-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-xs truncate">{m.title}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-foreground-muted capitalize">
                              {m.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed">{m.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Toggle checked={m.enabled} onChange={() => toggleAppMemory(m.id)} />
                          <button
                            type="button"
                            onClick={() => deleteAppMemory(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-foreground-muted hover:text-rose-400 rounded-lg transition-opacity cursor-pointer"
                            title="Delete memory"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ))}
              </div>
            </div>
          )}

          {/* Workspace & Files Tab */}
          {activeTab === 'workspace' && (
            <div className="space-y-4 animate-smooth-in">
              <div className="bg-surface-card border border-border rounded-2xl p-4 space-y-3">
                <div className="font-semibold text-foreground">Ignored Patterns</div>
                <p className="text-foreground-muted text-[11px]">
                  Files and folders excluded from workspace scanning and context retrieval.
                </p>
                <textarea
                  value={ignoredPatterns}
                  onChange={(e) => updateSetting('ignoredPatterns', e.target.value)}
                  rows={2}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-foreground font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="bg-surface-card border border-border rounded-2xl p-4 space-y-3">
                <div className="font-semibold text-foreground">Backup Bin</div>
                <p className="text-foreground-muted text-[11px]">Deleted projects and conversations are kept for 7 days.</p>
                {trashItems.length === 0 ? (
                  <p className="text-foreground-muted text-xs">Backup bin is empty.</p>
                ) : (
                  <div className="space-y-2">
                    {trashItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-surface border border-border rounded-lg text-xs"
                      >
                        <div className="text-foreground-muted truncate">
                          {item.type}: {item.data?.name || item.data?.title || item.id}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await desktopBridge.trash.restoreTrash(item.id);
                              setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
                            }}
                            className="text-foreground-muted hover:text-white cursor-pointer text-[11px]"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Permanently delete this item?')) return;
                              await desktopBridge.trash.purgeTrash(item.id);
                              setTrashItems((prev) => prev.filter((t) => t.id !== item.id));
                            }}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer text-[11px]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terminal & Shell Tab */}
          {activeTab === 'terminal' && (
            <div className="space-y-4 animate-smooth-in">
              <div className="bg-surface-card border border-border rounded-2xl divide-y divide-border/80 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Default Shell</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">Windows command processor for terminal panel.</p>
                  </div>
                  <select
                    value={defaultShell}
                    onChange={(e) => setDefaultShell(e.target.value)}
                    className="bg-surface border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none font-mono"
                  >
                    <option value="powershell.exe">PowerShell (powershell.exe)</option>
                    <option value="cmd.exe">Command Prompt (cmd.exe)</option>
                    <option value="bash.exe">Git Bash (bash.exe)</option>
                  </select>
                </div>

                <div className="p-4 space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Terminal size={14} className="text-emerald-400" />
                    <span>Windows ConPTY Pseudo-Console Engine</span>
                  </div>
                  <p className="text-foreground-muted text-[11px]">
                    Direct integration via node-pty on Node 22 runtime with full ANSI color support and pty dimensions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security & Policies Tab */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-smooth-in">
              <div>
                <label className="block text-foreground font-semibold mb-1">Execution Security Policy</label>
                <p className="text-foreground-muted text-xs mb-3">
                  Control when the assistant requires explicit human permission before executing actions.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'high_risk',
                    title: 'Prompt on High-Risk Commands (Recommended)',
                    desc: 'Automatically applies safe reads and reversible changes; prompts confirmation for destructive file writes, npm installs, or system commands.',
                  },
                  {
                    id: 'always',
                    title: 'Always Prompt',
                    desc: 'Require explicit user approval before executing any file modification or terminal process.',
                  },
                  {
                    id: 'never',
                    title: 'Unrestricted Turbo Mode',
                    desc: 'Execute all operations without prompting confirmation. Use only in sandboxed environments.',
                  },
                ].map((pol) => {
                  const isChosen = securityPolicy === pol.id;
                  return (
                    <div
                      key={pol.id}
                      onClick={() => setSecurityPolicy(pol.id as any)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChosen
                          ? 'bg-surface-raised/90 border-2 border-indigo-500 text-white font-medium shadow-md'
                          : 'bg-surface-card border-border text-foreground-muted hover:text-white hover:bg-surface-raised/50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChosen ? 'border-indigo-400 bg-indigo-500' : 'border-zinc-700'
                        }`}
                      >
                        {isChosen && <Check size={10} strokeWidth={3} className="text-white" />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-xs text-foreground">{pol.title}</div>
                        <div className="text-[11px] text-foreground-muted leading-relaxed">{pol.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-smooth-in">
              <div className="p-5 bg-surface-card border border-border rounded-2xl flex items-center gap-4">
                <Logo width={40} height={40} className="w-9 h-9 text-white shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">REFX Workspace</h4>
                  <p className="text-foreground-muted text-xs">Windows Local-First Pair Programming Environment</p>
                  <p className="text-[10px] text-foreground-muted font-mono mt-1">Version 1.0.0 (Production Release)</p>
                </div>
              </div>

              <div className="p-4 bg-surface-card border border-border rounded-2xl space-y-2 text-[11px] text-foreground-muted">
                <div className="flex justify-between py-1 border-b border-border">
                  <span>Host Environment</span>
                  <span className="font-mono text-foreground">{isElectron ? 'Electron 45 Desktop Native' : 'Browser Preview'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span>Architecture</span>
                  <span className="font-mono text-foreground">x64 (Windows 10/11)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>UI Framework</span>
                  <span className="font-mono text-foreground">React 19 + Tailwind CSS v4 + Motion</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
