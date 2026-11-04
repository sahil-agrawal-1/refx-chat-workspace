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
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

export const TerminalPanel: React.FC = () => {
  const {
    bottomPanels,
    toggleBottomPanel,
    terminalSessions,
    activeTerminalId,
    setActiveTerminalId,
    terminalLogs,
    createNewTerminalSession,
    clearTerminalLogs,
  } = useAppStore();

  const isTerminalOpen = bottomPanels.has('terminal');

  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isTerminalOpen) return;
    if (!containerRef.current) return;
    if (!termRef.current) {
      const term = new XTerm({
        fontFamily: 'Cascadia Code, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        theme: { background: '#0d0d0f', foreground: '#a1a1aa', cursor: '#e4e4e7' },
        cursorBlink: true,
        allowProposedApi: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();
      termRef.current = term;
      fitRef.current = fit;
      term.onData((data) => {
        if (activeTerminalId) {
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
  }, [isTerminalOpen]);

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
      } catch {}
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [activeTerminalId]);

  if (!isTerminalOpen) return null;

  return (
    <div className={`w-full bg-surface flex flex-col transition-all duration-200 ${isExpanded ? 'h-96' : 'h-64'}`}>
      <div className="flex items-center justify-between px-3 bg-surface-raised border-b border-border select-none text-xs shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto py-1.5 flex-1 min-w-0">
          {terminalSessions.length === 0 ? (
            <span className="text-xs text-foreground-muted py-1 px-2 flex items-center gap-1.5">
              <TerminalIcon size={12} strokeWidth={1.8} className="text-foreground-muted" />
              No active session
            </span>
          ) : (
            terminalSessions.map((s) => {
              const isActive = s.id === activeTerminalId;
              return (
                <button key={s.id} type="button" onClick={() => setActiveTerminalId(s.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all cursor-pointer text-xs shrink-0 ${isActive ? 'bg-surface text-foreground font-medium border border-border shadow-sm' : 'text-foreground-muted hover:text-foreground hover:bg-surface border border-transparent'}`}>
                  <TerminalIcon size={12} strokeWidth={1.8} className={isActive ? 'text-emerald-400' : 'text-foreground-muted'} />
                  <span className="truncate max-w-[120px]">{s.name}</span>
                </button>
              );
            })
          )}
          <button type="button" onClick={() => createNewTerminalSession('powershell.exe')}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface rounded-md transition-colors cursor-pointer shrink-0"
            title="New Terminal">
            <Plus size={14} strokeWidth={1.8} />
          </button>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <button type="button" onClick={clearTerminalLogs}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface rounded-md transition-colors cursor-pointer"
            title="Clear Output">
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface rounded-md transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize' : 'Maximize'}>
            {isExpanded ? <Minimize2 size={14} strokeWidth={1.8} /> : <Maximize2 size={14} strokeWidth={1.8} />}
          </button>
          <button type="button" onClick={() => toggleBottomPanel('terminal')}
            className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-950/20 rounded-md transition-colors cursor-pointer"
            title="Close Terminal">
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden bg-surface p-1" />
    </div>
  );
};
