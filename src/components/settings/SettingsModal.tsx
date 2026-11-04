import React, { useState } from 'react';
import {
  Settings,
  Folder,
  Terminal,
  Shield,
  Info,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
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

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'skills' | 'workspace' | 'terminal' | 'security' | 'about'>('general');
  const [skills, setSkills] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activeTab === 'skills') {
      desktopBridge.skills.listSkills().then((s) => setSkills(Array.isArray(s) ? s : [])).catch(() => setSkills([]));
    }
  }, [activeTab]);
  const defaultShell = (settings.defaultShell as string) || 'powershell.exe';
  const fontSize = (settings.fontSize as string) || '14';
  const securityPolicy = (settings.securityPolicy as 'always' | 'high_risk' | 'never') || 'high_risk';
  const ignoredPatterns = (settings.ignoredPatterns as string) || 'node_modules, target, .git, dist, build, .env';

  const setDefaultShell = (v: string) => updateSetting('defaultShell', v);
  const setFontSize = (v: string) => updateSetting('fontSize', v);
  const setSecurityPolicy = (v: 'always' | 'high_risk' | 'never') => updateSetting('securityPolicy', v);

  if (activeModal !== 'settings') return null;

  return (
    <Modal
      isOpen={activeModal === 'settings'}
      onClose={closeModal}
      title="Application Settings"
      subtitle="Refx Desktop configuration, native bridges, and execution policies."
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[380px]">
        {/* Left Tabs */}
        <div className="md:col-span-4 border-r border-[#242427] pr-3 space-y-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'general' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Settings size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'appearance' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Settings size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'skills' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Settings size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>Skills</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'workspace' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Folder size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>Workspace & Files</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'terminal' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Terminal size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'security' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Shield size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>Security & Approvals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
              activeTab === 'about' ? 'bg-[#242428] text-white font-medium border border-[#303036]' : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
            }`}
          >
            <Info size={16} strokeWidth={1.8} className="text-[#888891]" />
            <span>About</span>
          </button>
        </div>

        {/* Right Tab Content */}
        <div className="md:col-span-8 space-y-3.5 text-xs">
          {activeTab === 'appearance' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Theme</label>
                <select value={(settings.theme as string) || 'Dark'} onChange={(e) => updateSetting('theme', e.target.value)} className="bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white w-full text-xs">
                  <option value="Dark">Dark</option>
                  <option value="Light">Light</option>
                  <option value="System">System</option>
                </select>
              </div>
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Accent Color</label>
                <select value={(settings.accent as string) || 'Neutral'} onChange={(e) => updateSetting('accent', e.target.value)} className="bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white w-full text-xs">
                  <option value="Neutral">Neutral</option>
                  <option value="Blue">Blue</option>
                  <option value="Violet">Violet</option>
                  <option value="Green">Green</option>
                </select>
              </div>
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Interface Density</label>
                <select value={(settings.density as string) || 'Comfortable'} onChange={(e) => updateSetting('density', e.target.value)} className="bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white w-full text-xs">
                  <option value="Comfortable">Comfortable</option>
                  <option value="Compact">Compact</option>
                </select>
              </div>
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Font Size</label>
                <select value={(settings.fontSize as string) || '14'} onChange={(e) => updateSetting('fontSize', e.target.value)} className="bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white w-full text-xs">
                  <option value="12">Small</option>
                  <option value="14">Medium</option>
                  <option value="16">Large</option>
                </select>
              </div>
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Reduce Motion</label>
                <button type="button" onClick={() => updateSetting('reduceMotion', !settings.reduceMotion)} className="px-3 py-1.5 bg-[#131315] border border-[#242428] rounded-md text-white text-xs">
                  {(settings.reduceMotion as boolean) ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[#71717a] text-xs">Local skills stored in the Refx AI skills directory.</p>
                <button
                  type="button"
                  onClick={async () => {
                    const created = await desktopBridge.skills.saveSkill({ name: 'New Skill', description: '', instructions: '# Instructions\\n', enabled: true, applyByDefault: false });
                    setSkills((prev) => [created, ...prev]);
                  }}
                  className="px-2.5 py-1 bg-[#242428] hover:bg-[#2c2c31] text-white rounded text-xs cursor-pointer"
                >
                  New Skill
                </button>
              </div>
              {skills.length === 0 ? (
                <p className="text-[#71717a] text-xs">No skills found.</p>
              ) : (
                skills.map((sk) => (
                  <div key={sk.id} className="p-2.5 bg-[#18181b] border border-[#242428] rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-medium">{sk.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await desktopBridge.skills.deleteSkill(sk.id);
                            setSkills((prev) => prev.filter((s) => s.id !== sk.id));
                          }}
                          className="text-[#71717a] hover:text-red-400 text-xs cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#71717a]">{sk.description}</p>
                    <p className="text-[10px] text-[#6c6c74]">Apply by default: {sk.applyByDefault ? 'Yes' : 'No'}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Editor Font Size</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white w-full text-xs"
                >
                  <option value="12">12px (Compact)</option>
                  <option value="14">14px (Default)</option>
                  <option value="16">16px (Comfortable)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Providers</label>
                <button
                  type="button"
                  onClick={() => openModal('providers')}
                  className="w-full py-1.5 bg-[#202024] hover:bg-[#28282d] text-white rounded-md transition-colors cursor-pointer text-center border border-[#2f2f35]"
                >
                  Manage Model Providers...
                </button>
              </div>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Ignored Patterns</label>
                <textarea
                  value={ignoredPatterns}
                  onChange={(e) => updateSetting('ignoredPatterns', e.target.value)}
                  rows={2}
                  className="w-full bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white font-mono text-xs resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Default Shell</label>
                <select
                  value={defaultShell}
                  onChange={(e) => setDefaultShell(e.target.value)}
                  className="bg-[#131315] border border-[#242428] rounded-md px-3 py-1.5 text-white w-full text-xs"
                >
                  <option value="powershell.exe">PowerShell (powershell.exe)</option>
                  <option value="cmd.exe">Windows Command Prompt (cmd.exe)</option>
                  <option value="bash.exe">Git Bash (bash.exe)</option>
                </select>
              </div>

              <div className="p-3 bg-[#151518] border border-[#242428] rounded-lg space-y-1">
                <span className="text-white font-medium">Windows ConPTY Pseudo-Console</span>
                <p className="text-[11px] text-[#71717a]">
                  ConPTY attachment executes via native process bridge in Electron Stage 2.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <label className="block text-[#a1a1aa] font-medium mb-1">Execution Policy</label>
              <div className="space-y-2">
                <label
                  onClick={() => setSecurityPolicy('high_risk')}
                  className={`block p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    securityPolicy === 'high_risk' ? 'bg-[#202024] border-zinc-500 text-white' : 'bg-[#141416] border-[#242428] text-[#888891]'
                  }`}
                >
                  <div className="font-medium">Prompt on High-Risk Commands (Recommended)</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Prompt confirmation for filesystem modifications or installation commands.</div>
                </label>

                <label
                  onClick={() => setSecurityPolicy('always')}
                  className={`block p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    securityPolicy === 'always' ? 'bg-[#202024] border-zinc-500 text-white' : 'bg-[#141416] border-[#242428] text-[#888891]'
                  }`}
                >
                  <div className="font-medium">Always Prompt</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Require explicit permission before any terminal command executes.</div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-3 bg-[#151518] border border-[#242428] rounded-lg">
                <Logo width={36} height={48} className="w-6 h-6" />
                <div>
                  <h4 className="font-medium text-white text-xs">REFX AI Desktop</h4>
                  <p className="text-[11px] text-[#71717a]">Windows AI Workspace</p>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-[#888891]">
                <p>Environment: {isElectron ? 'Electron Host' : 'Browser Preview Mode'}</p>
                <p>Target: Windows 10/11 x64</p>
                <p>Bridge Interface: shared/contracts/desktop-bridge.ts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
