import React, { useState, useRef, useEffect } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

export const TerminalPanel: React.FC = () => {
  const {
    bottomPanel,
    setBottomPanel,
    terminalSessions,
    activeTerminalId,
    setActiveTerminalId,
    terminalLogs,
    createNewTerminalSession,
    clearTerminalLogs,
  } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (bottomPanel !== 'terminal') return;
    if (!containerRef.current) return;
    if (!termRef.current) {
      const term = new XTerm({
        fontFamily: 'Cascadia Code, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        theme: { background: '#101012', foreground: '#a1a1aa' },
        cursorBlink: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();
      termRef.current = term;
      fitRef.current = fit;

      term.onData((data) => {
        if (activeTerminalId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).desktop?.terminal?.sendInput?.(activeTerminalId, data);
        }
      });
    }
    return () => {
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
      writtenRef.current = {};
    };
  }, [bottomPanel]);

  // Sync active terminal output
  useEffect(() => {
    const term = termRef.current;
    if (!term || !activeTerminalId) return;
    const logs = terminalLogs[activeTerminalId] || '';
    const written = writtenRef.current[activeTerminalId] || 0;
    if (logs.length > written) {
      term.write(logs.slice(written));
      writtenRef.current[activeTerminalId] = logs.length;
    }
  }, [terminalLogs, activeTerminalId]);

  // Resize handling
  useEffect(() => {
    const handler = () => {
      try {
        fitRef.current?.fit();
        if (activeTerminalId) {
          const term = termRef.current;
          if (term) {
            (window as any).desktop?.terminal?.resize?.(activeTerminalId, term.cols, term.rows);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [activeTerminalId]);

  if (bottomPanel !== 'terminal') return null;

  const currentSession = terminalSessions.find((s) => s.id === activeTerminalId) || terminalSessions[0];

  return (
    <div
      className={`w-full bg-[#131315] border-t border-[#242427] flex flex-col z-30 transition-all ${
        isExpanded ? 'h-96' : 'h-64'
      }`}
    >
      <div className="flex items-center justify-between px-3 bg-[#161618] border-b border-[#222225] select-none text-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {terminalSessions.length === 0 ? (
            <span className="text-xs text-[#71717a] py-1 px-2">No active terminal session</span>
          ) : (
            terminalSessions.map((s) => {
              const isActive = s.id === activeTerminalId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveTerminalId(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors cursor-pointer text-xs ${
                    isActive
                      ? 'bg-[#242428] text-white font-medium border border-[#2f2f35]'
                      : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
                  }`}
                >
                  <TerminalIcon size={14} strokeWidth={1.8} className="text-[#888891]" />
                  <span>{s.name}</span>
                </button>
              );
            })
          )}
          <button
            type="button"
            onClick={() => createNewTerminalSession('powershell.exe')}
            className="p-1.5 text-[#71717a] hover:text-white hover:bg-[#202023] rounded-md transition-colors cursor-pointer"
            title="New Terminal"
          >
            <Plus size={14} strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearTerminalLogs}
            className="p-1.5 text-[#71717a] hover:text-white hover:bg-[#202023] rounded-md transition-colors cursor-pointer"
            title="Clear Output"
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#71717a] hover:text-white hover:bg-[#202023] rounded-md transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 size={14} strokeWidth={1.8} /> : <Maximize2 size={14} strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            onClick={() => setBottomPanel(null)}
            className="p-1.5 text-[#71717a] hover:text-white hover:bg-[#202023] rounded-md transition-colors cursor-pointer"
            title="Close Terminal"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden bg-[#101012]" />
    </div>
  );
};