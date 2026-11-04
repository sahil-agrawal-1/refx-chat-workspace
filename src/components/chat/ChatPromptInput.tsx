import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Square,
  Plus,
  Mic,
  MicOff,
  ChevronDown,
  Paperclip,
  FileCode,
  Terminal,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Toggle } from '@/components/common/Toggle';
// Model selection is handled via slash commands

export const ChatPromptInput: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEffortMenu, setShowEffortMenu] = useState(false);
  const [showApprovalMenu, setShowApprovalMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const projectPickerRef = useRef<HTMLDivElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);

  const SLASH_COMMANDS = [
    { cmd: '/model', desc: 'Select a model' },
    { cmd: '/models', desc: 'List connected models' },
    { cmd: '/effort', desc: 'Set reasoning effort' },
    { cmd: '/approval', desc: 'Set approval mode' },
    { cmd: '/new', desc: 'New conversation' },
    { cmd: '/workspace', desc: 'Select workspace' },
    { cmd: '/memory', desc: 'Toggle save memory' },
    { cmd: '/clear', desc: 'Clear chat input' },
    { cmd: '/help', desc: 'Show commands' },
  ];

  const {
    sendMessage,
    stopGeneration,
    isGenerating,
    saveMemoryActive,
    setSaveMemoryActive,
    selectedWorkspace,
    recentWorkspaces,
    setWorkspace,
    openWorkspaceDialog,
    effort,
    setEffort,
    approvalMode,
    setApprovalMode,
    startNewConversation,
    setSelectedModel,
    selectedModel,
    providers,
  } = useAppStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
    setShowCommandMenu(prompt.startsWith('/') && !prompt.includes(' '));
  }, [prompt]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (projectPickerRef.current && !projectPickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const runCommand = async (text: string) => {
    const trimmed = text.trim();
    const [cmd, ...args] = trimmed.split(/\s+/);
    switch (cmd) {
      case '/new':
        startNewConversation();
        return true;
      case '/workspace':
        openWorkspaceDialog();
        return true;
      case '/clear':
        setPrompt('');
        return true;
      case '/memory':
        setSaveMemoryActive(!saveMemoryActive);
        return true;
      case '/help':
        setPrompt('/commands: ' + SLASH_COMMANDS.map((c) => c.cmd).join(', '));
        return true;
      case '/model': {
        if (args[0]) {
          const found = providers.flatMap((p) => p.discoveredModels.map((m) => ({ p, m }))).find((x) => x.m === args[0]);
          if (found) {
            setSelectedModel(found.m, found.p.id);
            setPrompt(`Model set to ${found.m}`);
          } else {
            setPrompt(`Model not found: ${args[0]}`);
          }
        } else {
          setShowModelPicker(true);
        }
        return true;
      }
      case '/models': {
        const list = providers.filter((p) => p.status === 'connected').flatMap((p) => p.discoveredModels.map((m) => `${p.id}:${m}`));
        setPrompt(list.length ? list.join(', ') : 'No connected models.');
        return true;
      }
      case '/effort':
        if (args[0]) { setEffort(args[0]); setPrompt(`Effort set to ${args[0]}`); }
        else setPrompt('/effort <auto|low|medium|high|extra high|max>');
        return true;
      case '/approval':
        if (args[0]) { setApprovalMode(args[0] as any); setPrompt(`Approval set to ${args[0]}`); }
        else setPrompt('/approval <ask|turbo|auto_preview>');
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (prompt.trim().startsWith('/')) {
      const handled = await runCommand(prompt.trim());
      if (handled) return;
    }

    const text = prompt;
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleMic = () => {
    setIsListening((prev) => !prev);
  };

  return (
    <>
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 select-none">
      {/* Workspace indicator / selector directly above prompt container */}
      <div className="relative mb-2 inline-block" ref={projectPickerRef}>
        <button
          type="button"
          onClick={() => setShowProjectPicker(!showProjectPicker)}
          className="flex items-center gap-1.5 text-xs text-[#8a8a92] hover:text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        >
          <span>{selectedWorkspace ? selectedWorkspace.name : 'No workspace selected'}</span>
          <ChevronDown size={14} strokeWidth={1.8} className="text-foreground-muted" />
        </button>

        {showProjectPicker && (
          <div className="absolute left-0 bottom-full mb-1 w-64 bg-surface-raised border border-border rounded-xl shadow-xl py-1 z-50 text-xs">
            <div className="px-3 py-1.5 text-[11px] text-foreground-muted uppercase tracking-wider border-b border-border">
              Workspace Directory
            </div>
            <button
              type="button"
              onClick={() => {
                setWorkspace(null);
                setShowProjectPicker(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                !selectedWorkspace ? 'bg-surface text-white font-medium' : 'text-foreground-muted hover:text-white hover:bg-surface'
              }`}
            >
              <span>No workspace</span>
              {!selectedWorkspace && <Check size={14} strokeWidth={2} className="text-zinc-300" />}
            </button>
            {recentWorkspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  setWorkspace(ws);
                  setShowProjectPicker(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                  selectedWorkspace?.id === ws.id ? 'bg-surface text-white font-medium' : 'text-foreground-muted hover:text-white hover:bg-surface'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="truncate">{ws.name}</div>
                  <div className="text-[10px] text-foreground-muted font-mono truncate">{ws.path}</div>
                </div>
                {selectedWorkspace?.id === ws.id && <Check size={14} strokeWidth={2} className="text-zinc-300 shrink-0" />}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1 px-2">
              <button
                type="button"
                onClick={() => {
                  setShowProjectPicker(false);
                  openWorkspaceDialog();
                }}
                className="w-full text-center py-1.5 text-xs text-foreground-muted hover:text-white hover:bg-surface rounded-md transition-colors cursor-pointer"
              >
                Open workspace folder...
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Prompt Box */}
      <div className="bg-surface-input border border-border rounded-xl p-3 shadow-lg transition-colors focus-within:border-[#3c3c44]">
        {showCommandMenu && (
          <div ref={commandMenuRef} className="mb-2 bg-surface-raised border border-border rounded-lg shadow-xl py-1 text-xs">
            {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(prompt.trim())).map((c) => (
              <button
                key={c.cmd}
                type="button"
                onClick={() => { setPrompt(c.cmd + ' '); setShowCommandMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-foreground-muted hover:text-white hover:bg-surface cursor-pointer"
              >
                <span className="font-mono text-white">{c.cmd}</span> <span className="text-foreground-muted">{c.desc}</span>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          rows={1}
          className="w-full bg-transparent text-foreground placeholder-[#6c6c74] text-sm resize-none focus:outline-none custom-scrollbar min-h-[38px] max-h-[160px] leading-relaxed select-text"
        />

        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-1.5 text-foreground-muted hover:text-white hover:bg-surface rounded-md transition-colors cursor-pointer"
                aria-label="Add attachments or context"
                title="Add context"
              >
                <Plus size={16} strokeWidth={1.8} />
              </button>

              {showAttachMenu && (
                <div className="absolute left-0 bottom-full mb-1.5 w-52 bg-surface-raised border border-border rounded-xl shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] text-foreground-muted uppercase tracking-wider border-b border-border">
                    Context
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((prev) => (prev ? prev + '\n' : '') + '@file ');
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-foreground-muted hover:text-white hover:bg-surface cursor-pointer"
                  >
                    <FileCode size={14} strokeWidth={1.8} className="text-foreground-muted" />
                    <span>Workspace File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((prev) => (prev ? prev + '\n' : '') + '@terminal ');
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-foreground-muted hover:text-white hover:bg-surface cursor-pointer"
                  >
                    <Terminal size={14} strokeWidth={1.8} className="text-foreground-muted" />
                    <span>Terminal Output</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((prev) => (prev ? prev + '\n' : '') + '@memory ');
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-foreground-muted hover:text-white hover:bg-surface cursor-pointer"
                  >
                    <Paperclip size={14} strokeWidth={1.8} className="text-foreground-muted" />
                    <span>Task Memory</span>
                  </button>
                </div>
              )}
            </div>

            {/* Model selection moved to /model command */}
            {/* Effort selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEffortMenu(!showEffortMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-foreground-muted hover:text-white hover:bg-surface transition-colors cursor-pointer"
                title="Reasoning effort"
              >
                <span>Effort: {effort}</span>
                <ChevronDown size={12} strokeWidth={1.8} />
              </button>
              {showEffortMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-40 bg-surface-raised border border-border rounded-xl shadow-xl py-1 z-50 text-xs">
                  {['Auto', 'Low', 'Medium', 'High', 'Extra High', 'Max'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setEffort(opt); setShowEffortMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 transition-colors cursor-pointer ${effort === opt ? 'bg-surface text-white font-medium' : 'text-foreground-muted hover:text-white hover:bg-surface'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Approval mode */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowApprovalMenu(!showApprovalMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-foreground-muted hover:text-white hover:bg-surface transition-colors cursor-pointer"
                title="Approval mode"
              >
                <span>Approval: {approvalMode}</span>
                <ChevronDown size={12} strokeWidth={1.8} />
              </button>
              {showApprovalMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-64 bg-surface-raised border border-border rounded-xl shadow-xl py-1 z-50 text-xs">
                  {[
                    { id: 'ask', label: 'Ask', desc: 'Require approval for writes and terminal commands.' },
                    { id: 'turbo', label: 'Turbo', desc: 'Auto-apply reversible edits with backups; ask for destructive ops.' },
                    { id: 'auto_preview', label: 'Auto Preview', desc: 'Prepare changes without applying them.' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { setApprovalMode(opt.id as any); setShowApprovalMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 transition-colors cursor-pointer ${approvalMode === opt.id ? 'bg-surface text-white font-medium' : 'text-foreground-muted hover:text-white hover:bg-surface'}`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-[10px] text-foreground-muted">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground-muted font-normal">Save Memory</span>
              <Toggle checked={saveMemoryActive} onChange={setSaveMemoryActive} />
            </div>

            <button
              type="button"
              onClick={toggleMic}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isListening
                  ? 'text-red-400 bg-red-950/40'
                  : 'text-foreground-muted hover:text-white hover:bg-surface'
              }`}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              title={isListening ? 'Listening...' : 'Voice input'}
            >
              {isListening ? <MicOff size={16} strokeWidth={1.8} /> : <Mic size={16} strokeWidth={1.8} />}
            </button>

            <button
              type="button"
              onClick={() => (isGenerating ? stopGeneration() : handleSubmit())}
              disabled={!isGenerating && !prompt.trim()}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-surface text-white hover:bg-[#2c2c31]'
                  : prompt.trim()
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-surface text-foreground-muted cursor-not-allowed'
              }`}
              aria-label={isGenerating ? 'Stop generation' : 'Send message'}
            >
              {isGenerating ? <Square size={12} strokeWidth={2} className="fill-current" /> : <ArrowRight size={14} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </div>

    {showModelPicker && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-96 max-h-[70vh] overflow-auto bg-surface-raised border border-border rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white font-medium">Select Model</span>
            <button type="button" onClick={() => setShowModelPicker(false)} className="text-foreground-muted hover:text-white">X</button>
          </div>
          <div className="space-y-1">
            {providers.filter((p) => p.status === 'connected').map((p) => (
              <div key={p.id}>
                <div className="text-[10px] text-foreground-muted uppercase px-2 py-1">{p.name}</div>
                {p.discoveredModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setSelectedModel(m, p.id); setShowModelPicker(false); setPrompt(''); }}
                    className="w-full text-left px-2 py-1.5 text-xs text-foreground-muted hover:text-white hover:bg-surface rounded"
                  >
                    {m}
                  </button>
                ))}
              </div>
            ))}
            {providers.filter((p) => p.status === 'connected').length === 0 && (
              <p className="text-xs text-foreground-muted px-2">No connected providers.</p>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
};
