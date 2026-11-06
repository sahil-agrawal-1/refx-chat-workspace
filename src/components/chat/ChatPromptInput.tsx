import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowRight,
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
  ShieldCheck,
  Eye,
  Folder,
  X,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Hand,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { Toggle } from '@/components/common/Toggle';
import { EffortSlider } from '@/components/chat/EffortSlider';

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'document';
  previewUrl?: string;
  size: number;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);
const DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'txt', 'md', 'json', 'csv', 'xls', 'xlsx', 'ppt', 'pptx']);

function classifyFile(file: File): 'image' | 'document' {
  if (file.type.startsWith('image/')) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'document';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export const ChatPromptInput: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveCaption, setLiveCaption] = useState('');
  const recognitionRef = useRef<any>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEffortMenu, setShowEffortMenu] = useState(false);
  const [showApprovalMenu, setShowApprovalMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [effortSupport, setEffortSupport] = useState<{ supported: boolean; levels: string[] }>({ supported: false, levels: ['Auto'] });

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
    selectedModel,
    selectedProvider,
    webSearchActive,
    setWebSearchActive,
  } = useAppStore();
  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      if (typeof window !== 'undefined' && window.desktop?.checkEffortSupport) {
        try {
          const res = await window.desktop.checkEffortSupport(selectedProvider?.type || '', selectedModel || '');
          if (!cancelled) {
            setEffortSupport(res);
            if (!res.supported) {
              setEffort('Auto');
            }
          }
        } catch {
          if (!cancelled) {
            setEffortSupport({ supported: false, levels: ['Auto'] });
            setEffort('Auto');
          }
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, [selectedModel, selectedProvider, setEffort]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: AttachedFile[] = Array.from(fileList).map((file) => {
      const fileType = classifyFile(file);
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        type: fileType,
        previewUrl: fileType === 'image' ? URL.createObjectURL(file) : undefined,
        size: file.size,
      };
    });
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

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
    if (!prompt.trim() && attachedFiles.length === 0) return;
    if (isGenerating) return;

    if (prompt.trim().startsWith('/')) {
      const handled = await runCommand(prompt.trim());
      if (handled) return;
    }

    const text = prompt;

    // Convert attached files to MessageAttachment[]
    const messageAttachments = attachedFiles.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type === 'image' ? 'image' as const : 'file' as const,
      size: f.size,
    }));

    // Cleanup preview URLs
    attachedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });

    setPrompt('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(text, messageAttachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final.trim()) {
          setPrompt((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${final.trim()}` : final.trim();
          });
          setLiveCaption('');
        } else {
          setLiveCaption(interim.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          setLiveCaption('');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveCaption('');
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition init failed:', err);
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  const toggleMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Voice dictation is not supported by your current browser/platform environment.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      setLiveCaption('');
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setLiveCaption('');
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <>
      <div className="w-full max-w-3xl mx-auto px-4 pb-4 select-none relative z-10 shrink-0">
        {/* Main Floating Chat Capsule matching Figma design */}
        <div
          className="bg-surface-card/95 border border-border/90 focus-within:border-zinc-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files.length > 0) {
              addFiles(e.dataTransfer.files);
            }
          }}
        >
          {/* Slash command suggestions menu */}
          {showCommandMenu && (
            <div
              ref={commandMenuRef}
              className="mb-3 bg-surface border border-border rounded-2xl shadow-2xl py-1.5 text-xs backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar"
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
                  className="w-full flex items-center justify-between px-3.5 py-1.5 text-left text-foreground hover:bg-surface-raised cursor-pointer"
                >
                  <span className="font-mono text-indigo-400">{c.cmd}</span>
                  <span className="text-foreground-muted text-[11px]">{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Attached Files Preview Strip */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {attachedFiles.map((af) => (
                <div key={af.id} className="group relative flex-shrink-0">
                  {af.type === 'image' && af.previewUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 bg-surface shadow-sm">
                      <img src={af.previewUrl} alt={af.name} className="w-full h-full object-cover" draggable={false} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeFile(af.id)}
                          className="w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer shadow-md"
                          aria-label={`Remove ${af.name}`}
                        >
                          <X size={11} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-surface shadow-sm max-w-[160px]">
                      <FileText size={14} className="text-foreground-muted shrink-0" />
                      <span className="text-[11px] font-medium text-foreground truncate">{af.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(af.id)}
                        className="text-foreground-muted hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Live Voice Caption Banner */}
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-300 animate-in fade-in duration-150 select-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="font-semibold text-red-400 shrink-0">Live Voice:</span>
              <span className="truncate italic text-foreground-muted flex-1">
                {liveCaption || 'Listening... Speak into your microphone'}
              </span>
              <button
                type="button"
                onClick={toggleMic}
                className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded bg-red-500/20 cursor-pointer shrink-0"
              >
                Finish
              </button>
            </div>
          )}

          {/* Textarea matching Figma */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={1}
            className="w-full bg-transparent text-foreground placeholder:text-foreground-muted text-[14.5px] resize-none focus:outline-none min-h-[44px] max-h-[160px] leading-relaxed select-text font-normal"
          />

          {/* Bottom Action Bar inside Card */}
          <div className="flex items-center justify-between pt-2">
            {/* Left Tools: Attach, Mention, Web Search, Ask for approval */}
            <div className="flex items-center gap-1">
              {/* Attach Pill Button */}
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-1.5 text-foreground-muted hover:text-foreground transition-colors rounded-lg cursor-pointer"
                  title="Add attachment"
                >
                  <Paperclip size={16} strokeWidth={1.8} />
                </button>

                {showAttachMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-52 bg-surface border border-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md">
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
                          if (files.length) addFiles(files);
                          setShowAttachMenu(false);
                        };
                        input.click();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-surface-raised cursor-pointer"
                    >
                      <FileCode size={14} className="text-foreground-muted" />
                      <span>Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openWorkspaceDialog();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-foreground hover:bg-surface-raised cursor-pointer"
                    >
                      <Folder size={14} className="text-foreground-muted" />
                      <span>Folder</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mention button (@) */}
              <button
                type="button"
                onClick={() => setPrompt((prev) => prev + '@')}
                className="p-1.5 text-foreground-muted hover:text-foreground transition-colors rounded-lg cursor-pointer font-mono text-sm leading-none"
                title="Mention context"
              >
                @
              </button>

              {/* Web Search icon button (Globe) */}
              <button
                type="button"
                onClick={() => setWebSearchActive(!webSearchActive)}
                className={`p-1.5 transition-colors rounded-lg cursor-pointer ${
                  webSearchActive ? 'text-blue-400 bg-blue-500/10' : 'text-foreground-muted hover:text-foreground'
                }`}
                title={webSearchActive ? 'Web search enabled' : 'Enable web search'}
              >
                <Globe size={16} strokeWidth={1.8} />
              </button>

              {/* Ask for approval pill button matching Figma */}
              <div className="relative" ref={approvalMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowApprovalMenu(!showApprovalMenu)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    approvalMode === 'turbo'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : approvalMode === 'auto_preview'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : 'text-foreground-muted hover:text-foreground bg-surface-raised/40 hover:bg-surface-raised/80 border border-border'
                  }`}
                  title="Execution approval mode"
                >
                  <Hand size={13} strokeWidth={1.8} className="text-foreground-muted" />
                  <span>
                    {approvalMode === 'turbo' ? 'Turbo' : approvalMode === 'auto_preview' ? 'Auto Preview' : 'Ask for approval'}
                  </span>
                </button>

                {showApprovalMenu && (
                  <div className="absolute bottom-full mb-2 left-0 w-60 bg-surface border border-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md animate-smooth-in">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider border-b border-border">
                      Approval Mode
                    </div>
                    {[
                      { id: 'ask', label: 'Ask for approval', desc: 'Confirm each file modification.' },
                      { id: 'turbo', label: 'Turbo', desc: 'Auto-apply edits with quick undo.' },
                      { id: 'auto_preview', label: 'Auto Preview', desc: 'Prepare diffs & open review.' },
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
                            ? 'bg-surface-raised text-white font-medium'
                            : 'text-foreground-muted hover:text-white hover:bg-surface-raised/50'
                        }`}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-[10px] text-foreground-muted">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Tools: Save Memory toggle, Model selector pill, Mic, Circular Send */}
            <div className="flex items-center gap-3">
              {/* Save Memory Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted font-normal">Save Memory</span>
                <Toggle checked={saveMemoryActive} onChange={setSaveMemoryActive} />
              </div>

              {/* Model Selector Pill matching Figma: "Ollama qwen-coder 1.1 Medium v" */}
              <button
                type="button"
                onClick={() => setShowModelPicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-foreground-muted hover:text-white bg-surface-raised/40 hover:bg-surface-raised/80 border border-border transition-colors cursor-pointer font-mono"
                title="Select active model"
              >
                <span className="truncate max-w-[130px]">
                  {selectedModel || 'Ollama qwen-coder 1.1'}
                </span>
                <span className="text-foreground-muted font-sans text-[11px]">{effort || 'Medium'}</span>
                <ChevronDown size={11} strokeWidth={2} className="text-foreground-muted" />
              </button>

              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-1.5 transition-colors rounded-lg cursor-pointer ${
                  isListening
                    ? 'text-rose-400 bg-rose-500/20 animate-pulse'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
                title={isListening ? 'Listening...' : 'Voice dictation'}
              >
                {isListening ? <MicOff size={16} strokeWidth={1.8} /> : <Mic size={16} strokeWidth={1.8} />}
              </button>

              {/* Circular Send / Stop Button with ArrowRight */}
              <button
                type="button"
                onClick={() => (isGenerating ? stopGeneration() : handleSubmit())}
                disabled={!isGenerating && !prompt.trim() && attachedFiles.length === 0}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                  isGenerating
                    ? 'bg-rose-500 hover:bg-rose-600 text-white active:scale-95'
                    : prompt.trim() || attachedFiles.length > 0
                    ? 'bg-surface-raised hover:bg-surface-card text-foreground active:scale-95'
                    : 'bg-surface-raised/60 text-foreground-muted cursor-not-allowed opacity-50'
                }`}
                title={isGenerating ? 'Stop generation' : 'Send'}
              >
                {isGenerating ? (
                  <Square size={11} strokeWidth={2.5} className="fill-current text-white" />
                ) : (
                  <ArrowRight size={15} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Project Selector Underneath Card on the Left: "No Project v" matching Figma */}
        <div className="pt-2 px-1 flex items-center" ref={projectPickerRef}>
          <button
            type="button"
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <span>{selectedWorkspace ? selectedWorkspace.name : 'No Project'}</span>
            <ChevronDown size={12} strokeWidth={1.8} className="text-foreground-muted" />
          </button>

          {showProjectPicker && (
            <div className="absolute left-4 bottom-full mb-2 w-64 bg-surface border border-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md animate-smooth-in">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-foreground-muted uppercase tracking-wider border-b border-border flex items-center justify-between">
                <span>Projects</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectPicker(false);
                    openWorkspaceDialog();
                  }}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  + Add
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWorkspace(null);
                  setShowProjectPicker(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer ${
                  !selectedWorkspace ? 'bg-surface-raised text-white font-medium' : 'text-foreground-muted hover:text-white hover:bg-surface-raised/50'
                }`}
              >
                <span>No Project</span>
                {!selectedWorkspace && <Check size={13} className="text-emerald-400" />}
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
                    selectedWorkspace?.id === ws.id ? 'bg-surface-raised text-white font-medium' : 'text-foreground-muted hover:text-white hover:bg-surface-raised/50'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {selectedWorkspace?.id === ws.id && <Check size={13} className="text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
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
