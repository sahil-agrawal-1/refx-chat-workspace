import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Mic,
  MicOff,
  ChevronDown,
  Paperclip,
  FileCode,
  Terminal,
  Check,
  Globe,
  Zap,
  Sparkles,
  Shield,
  Folder,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Toggle } from '@/components/common/Toggle';
import { EffortSlider } from '@/components/chat/EffortSlider';

export const ChatPromptInput: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEffortMenu, setShowEffortMenu] = useState(false);
  const [showApprovalMenu, setShowApprovalMenu] = useState(false);
  const [webSearchActive, setWebSearchActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const projectPickerRef = useRef<HTMLDivElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);
  const effortMenuRef = useRef<HTMLDivElement>(null);
  const approvalMenuRef = useRef<HTMLDivElement>(null);

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
    providers,
  } = useAppStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
    setShowCommandMenu(prompt.startsWith('/') && !prompt.includes(' '));
  }, [prompt]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (attachMenuRef.current && !attachMenuRef.current.contains(target)) {
        setShowAttachMenu(false);
      }
      if (projectPickerRef.current && !projectPickerRef.current.contains(target)) {
        setShowProjectPicker(false);
      }
      if (effortMenuRef.current && !effortMenuRef.current.contains(target)) {
        setShowEffortMenu(false);
      }
      if (approvalMenuRef.current && !approvalMenuRef.current.contains(target)) {
        setShowApprovalMenu(false);
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
          const found = providers
            .flatMap((p) => p.discoveredModels.map((m) => ({ p, m })))
            .find((x) => x.m === args[0]);
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
        const list = providers
          .filter((p) => p.status === 'connected')
          .flatMap((p) => p.discoveredModels.map((m) => `${p.id}:${m}`));
        setPrompt(list.length ? list.join(', ') : 'No connected models.');
        return true;
      }
      case '/effort':
        if (args[0]) {
          setEffort(args[0]);
          setPrompt(`Effort set to ${args[0]}`);
        } else {
          setPrompt('/effort <auto|low|medium|high|extra high|max>');
        }
        return true;
      case '/approval':
        if (args[0]) {
          setApprovalMode(args[0] as any);
          setPrompt(`Approval set to ${args[0]}`);
        } else {
          setPrompt('/approval <ask|turbo|auto_preview>');
        }
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

    let text = prompt;
    if (webSearchActive) {
      text = `[Web Search Active]\n${text}`;
    }

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
      <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 select-none relative">
        {/* Workspace indicator chip directly above composer */}
        <div className="relative mb-2 inline-flex items-center gap-2" ref={projectPickerRef}>
          <button
            type="button"
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground px-2.5 py-1 rounded-full bg-surface-raised/90 border border-border hover:border-accent transition-all cursor-pointer backdrop-blur-sm shadow-xs"
          >
            <Folder size={12} className="text-foreground-muted" />
            <span className="truncate max-w-[200px]">
              {selectedWorkspace ? selectedWorkspace.name : 'No workspace selected'}
            </span>
            <ChevronDown size={12} strokeWidth={1.8} className="text-foreground-muted" />
          </button>

          {showProjectPicker && (
            <div className="absolute left-0 bottom-full mb-2 w-72 bg-surface-raised border border-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider border-b border-border flex items-center justify-between">
                <span>Workspace Directory</span>
                <span className="font-mono text-[9px] text-foreground-muted">{recentWorkspaces.length} recent</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWorkspace(null);
                  setShowProjectPicker(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                  !selectedWorkspace
                    ? 'bg-surface text-foreground font-medium'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                <span>No workspace (global mode)</span>
                {!selectedWorkspace && <Check size={14} strokeWidth={2} className="text-emerald-400" />}
              </button>
              {recentWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setWorkspace(ws);
                    setShowProjectPicker(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-surface text-foreground font-medium'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate font-medium text-foreground">{ws.name}</div>
                    <div className="text-[10px] text-foreground-muted font-mono truncate">{ws.path}</div>
                  </div>
                  {selectedWorkspace?.id === ws.id && (
                    <Check size={14} strokeWidth={2} className="text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1.5 px-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectPicker(false);
                    openWorkspaceDialog();
                  }}
                  className="w-full text-center py-1.5 text-xs text-foreground hover:bg-surface rounded-xl transition-colors cursor-pointer font-medium"
                >
                  + Open workspace folder...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Floating Chat Capsule */}
        <div className="bg-surface-raised/95 backdrop-blur-xl border border-border focus-within:border-accent rounded-[28px] p-4 sm:p-5 shadow-2xl transition-all">
          {/* Top subtle hint banner */}
          <div className="flex items-center gap-2 pb-2 text-xs font-normal text-foreground select-none">
            <Sparkles size={14} className="text-indigo-400 shrink-0" />
            <span className="truncate">
              Ask me anything -{' '}

            </span>
          </div>

          {/* Slash command suggestions menu */}
          {showCommandMenu && (
            <div
              ref={commandMenuRef}
              className="mb-3 bg-surface-raised border border-border rounded-2xl shadow-2xl py-1.5 text-xs backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar"
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted border-b border-border">
                Commands
              </div>
              {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(prompt.trim())).map((c) => (
                <button
                  key={c.cmd}
                  type="button"
                  onClick={() => {
                    setPrompt(c.cmd + ' ');
                    setShowCommandMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-1.5 text-left text-foreground hover:bg-surface cursor-pointer"
                >
                  <span className="font-mono text-indigo-400">{c.cmd}</span>
                  <span className="text-foreground-muted text-[11px]">{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message, query or instructions here..."
            rows={1}
            className="w-full bg-transparent text-foreground placeholder-foreground-muted text-sm resize-none focus:outline-none custom-scrollbar min-h-[44px] max-h-[180px] leading-relaxed select-text"
          />

          {/* Bottom Action Bar inside Composer */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
            {/* Left Tools: Attach, Web Search, Effort */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Attach Pill Button */}
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="px-3 py-1.5 rounded-full text-xs bg-surface hover:bg-surface-raised border border-border text-foreground transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  aria-label="Add attachments or context"
                  title="Add attachment"
                >
                  <Paperclip size={13} strokeWidth={2} className="text-foreground-muted" />
                  <span>Attach</span>
                </button>

                {showAttachMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-56 bg-surface-raised border border-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md">
                    <div className="px-3 py-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider border-b border-border">
                      Add Context
                    </div>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.multiple = true;
                          input.accept = 'image/*,.txt,.md,.json,.csv,.pdf,.doc,.docx';
                          input.onchange = (ev) => {
                            const files = Array.from((ev.target as HTMLInputElement).files || []);
                            if (files.length) {
                              setPrompt((prev) => (prev ? prev + '\n' : '') + files.map((f) => `@file ${f.name}`).join('\n'));
                            }
                            setShowAttachMenu(false);
                          };
                          input.click();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-surface cursor-pointer"
                      >
                        <FileCode size={14} className="text-foreground-muted" />
                        <span>Files</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { openWorkspaceDialog(); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-surface cursor-pointer"
                      >
                        <Folder size={14} className="text-foreground-muted" />
                        <span>Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPrompt((prev) => prev + '@'); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-surface cursor-pointer"
                      >
                        <span className="text-foreground-muted font-mono">@</span>
                        <span>Mention</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCommandMenu(true); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-surface cursor-pointer"
                      >
                        <Terminal size={14} className="text-foreground-muted" />
                        <span>Commands</span>
                      </button>
                  </div>
                )}
              </div>

              {/* Web Search Pill Button (Web icon + text "Search") */}
              <button
                type="button"
                onClick={() => setWebSearchActive(!webSearchActive)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                  webSearchActive
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-500 font-medium shadow-xs'
                    : 'bg-surface hover:bg-surface-raised border-border text-foreground-muted hover:text-foreground'
                }`}
                title={webSearchActive ? 'Web search enabled' : 'Enable web search'}
              >
                <Globe size={13} strokeWidth={2} className={webSearchActive ? 'text-blue-500' : 'text-foreground-muted'} />
                <span>Search</span>
                {webSearchActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
                )}
              </button>

              {/* Effort Pill Button */}
              <div className="relative" ref={effortMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowEffortMenu(!showEffortMenu)}
                  className="px-3 py-1.5 rounded-full text-xs bg-surface hover:bg-surface-raised border border-border text-foreground transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  title="Reasoning effort"
                >
                  <Zap size={13} strokeWidth={2} className="text-amber-400" />
                  <span>Effort: {effort}</span>
                  <ChevronDown size={11} strokeWidth={2} className="text-foreground-muted" />
                </button>

                {showEffortMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-surface-raised border border-border rounded-2xl shadow-2xl p-3.5 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                    <EffortSlider
                      value={effort}
                      onChange={(newEffort) => {
                        setEffort(newEffort);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Approval Mode Pill Button */}
              <div className="relative" ref={approvalMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowApprovalMenu(!showApprovalMenu)}
                  className="px-2.5 py-1.5 rounded-full text-xs bg-surface hover:bg-surface-raised border border-border text-foreground-muted hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  title="Approval mode"
                >
                  <Shield size={12} strokeWidth={2} className="text-foreground-muted" />
                  <span className="capitalize">{approvalMode}</span>
                  <ChevronDown size={11} strokeWidth={2} className="text-foreground-muted" />
                </button>

                {showApprovalMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-surface-raised border border-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md">
                    <div className="px-3 py-1 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider border-b border-border">
                      Execution Approval Mode
                    </div>
                    {[
                      { id: 'ask', label: 'Ask', desc: 'Require approval for edits and commands.' },
                      { id: 'turbo', label: 'Turbo', desc: 'Auto-apply edits with undo; ask for destructive ops.' },
                      { id: 'auto_preview', label: 'Auto Preview', desc: 'Prepare diffs without auto-applying.' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setApprovalMode(opt.id as any);
                          setShowApprovalMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
                          approvalMode === opt.id
                            ? 'bg-surface text-foreground font-medium'
                            : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                        }`}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-[10px] text-foreground-muted mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Tools: Save Memory, Voice Mic, Send Button */}
            <div className="flex items-center gap-3">
              {/* Save Memory toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted font-normal hidden sm:inline">Save Memory</span>
                <Toggle checked={saveMemoryActive} onChange={setSaveMemoryActive} />
              </div>

              {/* Voice Input Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border border-border ${
                  isListening
                    ? 'text-red-400 bg-red-500/20 ring-2 ring-red-500/40 animate-pulse'
                    : 'text-foreground-muted hover:text-foreground bg-surface hover:bg-surface-raised'
                }`}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                title={isListening ? 'Listening...' : 'Voice dictation'}
              >
                {isListening ? <MicOff size={15} strokeWidth={2} /> : <Mic size={15} strokeWidth={2} />}
              </button>

              {/* Circular Send / Stop Button */}
              <button
                type="button"
                onClick={() => (isGenerating ? stopGeneration() : handleSubmit())}
                disabled={!isGenerating && !prompt.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isGenerating
                    ? 'bg-red-500 hover:bg-red-600 text-white active:scale-95'
                    : prompt.trim()
                    ? 'bg-foreground text-surface hover:opacity-90 active:scale-95 font-bold'
                    : 'bg-surface border border-border text-foreground-muted cursor-not-allowed opacity-40'
                }`}
                aria-label={isGenerating ? 'Stop generation' : 'Send message'}
                title={isGenerating ? 'Stop generation' : 'Send'}
              >
                {isGenerating ? (
                  <Square size={12} strokeWidth={2.5} className="fill-current text-white" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Model Picker Modal for /model command */}
      {showModelPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col bg-surface-raised border border-border rounded-3xl shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Select Active Model</span>
              <button
                type="button"
                onClick={() => setShowModelPicker(false)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 mt-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {providers
                .filter((p) => p.status === 'connected')
                .map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="text-[10px] font-semibold text-foreground-muted uppercase px-2 py-1">
                      {p.name}
                    </div>
                    {p.discoveredModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m, p.id);
                          setShowModelPicker(false);
                          setPrompt('');
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-surface rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-mono">{m}</span>
                        <span className="text-[10px] text-foreground-muted font-sans">{p.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              {providers.filter((p) => p.status === 'connected').length === 0 && (
                <div className="text-center py-6 text-foreground-muted text-xs">
                  No connected providers found. Configure a provider in Providers menu.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
