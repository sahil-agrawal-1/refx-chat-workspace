import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Play,
  Square,
  Trash2,
  Maximize2,
  Minimize2,
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
    executeTerminalCommand,
    createNewTerminalSession,
    clearTerminalLogs,
    requestPermission,
  } = useAppStore();

  const [inputCommand, setInputCommand] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, activeTerminalId]);

  if (bottomPanel !== 'terminal') return null;

  const currentSession = terminalSessions.find((s) => s.id === activeTerminalId) || terminalSessions[0];
  const logs = (activeTerminalId && terminalLogs[activeTerminalId]) || '';

  const handleSubmitCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isExecuting) return;

    const cmd = inputCommand;
    setInputCommand('');

    const isSensitive = /rm |del |format |npm install|curl |wget /i.test(cmd);
    if (isSensitive) {
      const allowed = await requestPermission({
        type: 'terminal_exec',
        title: 'Terminal Execution Request',
        description: `Confirm execution of command: "${cmd}"`,
        details: { command: cmd, cwd: currentSession?.cwd, shell: currentSession?.shell },
      });
      if (!allowed) {
        return;
      }
    }

    setIsExecuting(true);
    await executeTerminalCommand(cmd);
    setIsExecuting(false);
  };

  return (
    <div
      className={`w-full bg-[#131315] border-t border-[#242427] flex flex-col z-30 transition-all ${
        isExpanded ? 'h-96' : 'h-64'
      }`}
    >
      {/* Top Tabs */}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#5c5c64] font-mono mr-2 hidden sm:inline">
            ConPTY Bridge (Stage 1 Preview)
          </span>

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

      {/* Terminal Output */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-[#a1a1aa] leading-relaxed custom-scrollbar whitespace-pre-wrap select-text bg-[#101012]">
        {terminalSessions.length === 0 ? (
          <div className="p-6 text-center text-[#6c6c74]">
            No active terminal session. Click &quot;+&quot; to start a session.
          </div>
        ) : (
          logs
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input */}
      {terminalSessions.length > 0 && (
        <form
          onSubmit={handleSubmitCommand}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#151518] border-t border-[#222225]"
        >
          <span className="text-[#888891] font-mono text-xs font-semibold select-none">$</span>
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            placeholder="Type command and press Enter..."
            className="flex-1 bg-transparent text-xs text-white font-mono focus:outline-none placeholder-[#55555d]"
          />
          {isExecuting ? (
            <button
              type="button"
              onClick={() => setIsExecuting(false)}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded text-xs transition-colors cursor-pointer"
            >
              <Square size={12} strokeWidth={2} className="fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputCommand.trim()}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#242428] hover:bg-[#2c2c31] text-[#dedee3] rounded text-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              <Play size={12} strokeWidth={2} />
              <span>Run</span>
            </button>
          )}
        </form>
      )}
    </div>
  );
};
