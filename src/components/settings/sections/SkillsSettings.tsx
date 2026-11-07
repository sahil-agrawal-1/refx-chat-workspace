import React, { useState, useEffect, useRef } from 'react';
import { desktopBridge } from '@/desktop/browser-preview-bridge';
import { SettingsSearchInput } from '../components/SettingsSearchInput';
import { SettingsEmptyState } from '../components/SettingsEmptyState';
import { SettingsToggle } from '../components/SettingsToggle';
import {
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Copy,
  Download,
  FolderOpen,
  Check,
  AlertCircle,
  Shield,
  FileCode,
} from 'lucide-react';

interface SkillItem {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  enabled?: boolean;
  applyByDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export const SkillsSettings: React.FC = () => {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsDir, setSkillsDir] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Editing state for active skill
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [editDefault, setEditDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New skill creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newInstructions, setNewInstructions] = useState(
    '# Role & Workflow\n\nYou are an expert assistant specialized in...\n\n## Guidelines\n- Always verify changes\n- Follow project architectural conventions\n'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const [list, dir] = await Promise.all([
        desktopBridge.skills.listSkills(),
        desktopBridge.skills.getSkillsDir().catch(() => ''),
      ]);
      const validList = Array.isArray(list) ? list : [];
      setSkills(validList);
      setSkillsDir(dir || '%APPDATA%\\Refx AI\\skills');
      if (validList.length > 0 && !selectedSkillId) {
        setSelectedSkillId(validList[0].id);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSkills();
  }, []);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) || null;

  useEffect(() => {
    if (selectedSkill) {
      setEditName(selectedSkill.name || '');
      setEditDesc(selectedSkill.description || '');
      setEditInstructions(selectedSkill.instructions || '');
      setEditEnabled(selectedSkill.enabled ?? true);
      setEditDefault(selectedSkill.applyByDefault ?? false);
      setSaveSuccess(false);
    }
  }, [selectedSkillId, selectedSkill]);

  const handleSaveSelected = async () => {
    if (!selectedSkill) return;
    setIsSaving(true);
    try {
      const payload = {
        ...selectedSkill,
        name: editName.trim() || selectedSkill.name,
        description: editDesc.trim(),
        instructions: editInstructions,
        enabled: editEnabled,
        applyByDefault: editDefault,
        updatedAt: Date.now(),
      };
      const updated = await desktopBridge.skills.saveSkill(payload);
      setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save skill:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      await desktopBridge.skills.deleteSkill(id);
      const remaining = skills.filter((s) => s.id !== id);
      setSkills(remaining);
      if (selectedSkillId === id) {
        setSelectedSkillId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dup = await desktopBridge.skills.duplicateSkill(id);
      if (dup) {
        setSkills((prev) => [dup, ...prev]);
        setSelectedSkillId(dup.id);
      }
    } catch (err) {
      console.error('Failed to duplicate skill:', err);
    }
  };

  const handleExport = (skill: SkillItem) => {
    const blob = new Blob([skill.instructions || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || 'skill'}.SKILL.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const created = await desktopBridge.skills.saveSkill({
        name: newName.trim(),
        description: newDesc.trim(),
        instructions: newInstructions.trim(),
        enabled: true,
        applyByDefault: false,
      });
      setSkills((prev) => [created, ...prev]);
      setSelectedSkillId(created.id);
      setIsCreating(false);
      setNewName('');
      setNewDesc('');
      setNewInstructions('');
    } catch (err) {
      console.error('Failed to create skill:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          // Fall back to plain text
        }
      }
      const created = await desktopBridge.skills.saveSkill(payload);
      setSkills((prev) => [created, ...prev]);
      setSelectedSkillId(created.id);
    } finally {
      e.target.value = '';
    }
  };

  const filteredSkills = skills.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#303034]">
        <div>
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] flex items-center gap-2">
            <span>Agent Skills Library</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#242426] border border-[#303034] text-[#A1A1AA]">
              {skills.length} installed
            </span>
          </h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Extend your AI assistant with persistent markdown workflow instructions and task guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,.json"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1D1D1F] hover:bg-[#242426] text-[#F2F2F2] border border-[#303034] text-xs font-medium transition-colors cursor-pointer"
          >
            <Upload size={12} />
            <span>Import SKILL.md</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F2F2F2] hover:bg-white text-[#171717] text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>New Skill</span>
          </button>
        </div>
      </div>

      {/* New Skill Modal / Inline Creator */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-lg border border-[#303034] bg-[#1D1D1F] p-4 space-y-3.5 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-[#303034] pb-2">
            <span className="text-xs font-semibold text-[#F2F2F2] flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#A1A1AA]" />
              <span>Create New Skill</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-[#A1A1AA] hover:text-[#F2F2F2]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#A1A1AA]">Skill Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. React Architecture Specialist"
                required
                className="w-full bg-[#141416] border border-[#303034] rounded-md px-2.5 py-1.5 text-xs text-[#F2F2F2] placeholder-[#71717A] focus:outline-none focus:border-[#F2F2F2]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#A1A1AA]">Short Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="When and how this skill should be applied"
                className="w-full bg-[#141416] border border-[#303034] rounded-md px-2.5 py-1.5 text-xs text-[#F2F2F2] placeholder-[#71717A] focus:outline-none focus:border-[#F2F2F2]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#A1A1AA]">Skill Instructions (Markdown)</label>
            <textarea
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              rows={8}
              required
              className="w-full bg-[#141416] border border-[#303034] rounded-md p-2.5 text-xs font-mono text-[#F2F2F2] placeholder-[#71717A] focus:outline-none focus:border-[#F2F2F2] leading-relaxed resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#71717A]">
              Will be saved as <code className="text-[#A1A1AA]">SKILL.md</code> in local app storage.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F2F2F2] cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSaving || !newName.trim()}
                className="px-4 py-1.5 rounded-md bg-[#F2F2F2] text-[#171717] text-xs font-semibold hover:bg-white disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Creating...' : 'Save Skill'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Dual-Pane Library */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[460px]">
        {/* Left Column: Skill List */}
        <div className="flex flex-col rounded-lg border border-[#303034] bg-[#1D1D1F]/50 overflow-hidden">
          <div className="p-2.5 border-b border-[#303034]">
            <SettingsSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search skills..."
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5 max-h-[460px]">
            {filteredSkills.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#A1A1AA]">
                {skills.length === 0
                  ? 'No skills installed yet.'
                  : 'No skills match your search.'}
              </div>
            ) : (
              filteredSkills.map((sk) => {
                const isSelected = sk.id === selectedSkillId;
                return (
                  <button
                    key={sk.id}
                    type="button"
                    onClick={() => setSelectedSkillId(sk.id)}
                    className={`w-full p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#303034] bg-[#242426] shadow-xs text-[#F2F2F2]'
                        : 'border-transparent hover:bg-[#1D1D1F] text-[#A1A1AA] hover:text-[#F2F2F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCode size={13} className={isSelected ? 'text-[#F2F2F2]' : 'text-[#71717A]'} />
                        <span className="text-xs font-semibold truncate text-[#F2F2F2]">
                          {sk.name}
                        </span>
                      </div>
                      {sk.applyByDefault && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#141416] border border-[#303034] text-[#A1A1AA] shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    {sk.description ? (
                      <p className="text-[11px] text-[#A1A1AA] line-clamp-1 mt-1">
                        {sk.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#71717A] italic mt-1">
                        No description
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {skillsDir && (
            <div className="p-2 border-t border-[#303034] bg-[#141416] text-[10px] text-[#71717A] truncate">
              Storage: <span className="font-mono text-[#A1A1AA]">{skillsDir}</span>
            </div>
          )}
        </div>

        {/* Right Column: Skill Detail Panel */}
        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-4 flex flex-col justify-between overflow-hidden">
          {selectedSkill ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#303034]">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-sm font-semibold text-[#F2F2F2] bg-transparent border-b border-transparent hover:border-[#303034] focus:border-[#F2F2F2] focus:outline-none px-0.5 py-0.5 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#71717A] font-mono">
                    <span>ID: {selectedSkill.id}</span>
                    <span>·</span>
                    <span>
                      Updated {new Date(selectedSkill.updatedAt || selectedSkill.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExport(selectedSkill)}
                    title="Export SKILL.md"
                    className="p-1.5 text-[#A1A1AA] hover:text-[#F2F2F2] hover:bg-[#242426] rounded border border-[#303034] transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(selectedSkill.id)}
                    title="Duplicate skill"
                    className="p-1.5 text-[#A1A1AA] hover:text-[#F2F2F2] hover:bg-[#242426] rounded border border-[#303034] transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedSkill.id)}
                    title="Delete skill"
                    className="p-1.5 text-[#A1A1AA] hover:text-rose-400 hover:bg-[#242426] rounded border border-[#303034] transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Toggles & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-[#141416] border border-[#303034]/70">
                <div className="flex items-center justify-between gap-2 pr-2">
                  <div>
                    <span className="text-xs font-medium text-[#F2F2F2]">Enabled</span>
                    <p className="text-[10px] text-[#A1A1AA]">Include in agent tool indexing</p>
                  </div>
                  <SettingsToggle checked={editEnabled} onChange={setEditEnabled} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t sm:border-t-0 sm:border-l border-[#303034]/70 pt-2 sm:pt-0 sm:pl-3">
                  <div>
                    <span className="text-xs font-medium text-[#F2F2F2]">Apply by Default</span>
                    <p className="text-[10px] text-[#A1A1AA]">Inject into all conversations</p>
                  </div>
                  <SettingsToggle checked={editDefault} onChange={setEditDefault} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A1A1AA]">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Short description for routing and retrieval"
                  className="w-full bg-[#141416] border border-[#303034] rounded-md px-2.5 py-1.5 text-xs text-[#F2F2F2] placeholder-[#71717A] focus:outline-none focus:border-[#F2F2F2]"
                />
              </div>

              {/* Instructions Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#A1A1AA]">
                    Skill Instructions (<code className="text-[#F2F2F2]">SKILL.md</code>)
                  </label>
                  <span className="text-[10px] text-[#71717A]">Markdown syntax supported</span>
                </div>
                <textarea
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={10}
                  className="w-full bg-[#141416] border border-[#303034] rounded-md p-3 text-xs font-mono text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2] leading-relaxed resize-y"
                />
              </div>

              {/* Policy Enforcement Notice */}
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-[#141416] border border-[#303034] text-[11px] text-[#A1A1AA]">
                <Shield size={14} className="text-[#A1A1AA] shrink-0" />
                <span>
                  Skill guidelines never override system security policies or agent permission checks.
                </span>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#303034]">
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium mr-2">
                    <Check size={13} />
                    <span>Saved</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveSelected}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-md bg-[#F2F2F2] hover:bg-white text-[#171717] text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <SettingsEmptyState
              icon={<Sparkles size={18} />}
              title="No skill selected"
              description="Select a skill from the list to view its markdown instructions or create a new skill."
              action={
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 rounded-md bg-[#F2F2F2] text-[#171717] text-xs font-semibold cursor-pointer"
                >
                  Create Skill
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};
