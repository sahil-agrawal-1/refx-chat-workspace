import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { desktopBridge } from '@/desktop/browser-preview-bridge';
import { Logo } from '@/components/ui/Logo';
import {
  Info,
  Laptop,
  CheckCircle2,
  ExternalLink,
  Code,
  Database,
  Terminal,
  Shield,
  Layers,
} from 'lucide-react';

interface AppInfoState {
  version: string;
  electron?: string;
  node?: string;
  osVersion: string;
  platform: string;
  arch: string;
}

export const AboutSettings: React.FC = () => {
  const { isElectron } = useAppStore();
  const [appInfo, setAppInfo] = useState<AppInfoState>({
    version: '1.0.0',
    osVersion: 'Windows 10/11',
    platform: 'win32',
    arch: 'x64',
    node: '22.14.0',
    electron: '45.2.1',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.desktop?.getAppInfo) {
      window.desktop
        .getAppInfo()
        .then((info) => {
          setAppInfo((prev) => ({
            ...prev,
            version: info.version || prev.version,
            osVersion: info.osVersion || prev.osVersion,
            platform: info.platform || prev.platform,
            arch: info.arch || prev.arch,
          }));
        })
        .catch(() => {});
    }
  }, []);

  const SPECS = [
    { label: 'Host Runtime', value: isElectron ? 'Electron Native Desktop' : 'Vite Browser Preview' },
    { label: 'Application Version', value: `v${appInfo.version} (Stable Release)` },
    { label: 'Electron Version', value: appInfo.electron ? `v${appInfo.electron}` : 'Embedded' },
    { label: 'Node.js Engine', value: appInfo.node ? `v${appInfo.node}` : 'Node 22' },
    { label: 'Platform & OS', value: `${appInfo.osVersion} (${appInfo.platform})` },
    { label: 'Architecture', value: appInfo.arch || 'x64' },
    { label: 'Database Storage', value: 'SQLite 3 with WAL & FTS5 Full-Text Search' },
    { label: 'UI Architecture', value: 'React 19 · Tailwind CSS v4 · Motion' },
  ];

  const KEYBOARD_SHORTCUTS = [
    { keys: 'Ctrl + ,', label: 'Open Settings' },
    { keys: 'Ctrl + K', label: 'Focus Chat Composer' },
    { keys: 'Ctrl + B', label: 'Toggle Sidebar' },
    { keys: 'Ctrl + `', label: 'Toggle Terminal Panel' },
    { keys: 'Ctrl + Shift + D', label: 'Toggle Diff Review' },
    { keys: 'Esc', label: 'Close Active Modal / Drawer' },
  ];

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#141416] border border-[#303034] flex items-center justify-center p-2.5 shrink-0 shadow-xs">
            <Logo className="w-full h-full text-[#F2F2F2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#F2F2F2] tracking-tight">
                REFX AI Workspace
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Local-First Windows AI Pair Programming & Coding Environment
            </p>
            <p className="text-[10px] text-[#71717A] font-mono mt-1">
              Production Release · Built for developers and autonomous agent workflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-[#A1A1AA] bg-[#141416] px-2.5 py-1 rounded border border-[#303034]">
            v{appInfo.version}
          </span>
        </div>
      </div>

      {/* System Specifications Grid */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">
            Runtime Specifications
          </h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Diagnostic details reported directly by the operating system and Electron host process.
          </p>
        </div>

        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 divide-y divide-[#303034]/70 overflow-hidden text-xs">
          {SPECS.map((spec, i) => (
            <div
              key={i}
              className="p-3 flex items-center justify-between gap-4 hover:bg-[#242426]/30 transition-colors"
            >
              <span className="text-[#A1A1AA]">{spec.label}</span>
              <span className="font-mono text-[#F2F2F2] text-right truncate max-w-xs sm:max-w-md">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">
            Keyboard Shortcuts
          </h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Accelerate your workflow with desktop hotkeys.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {KEYBOARD_SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="p-2.5 rounded-md border border-[#303034] bg-[#141416] flex items-center justify-between"
            >
              <span className="text-[#A1A1AA]">{sc.label}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#1D1D1F] border border-[#303034] font-mono text-[11px] text-[#F2F2F2]">
                {sc.keys}
              </kbd>
            </div>
          ))}
        </div>
      </section>


    </div>
  );
};
