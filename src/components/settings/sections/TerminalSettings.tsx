import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsToggle } from '../components/SettingsToggle';
import { SettingsSelect } from '../components/SettingsSelect';
import { Terminal, Shield, Cpu, Activity } from 'lucide-react';

export const TerminalSettings: React.FC = () => {
  const { settings, updateSetting, terminalSessions } = useAppStore();

  const defaultShell = (settings.defaultShell as string) || 'powershell.exe';
  const workingDir = (settings.terminalWorkingDir as string) || 'workspace';
  const terminalFontSize = (settings.terminalFontSize as string) || '13';
  const terminalFontFamily =
    (settings.terminalFontFamily as string) || 'JetBrains Mono';
  const scrollback = (settings.terminalScrollback as string) || '5000';
  const timeout = (settings.terminalTimeout as string) || '60';
  const cursorBlink = (settings.terminalCursorBlink as boolean) ?? true;
  const soundBell = (settings.terminalSoundBell as boolean) ?? false;

  return (
    <div className="space-y-6">
      {/* ConPTY Diagnostics Banner */}
      <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#141416] border border-[#303034] flex items-center justify-center text-emerald-400">
              <Terminal size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#F2F2F2]">
                Windows ConPTY Pseudo-Console Architecture
              </h3>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Native binary execution powered by node-pty on Node.js 22 runtime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity size={12} />
              <span>{terminalSessions.length} active session(s)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#303034] text-[11px]">
          <div className="p-2 rounded bg-[#141416] border border-[#303034]/70">
            <div className="text-[#71717A] text-[10px]">ANSI Rendering</div>
            <div className="font-semibold text-[#F2F2F2] mt-0.5">xterm.js WebGL/Canvas</div>
          </div>
          <div className="p-2 rounded bg-[#141416] border border-[#303034]/70">
            <div className="text-[#71717A] text-[10px]">Process Containment</div>
            <div className="font-semibold text-[#F2F2F2] mt-0.5">Workspace Sandboxed</div>
          </div>
          <div className="p-2 rounded bg-[#141416] border border-[#303034]/70">
            <div className="text-[#71717A] text-[10px]">Active Shell Binary</div>
            <div className="font-semibold text-[#F2F2F2] font-mono mt-0.5">{defaultShell}</div>
          </div>
        </div>
      </div>

      {/* Shell & Working Directory */}
      <SettingsSection
        title="Shell Environment"
        description="Interpreter configuration and initialization directory."
      >
        <SettingsRow
          label="Default Shell"
          description="Primary command interpreter launched when starting interactive terminals."
        >
          <SettingsSelect
            value={defaultShell}
            onChange={(v) => updateSetting('defaultShell', v)}
            options={[
              { value: 'powershell.exe', label: 'PowerShell (powershell.exe)' },
              { value: 'cmd.exe', label: 'Command Prompt (cmd.exe)' },
              { value: 'bash.exe', label: 'Git Bash (bash.exe)' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Default Working Directory"
          description="Starting working directory for new terminal sessions."
        >
          <SettingsSelect
            value={workingDir}
            onChange={(v) => updateSetting('terminalWorkingDir', v)}
            options={[
              { value: 'workspace', label: 'Active Workspace Root' },
              { value: 'home', label: 'User Home Directory' },
            ]}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Typography & Presentation */}
      <SettingsSection
        title="Terminal Typography"
        description="Visual presentation, font scaling, and cursor styling in the terminal pane."
      >
        <SettingsRow
          label="Font Family"
          description="Monospaced typeface used for ANSI console output."
        >
          <SettingsSelect
            value={terminalFontFamily}
            onChange={(v) => updateSetting('terminalFontFamily', v)}
            options={[
              { value: 'JetBrains Mono', label: 'JetBrains Mono' },
              { value: 'Cascadia Code', label: 'Cascadia Code' },
              { value: 'Consolas', label: 'Consolas' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Font Size"
          description="Character font scale rendered by xterm.js."
        >
          <SettingsSelect
            value={terminalFontSize}
            onChange={(v) => updateSetting('terminalFontSize', v)}
            options={[
              { value: '11', label: '11px · Compact' },
              { value: '12', label: '12px · Small' },
              { value: '13', label: '13px · Standard' },
              { value: '14', label: '14px · Medium' },
              { value: '16', label: '16px · Large' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Cursor Blinking"
          description="Animate the terminal insertion point cursor."
        >
          <SettingsToggle
            checked={cursorBlink}
            onChange={(val) => updateSetting('terminalCursorBlink', val)}
            ariaLabel="Cursor blinking"
          />
        </SettingsRow>
      </SettingsSection>

      {/* Execution Limits */}
      <SettingsSection
        title="Buffer & Session Limits"
        description="Memory allocation and timeout limits for long-running processes."
      >
        <SettingsRow
          label="Scrollback History"
          description="Maximum lines retained in output buffer before truncation."
        >
          <SettingsSelect
            value={scrollback}
            onChange={(v) => updateSetting('terminalScrollback', v)}
            options={[
              { value: '1000', label: '1,000 lines' },
              { value: '2500', label: '2,500 lines' },
              { value: '5000', label: '5,000 lines (Standard)' },
              { value: '10000', label: '10,000 lines' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Agent Execution Timeout"
          description="Maximum continuous execution duration before automated commands are aborted."
        >
          <SettingsSelect
            value={timeout}
            onChange={(v) => updateSetting('terminalTimeout', v)}
            options={[
              { value: '30', label: '30 seconds' },
              { value: '60', label: '60 seconds (Standard)' },
              { value: '120', label: '2 minutes' },
              { value: '300', label: '5 minutes' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Terminal Audio Bell"
          description="Play system notification tone on ASCII bell signal (\x07)."
        >
          <SettingsToggle
            checked={soundBell}
            onChange={(val) => updateSetting('terminalSoundBell', val)}
            ariaLabel="Audio bell"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};
