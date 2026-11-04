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
        <code key={match.index} className="px-1.5 py-0.5 rounded-md bg-surface border border-border text-indigo-400 text-[11px] font-mono">
          {match[1]}
        </code>
      );
    } else if (match[2] !== undefined) {
      parts.push(<strong key={match.index} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={match.index} className="italic text-foreground">{match[3]}</em>);
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
    <div className="my-2.5 rounded-xl border border-border overflow-hidden bg-surface shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface-raised border-b border-border text-[11px]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-surface text-foreground-muted font-mono text-[10px] uppercase tracking-wider">
            {lang || 'code'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-foreground-muted hover:text-foreground transition-colors cursor-pointer text-xs"
        >
          {copied ? <Check size={12} strokeWidth={2} className="text-emerald-400" /> : <Copy size={12} strokeWidth={1.8} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto p-2">
        <table className="w-full text-[12px] font-mono leading-5">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-surface-raised">
                <td className="w-10 px-2 text-right text-foreground-muted select-none border-r border-border">{idx + 1}</td>
                <td className="px-3 whitespace-pre text-foreground">{line || ' '}</td>
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
                  <li key={idx} className="flex items-start gap-2 text-foreground text-xs">
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
            elements.push(<h3 key={`h3-${idx}`} className="text-sm font-semibold text-foreground mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
          } else if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={`h2-${idx}`} className="text-base font-semibold text-foreground mt-4 mb-1.5 border-b border-border pb-1">{renderInline(line.slice(3))}</h2>);
          } else if (line.startsWith('# ')) {
            flushList();
            elements.push(<h1 key={`h1-${idx}`} className="text-lg font-bold text-foreground mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
          } else if (/^[-*] /.test(line)) {
            listItems.push(line.slice(2));
          } else if (line.trim() === '') {
            flushList();
          } else {
            flushList();
            elements.push(<p key={`p-${idx}`} className="my-1.5 leading-relaxed text-foreground text-xs">{renderInline(line)}</p>);
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

  // Empty state matching "Hello, what's on your mind?"
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
            <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-foreground-muted">
              Hello, what's on <span className="font-semibold text-foreground">your mind?</span>
            </h1>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Your local-first AI assistant is ready. Ask questions, explore code, or pick a starter below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(s.text)}
                className="group p-3 rounded-2xl bg-surface-raised hover:bg-surface border border-border transition-all text-xs cursor-pointer flex items-center justify-between text-foreground shadow-xs"
              >
                <div className="flex items-center gap-2.5 truncate pr-1">
                  <span className="p-1 rounded-lg bg-surface border border-border group-hover:bg-surface-raised transition-colors">
                    {s.icon}
                  </span>
                  <span className="truncate text-xs font-medium">{s.text}</span>
                </div>
                <ArrowRight size={13} className="text-foreground-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
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
      className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-3xl mx-auto w-full [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {messages.map((msg: ChatMessage) => {
        if (msg.role === 'system') {
          return (
            <div
              key={msg.id}
              className="p-3 bg-surface-raised border border-border rounded-2xl text-xs flex items-start gap-2.5 text-foreground-muted"
            >
              <Info size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          );
        }

        const isUser = msg.role === 'user';

        if (isUser) {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-xl bg-surface-raised text-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-xs border border-border shadow-xs">
                <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {msg.attachments.map((att) => (
                      <span
                        key={att.id}
                        className="text-[10px] font-mono bg-surface border border-border px-2 py-0.5 rounded-md text-foreground-muted flex items-center gap-1"
                      >
                        <FileCode size={12} strokeWidth={1.8} className="text-foreground-muted" />
                        {att.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Assistant Message
        return (
          <div key={msg.id} className="space-y-2 text-xs text-foreground">
            {/* Header: Model badge pill + duration on left, actions on right */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-border text-[11px] text-foreground font-medium shadow-xs">
                  <Sparkles size={12} strokeWidth={2} className="text-indigo-400" />
                  <span>{msg.model || 'beam:cloud'}</span>
                </span>
                {msg.durationMs ? (
                  <span className="flex items-center gap-1 text-[10px] text-foreground-muted font-mono">
                    <Clock size={10} strokeWidth={1.8} />
                    {(msg.durationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1 text-foreground-muted">
                <button
                  type="button"
                  onClick={() => handleCopy(msg.content, msg.id)}
                  className="p-1.5 hover:text-foreground hover:bg-surface rounded-lg transition-colors cursor-pointer"
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
                  className="p-1.5 hover:text-foreground hover:bg-surface rounded-lg transition-colors cursor-pointer"
                  title="Retry"
                >
                  <RotateCcw size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMemory(msg)}
                  className="p-1.5 hover:text-foreground hover:bg-surface rounded-lg transition-colors cursor-pointer"
                  title="Save to Memory"
                >
                  <Save size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Activities Timeline */}
            {msg.activities && msg.activities.length > 0 && (
              <details className="bg-surface-raised border border-border rounded-2xl p-3 text-xs group">
                <summary className="cursor-pointer select-none text-[11px] text-foreground-muted flex items-center gap-1.5 font-medium">
                  <ChevronRight size={12} strokeWidth={1.8} className="group-open:rotate-90 transition-transform" />
                  Worked for {msg.durationMs ? (msg.durationMs / 1000).toFixed(0) : '?'}s • Explored{' '}
                  {msg.activities.length} action{msg.activities.length > 1 ? 's' : ''}
                </summary>
                <div className="mt-2.5 space-y-1.5 pl-2 border-t border-border pt-2">
                  {msg.activities.map((step: ActivityStep) => (
                    <div key={step.id} className="flex items-center gap-2 text-[11px] text-foreground-muted">
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
              <div className="bg-surface-raised border border-border rounded-2xl p-3.5 text-xs space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split size={14} strokeWidth={2} className="text-amber-400" />
                    <span className="font-medium text-foreground">
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
                    className="flex items-center gap-1 px-3 py-1 bg-surface hover:bg-surface-raised text-foreground border border-border rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <span>Review Diff</span>
                    <ChevronRight size={12} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {msg.fileChanges.map((fc) => (
                    <span
                      key={fc.filePath}
                      className="text-[10px] font-mono bg-surface border border-border px-2.5 py-1 rounded-lg text-foreground-muted"
                    >
                      {fc.action} {fc.filePath.split('\\').pop()}{' '}
                      <span className="text-emerald-400">+{fc.additions}</span>{' '}
                      <span className="text-red-400">-{fc.deletions}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main Response Card */}
            <div className="bg-surface-raised border border-border rounded-2xl p-4 leading-relaxed shadow-xs text-foreground">
              <MarkdownContent content={msg.content || (isGenerating ? '' : 'No response generated.')} />
              {isGenerating && msg.id === messages[messages.length - 1]?.id && (
                <span className="inline-block w-1.5 h-3.5 bg-foreground ml-1 align-middle animate-pulse" />
              )}
            </div>
          </div>
        );
      })}

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-foreground-muted py-1.5 px-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>Generating response...</span>
        </div>
      )}
    </div>
  );
};
