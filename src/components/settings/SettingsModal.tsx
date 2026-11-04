import React, { useState } from 'react';
import {
  Settings,
  Folder,
  Terminal,
  Shield,
  Info,
  Palette,
  Sparkles,
  Sliders,
  Check,
  Plus,
  Trash2,
  Moon,
  Sun,
  Laptop,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Toggle } from '@/components/common/Toggle';
import { useAppStore } from '@/stores/app-store';
import { desktopBridge } from '@/desktop/browser-preview-bridge';
import { Logo } from '@/components/ui/Logo';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    openModal,
    isElectron,
    settings,
    updateSetting,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'skills' | 'workspace' | 'terminal' | 'security' | 'about'
  >('general');
  const [skills, setSkills] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activeTab === 'skills') {
      desktopBridge.skills
        .listSkills()
        .then((s) => setSkills(Array.isArray(s) ? s : []))
        .catch(() => setSkills([]));
    }
  }, [activeTab]);

  const defaultShell = (settings.defaultShell as string) || 'powershell.exe';
  const fontSize = (settings.fontSize as string) || '14';
  const securityPolicy = (settings.securityPolicy as 'always' | 'high_risk' | 'never') || 'high_risk';
  const ignoredPatterns =
    (settings.ignoredPatterns as string) || 'node_modules, target, .git, dist, build, .env';

  const setDefaultShell = (v: string) => updateSetting('defaultShell', v);
  const setFontSize = (v: string) => updateSetting('fontSize', v);
  const setSecurityPolicy = (v: 'always' | 'high_risk' | 'never') => updateSetting('securityPolicy', v);

  if (activeModal !== 'settings') return null;

  const NAV_ITEMS = [
    { id: 'general', label: 'General', icon: <Sliders size={15} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={15} /> },
    { id: 'skills', label: 'Skills & Tools', icon: <Sparkles size={15} /> },
    { id: 'workspace', label: 'Workspace & Files', icon: <Folder size={15} /> },
    { id: 'terminal', label: 'Terminal & Shell', icon: <Terminal size={15} /> },
    { id: 'security', label: 'Security & Policies', icon: <Shield size={15} /> },
    { id: 'about', label: 'About REFX', icon: <Info size={15} /> },
  ];

  return (
    <Modal
      isOpen={activeModal === 'settings'}
      onClose={closeModal}
      title="Application Settings"
      subtitle="Refx Desktop preferences, execution policies, theme & native bridge controls."
      icon={<Settings className="w-5 h-5 text-indigo-400" />}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[440px]">
        {/* Left Navigation Sidebar */}
        <div className="md:col-span-4 border-r border-border pr-3 space-y-1 text-xs">
          <div className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider px-2 pb-1.5">
            Preferences
          </div>
          {NAV_ITEMS.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer font-medium ${
                  isSelected
                    ? 'bg-surface text-foreground shadow-xs border border-border'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                <span className={isSelected ? 'text-indigo-400' : 'text-foreground-muted'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Pane */}
        <div className="md:col-span-8 space-y-4 text-xs">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Model Providers</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">
                      Configure your cloud API keys and local inference engines.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openModal('providers')}
                    className="px-3 py-1.5 bg-surface-raised hover:bg-surface border border-border rounded-xl text-foreground font-medium cursor-pointer transition-all"
                  >
                    Open Providers
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Editor Font Size</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">
                      Adjust font scale for chat code blocks and terminal logs.
                    </p>
                  </div>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="bg-surface-raised border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none"
                  >
                    <option value="12">12px (Compact)</option>
                    <option value="14">14px (Standard)</option>
                    <option value="16">16px (Comfortable)</option>
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
            <div className="space-y-4 animate-in fade-in">
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
                            : 'bg-surface border-border text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                        }`}
                      >
                        <span className={isCurrent ? 'text-indigo-400' : 'text-foreground-muted'}>{t.icon}</span>
                        <span className="text-xs">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Interface Density</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">Compact or comfortable layout padding.</p>
                  </div>
                  <select
                    value={(settings.density as string) || 'Comfortable'}
                    onChange={(e) => updateSetting('density', e.target.value)}
                    className="bg-surface-raised border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none"
                  >
                    <option value="Comfortable">Comfortable</option>
                    <option value="Compact">Compact</option>
                  </select>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Reduce Motion</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">Disable smooth animations and transitions.</p>
                  </div>
                  <Toggle
                    checked={Boolean(settings.reduceMotion)}
                    onChange={(val) => updateSetting('reduceMotion', val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Agent Skills</h4>
                  <p className="text-foreground-muted text-[11px] mt-0.5">
                    Extend your AI assistant with prompt instructions and custom tool skills.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const created = await desktopBridge.skills.saveSkill({
                      name: 'Custom Skill',
                      description: 'Custom workflow instructions',
                      instructions: '# Skill Guidelines\n',
                      enabled: true,
                      applyByDefault: false,
                    });
                    setSkills((prev) => [created, ...prev]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-surface hover:opacity-90 rounded-xl font-semibold cursor-pointer text-xs shadow-xs"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>New Skill</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {skills.length === 0 ? (
                  <div className="p-8 text-center bg-surface border border-dashed border-border rounded-2xl text-foreground-muted">
                    No custom skills registered. Add one above to enhance your workflows.
                  </div>
                ) : (
                  skills.map((sk) => (
                    <div
                      key={sk.id}
                      className="p-3.5 bg-surface border border-border rounded-2xl flex items-center justify-between group"
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-foreground-muted hover:text-red-400 rounded-lg transition-opacity cursor-pointer shrink-0"
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

          {/* Workspace & Files Tab */}
          {activeTab === 'workspace' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
                <div className="font-semibold text-foreground">Ignored Patterns</div>
                <p className="text-foreground-muted text-[11px]">
                  Files and folders excluded from workspace scanning and context retrieval.
                </p>
                <textarea
                  value={ignoredPatterns}
                  onChange={(e) => updateSetting('ignoredPatterns', e.target.value)}
                  rows={2}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Terminal & Shell Tab */}
          {activeTab === 'terminal' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">Default Shell</div>
                    <p className="text-foreground-muted text-[11px] mt-0.5">Windows command processor for terminal panel.</p>
                  </div>
                  <select
                    value={defaultShell}
                    onChange={(e) => setDefaultShell(e.target.value)}
                    className="bg-surface-raised border border-border rounded-xl px-3 py-1.5 text-foreground text-xs focus:outline-none font-mono"
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
            <div className="space-y-4 animate-in fade-in">
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
                          ? 'bg-surface-raised border-2 border-indigo-500 text-foreground font-medium shadow-md ring-2 ring-indigo-500/20'
                          : 'bg-surface border-border text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChosen ? 'border-indigo-400 bg-indigo-500' : 'border-border'
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
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 bg-surface border border-border rounded-2xl flex items-center gap-4">
                <Logo width={48} height={48} className="w-10 h-10 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">REFX AI Desktop</h4>
                  <p className="text-foreground-muted text-xs">Windows Local-First Pair Programming Environment</p>
                  <p className="text-[10px] text-foreground-muted font-mono mt-1">Version 1.0.0 (Production Release)</p>
                </div>
              </div>

              <div className="p-4 bg-surface border border-border rounded-2xl space-y-2 text-[11px] text-foreground-muted">
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
                  <span className="font-mono text-foreground">React 19 + Tailwind CSS v4</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
