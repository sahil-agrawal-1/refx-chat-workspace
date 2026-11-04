import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  FileCode,
  FileEdit,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
  Split,
  Info,
  Sparkles,
  RotateCcw,
  Save,
  Clock,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Wand2,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { ChatMessage, ActivityStep } from '@/types';
import { Logo } from '@/components/ui/Logo';

const renderInline = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded-md bg-[#222226] border border-white/10 text-indigo-300 text-[11px] font-mono">
          {match[1]}
        </code>
      );
    } else if (match[2] !== undefined) {
      parts.push(<strong key={match.index} className="font-semibold text-zinc-100">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={match.index} className="italic text-zinc-300">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(<a key={match.index} href={match[5]} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">{match[4]}</a>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length ? parts : [text];
};

const CodeBlock: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-2.5 rounded-xl border border-[#27272a] overflow-hidden bg-[#121215] shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#18181b] border-b border-[#242427] text-[11px]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[#222226] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
            {lang || 'code'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer text-xs"
        >
          {copied ? <Check size={12} strokeWidth={2} className="text-emerald-400" /> : <Copy size={12} strokeWidth={1.8} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto p-2">
        <table className="w-full text-[12px] font-mono leading-5">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02]">
                <td className="w-10 px-2 text-right text-zinc-600 select-none border-r border-white/5">{idx + 1}</td>
                <td className="px-3 whitespace-pre text-zinc-200">{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
          return <CodeBlock key={i} lang={m?.[1] || ''} code={m?.[2] || ''} />;
        }
        const lines = part.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];
        const flushList = () => {
          if (listItems.length) {
            elements.push(
              <ul key={`ul-${elements.length}`} className="list-none space-y-1.5 my-2 pl-3">
                {listItems.map((li, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-zinc-300 text-xs">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="leading-relaxed">{renderInline(li)}</span>
                  </li>
                ))}
              </ul>
            );
            listItems = [];
          }
        };
        lines.forEach((line, idx) => {
          if (line.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={`h3-${idx}`} className="text-sm font-semibold text-zinc-100 mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
          } else if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={`h2-${idx}`} className="text-base font-semibold text-zinc-100 mt-4 mb-1.5 border-b border-white/5 pb-1">{renderInline(line.slice(3))}</h2>);
          } else if (line.startsWith('# ')) {
            flushList();
            elements.push(<h1 key={`h1-${idx}`} className="text-lg font-bold text-zinc-100 mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
          } else if (/^[-*] /.test(line)) {
            listItems.push(line.slice(2));
          } else if (line.trim() === '') {
            flushList();
          } else {
            flushList();
            elements.push(<p key={`p-${idx}`} className="my-1.5 leading-relaxed text-zinc-300 text-xs">{renderInline(line)}</p>);
          }
        });
        flushList();
        return <div key={i}>{elements}</div>;
      })}
    </>
  );
};

export const ChatMessageList: React.FC = () => {
  const { currentConversation, isGenerating, setActiveDiffFile, toggleBottomPanel, sendMessage, addTaskMemory } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const messages = currentConversation?.messages || [];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetry = (msg: ChatMessage) => {
    const idx = messages.findIndex((m) => m.id === msg.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sendMessage(messages[i].content);
        return;
      }
    }
  };

  const handleSaveMemory = (msg: ChatMessage) => {
    addTaskMemory(msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : ''), msg.content, ['chat']);
  };

  // Empty state matching Image 2 "Hello, what's on your mind?"
  if (messages.length === 0) {
    const SUGGESTIONS = [
      { icon: <Code2 size={14} className="text-blue-400" />, text: 'Explain this project structure and architecture' },
      { icon: <Wand2 size={14} className="text-purple-400" />, text: 'Refactor code and improve modularity' },
      { icon: <Cpu size={14} className="text-emerald-400" />, text: 'Run terminal tests and inspect build errors' },
      { icon: <Layers size={14} className="text-amber-400" />, text: 'Draft a clean UI specification with design tokens' },
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none relative">
        <div className="max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-zinc-400">
              Hello, what's on <span className="font-semibold text-white">your mind?</span>
            </h1>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Your local-first AI assistant is ready. Ask questions, explore code, or pick a starter below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(s.text)}
                className="group p-3 rounded-2xl bg-[#18181b]/70 hover:bg-[#1f1f24] border border-white/5 hover:border-white/15 transition-all text-xs cursor-pointer flex items-center justify-between text-zinc-300 hover:text-white shadow-xs"
              >
                <div className="flex items-center gap-2.5 truncate pr-1">
                  <span className="p-1 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                    {s.icon}
                  </span>
                  <span className="truncate text-xs">{s.text}</span>
                </div>
                <ArrowRight size={13} className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {messages.map((msg: ChatMessage) => {
        if (msg.role === 'system') {
          return (
            <div
              key={msg.id}
              className="p-3 bg-[#18181b] border border-[#27272a] rounded-2xl text-xs flex items-start gap-2.5 text-zinc-400"
            >
              <Info size={16} strokeWidth={1.8} className="text-zinc-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          );
        }

        const isUser = msg.role === 'user';

        if (isUser) {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-xl bg-[#222226] text-zinc-100 rounded-2xl rounded-br-sm px-4 py-2.5 text-xs border border-white/5 shadow-xs">
                <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                    {msg.attachments.map((att) => (
                      <span
                        key={att.id}
                        className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-md text-zinc-400 flex items-center gap-1"
                      >
                        <FileCode size={12} strokeWidth={1.8} className="text-zinc-400" />
                        {att.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Assistant Message matching Image 1 layout
        return (
          <div key={msg.id} className="space-y-2 text-xs text-foreground">
            {/* Header: Model badge pill + duration on left, actions on right */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181b] border border-white/10 text-[11px] text-zinc-300 font-medium shadow-xs">
                  <Sparkles size={12} strokeWidth={2} className="text-indigo-400" />
                  <span>{msg.model || 'beam:cloud'}</span>
                </span>
                {msg.durationMs ? (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                    <Clock size={10} strokeWidth={1.8} />
                    {(msg.durationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => handleCopy(msg.content, msg.id)}
                  className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Copy response"
                >
                  {copiedId === msg.id ? (
                    <Check size={14} strokeWidth={2} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} strokeWidth={1.8} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRetry(msg)}
                  className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Retry"
                >
                  <RotateCcw size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMemory(msg)}
                  className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Save to Memory"
                >
                  <Save size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Activities Timeline */}
            {msg.activities && msg.activities.length > 0 && (
              <details className="bg-[#18181b]/70 border border-[#27272a] rounded-2xl p-3 text-xs group">
                <summary className="cursor-pointer select-none text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <ChevronRight size={12} strokeWidth={1.8} className="group-open:rotate-90 transition-transform" />
                  Worked for {msg.durationMs ? (msg.durationMs / 1000).toFixed(0) : '?'}s • Explored{' '}
                  {msg.activities.length} action{msg.activities.length > 1 ? 's' : ''}
                </summary>
                <div className="mt-2.5 space-y-1.5 pl-2">
                  {msg.activities.map((step: ActivityStep) => (
                    <div key={step.id} className="flex items-center gap-2 text-[11px] text-zinc-400">
                      {step.type === 'file_read' && <FileCode size={12} className="text-indigo-400" />}
                      {step.type === 'file_write' && <FileEdit size={12} className="text-amber-400" />}
                      <span className="truncate">{step.title}</span>
                      {step.status === 'completed' && <CheckCircle2 size={12} className="text-emerald-400 ml-auto" />}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* File Modification Proposal Banner */}
            {msg.fileChanges && msg.fileChanges.length > 0 && (
              <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split size={14} strokeWidth={2} className="text-amber-400" />
                    <span className="font-medium text-zinc-200">
                      {msg.fileChanges.length} file change{msg.fileChanges.length > 1 ? 's' : ''} proposed
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (msg.fileChanges && msg.fileChanges[0]) {
                        setActiveDiffFile(msg.fileChanges[0]);
                        toggleBottomPanel('diff');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-[#222226] hover:bg-[#2b2b30] text-zinc-300 border border-white/5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <span>Review Diff</span>
                    <ChevronRight size={12} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {msg.fileChanges.map((fc) => (
                    <span
                      key={fc.filePath}
                      className="text-[10px] font-mono bg-[#141416] border border-white/5 px-2.5 py-1 rounded-lg text-zinc-400"
                    >
                      {fc.action} {fc.filePath.split('\\').pop()}{' '}
                      <span className="text-emerald-400">+{fc.additions}</span>{' '}
                      <span className="text-red-400">-{fc.deletions}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main Response Card (matching Image 1) */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 leading-relaxed shadow-sm">
              <MarkdownContent content={msg.content || (isGenerating ? '' : 'No response generated.')} />
              {isGenerating && msg.id === messages[messages.length - 1]?.id && (
                <span className="inline-block w-1.5 h-3.5 bg-white ml-1 align-middle animate-pulse" />
              )}
            </div>
          </div>
        );
      })}

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 py-1.5 px-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>Generating response...</span>
        </div>
      )}
    </div>
  );
};
