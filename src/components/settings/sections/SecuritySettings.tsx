import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsToggle } from '../components/SettingsToggle';
import {
  Shield,
  ShieldCheck,
  Lock,
  Check,
  AlertTriangle,
  FileText,
  Terminal,
  Key,
} from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const { approvalMode, setApprovalMode, settings, updateSetting } = useAppStore();

  const securityPolicy =
    (settings.securityPolicy as 'always' | 'high_risk' | 'never') || 'high_risk';
  const confirmDangerous =
    (settings.confirmDangerousCommands as boolean) ?? true;
  const requireApprovalForDeletes =
    (settings.requireApprovalForDeletes as boolean) ?? true;

  const APPROVAL_MODES = [
    {
      id: 'ask' as const,
      title: 'Ask Approval',
      badge: 'Recommended',
      description:
        'Require explicit human confirmation before executing any terminal command, installing packages, or applying file modifications.',
    },
    {
      id: 'auto_preview' as const,
      title: 'Auto Preview Diffs',
      badge: 'Balanced',
      description:
        'Automatically open and render side-by-side file diffs for inspection before requesting single-click approval to apply changes.',
    },
    {
      id: 'turbo' as const,
      title: 'Turbo Mode',
      badge: 'Elevated Automation',
      description:
        'Autonomously apply verified file edits and safe read operations without prompting. Destructive actions still require confirmation.',
    },
  ];

  const PERMISSION_MATRIX = [
    {
      category: 'Filesystem',
      item: 'Read files in workspace',
      status: 'Allowed',
      desc: 'Autonomous reading within workspace boundary',
      safe: true,
    },
    {
      category: 'Filesystem',
      item: 'Create & write files',
      status: approvalMode === 'turbo' ? 'Autonomous' : 'Requires Approval',
      desc: 'Creates new code files or applies diff patches',
      safe: approvalMode !== 'turbo',
    },
    {
      category: 'Filesystem',
      item: 'Delete files or folders',
      status: 'Always Confirmed',
      desc: 'Moves deleted files to Backup Bin (7-day retention)',
      safe: true,
    },
    {
      category: 'Terminal',
      item: 'Run shell commands',
      status: approvalMode === 'turbo' ? 'Autonomous' : 'Requires Approval',
      desc: 'Launches node-pty ConPTY interactive sessions',
      safe: approvalMode !== 'turbo',
    },
    {
      category: 'Terminal',
      item: 'High-risk commands (rm, format, curl | sh)',
      status: 'Always Blocked / Confirmed',
      desc: 'Regex inspection prevents destructive shell invocations',
      safe: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Agent Approval Modes */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">
            Agent Execution Policy
          </h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Select the autonomous authority level granted to the AI assistant for file edits and terminal operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {APPROVAL_MODES.map((mode) => {
            const isSelected = approvalMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setApprovalMode(mode.id);
                  updateSetting('approvalMode', mode.id);
                  if (mode.id === 'ask') updateSetting('securityPolicy', 'always');
                  else if (mode.id === 'turbo') updateSetting('securityPolicy', 'never');
                  else updateSetting('securityPolicy', 'high_risk');
                }}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#F2F2F2] bg-[#242426] ring-1 ring-[#F2F2F2]/20 shadow-xs'
                    : 'border-[#303034] bg-[#1D1D1F]/70 hover:border-[#71717A] hover:bg-[#242426]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#F2F2F2]">{mode.title}</span>
                    {isSelected && <Check size={13} className="text-[#F2F2F2]" />}
                  </div>
                  <span className="inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#141416] border border-[#303034] text-[#A1A1AA] mt-1.5">
                    {mode.badge}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Permissions Breakdown Matrix */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">
            Permission Enforcement Matrix
          </h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Granular breakdown of Main Process IPC gatekeeping rules.
          </p>
        </div>

        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 divide-y divide-[#303034]/70 overflow-hidden text-xs">
          {PERMISSION_MATRIX.map((perm, idx) => (
            <div
              key={idx}
              className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#242426]/30 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#141416] text-[#71717A] border border-[#303034]">
                    {perm.category}
                  </span>
                  <span className="font-medium text-[#F2F2F2]">{perm.item}</span>
                </div>
                <p className="text-[11px] text-[#A1A1AA]">{perm.desc}</p>
              </div>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#141416] border border-[#303034] text-[#F2F2F2] self-start sm:self-auto shrink-0">
                {perm.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Security Protections */}
      <SettingsSection
        title="Security & Isolation Architecture"
        description="Hardware-backed encryption and filesystem isolation guarantees."
      >
        <SettingsRow
          label="Confirm Dangerous Terminal Commands"
          description="Flag dangerous shell patterns (such as rm -rf, del /f, format, diskpart) for explicit confirmation."
        >
          <SettingsToggle
            checked={confirmDangerous}
            onChange={(val) => updateSetting('confirmDangerousCommands', val)}
            ariaLabel="Confirm dangerous commands"
          />
        </SettingsRow>

        <SettingsRow
          label="Require Approval for Deletes"
          description="Always require explicit confirmation before permanently deleting or trashing any file."
        >
          <SettingsToggle
            checked={requireApprovalForDeletes}
            onChange={(val) => updateSetting('requireApprovalForDeletes', val)}
            ariaLabel="Require approval for deletes"
          />
        </SettingsRow>
      </SettingsSection>

      {/* Security Architecture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-[#303034] bg-[#141416] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F2F2]">
            <Key size={14} className="text-emerald-400" />
            <span>DPAPI Encryption</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            API keys and tokens are encrypted on disk via Windows Data Protection API (DPAPI) and never logged.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-[#303034] bg-[#141416] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F2F2]">
            <Lock size={14} className="text-emerald-400" />
            <span>Filesystem Containment</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            Main Process IPC enforces strict folder boundary checks. Path traversal attacks outside the workspace are blocked.
          </p>
        </div>

        <div className="p-3 rounded-lg border border-[#303034] bg-[#141416] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F2F2]">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Zero Telemetry</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
            Refx has no telemetry, tracking beacons, or intermediate cloud servers. Requests go directly to your configured LLMs.
          </p>
        </div>
      </div>
    </div>
  );
};
