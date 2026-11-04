import React, { useState } from 'react';
import {
  Terminal,
  FileCode,
  FileEdit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Split,
  Bookmark,
  Info,
  Sparkles,
  RotateCcw,
  Save,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { ChatMessage, ActivityStep } from '@/types';
import { Logo } from '@/components/ui/Logo';

const renderInline = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <code key={match.index} className="px-1 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a2e] text-[#c4c4cc] text-[11px] font-mono">
        {match[1]}
      </code>
    );
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
    <div className="my-2 rounded-lg border border-[#2a2a2e] overflow-hidden bg-[#0d0d0f]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161618] border-b border-[#242427] text-[11px]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#242427] text-[#a1a1aa] font-mono uppercase">{lang || 'text'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[#71717a] hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} strokeWidth={2} className="text-emerald-400" /> : <Copy size={12} strokeWidth={1.8} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] font-mono leading-5">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-[#161618]">
                <td className="w-10 px-2 text-right text-[#52525a] select-none border-r border-[#202024]">{idx + 1}</td>
                <td className="px-3 whitespace-pre text-[#dedee3]">{line || ' '}</td>
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
              <ul key={`ul-${elements.length}`} className="list-none space-y-1 my-2 pl-4">
                {listItems.map((li, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[#dedee3]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#71717a] shrink-0" />
                    <span>{renderInline(li)}</span>
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
            elements.push(<h3 key={`h3-${idx}`} className="text-sm font-semibold text-white mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
          } else if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={`h2-${idx}`} className="text-base font-semibold text-white mt-4 mb-1.5 border-b border-[#242427] pb-1">{renderInline(line.slice(3))}</h2>);
          } else if (line.startsWith('# ')) {
            flushList();
            elements.push(<h1 key={`h1-${idx}`} className="text-lg font-bold text-white mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
          } else if (/^[-*] /.test(line)) {
            listItems.push(line.slice(2));
          } else if (line.trim() === '') {
            flushList();
          } else {
            flushList();
            elements.push(<p key={`p-${idx}`} className="my-1.5 leading-relaxed text-[#dedee3]">{renderInline(line)}</p>);
          }
        });
        flushList();
        return <div key={i}>{elements}</div>;
      })}
    </>
  );
};

export const ChatMessageList: React.FC = () => {
  const { currentConversation, isGenerating, setActiveDiffFile, setBottomPanel, sendMessage, addTaskMemory } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  const messages = currentConversation?.messages || [];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleActivityExpand = (stepId: string) => {
    setExpandedActivities((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleRetry = (msg: ChatMessage) => {
    // find preceding user message
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

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-sm space-y-2.5 opacity-90">
          <Logo width={46} height={48} className="w-8 h-8 mx-auto opacity-70 mb-3" />
          <h1 className="text-base font-medium text-white tracking-tight">REFX AI Workspace</h1>
          <p className="text-xs text-[#7c7c85] leading-relaxed">
            Local-first AI desktop application for Windows. Select a workspace folder, connect your model provider, and start building.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar space-y-5 max-w-3xl mx-auto w-full">
      {messages.map((msg: ChatMessage) => {
        if (msg.role === 'system') {
          return (
            <div key={msg.id} className="p-3 bg-[#18181b] border border-[#26262a] rounded-xl text-xs flex items-start gap-2.5 text-[#a1a1aa]">
              <Info size={16} strokeWidth={1.8} className="text-[#888891] shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          );
        }

        const isUser = msg.role === 'user';

        if (isUser) {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-xl bg-[#242427] text-white rounded-xl px-4 py-2.5 text-xs border border-[#2e2e34] shadow-xs">
                <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                    {msg.attachments.map((att) => (
                      <span
                        key={att.id}
                        className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded text-[#a1a1aa] flex items-center gap-1"
                      >
                        <FileCode size={12} strokeWidth={1.8} className="text-[#888891]" />
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
          <div key={msg.id} className="space-y-2.5 text-xs text-[#dedee3]">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#1e1e21] border border-[#2a2a2e] text-[11px] text-[#c4c4cc]">
                  <Sparkles size={12} strokeWidth={1.8} className="text-[#888891]" />
                  {msg.model || 'Assistant'}
                </span>
                {msg.durationMs ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#71717a]">
                    <Clock size={10} strokeWidth={1.8} />
                    {(msg.durationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(msg.content, msg.id)}
                  className="p-1 text-[#71717a] hover:text-white rounded transition-colors cursor-pointer"
                  title="Copy response"
                >
                  {copiedId === msg.id ? <Check size={14} strokeWidth={2} className="text-emerald-400" /> : <Copy size={14} strokeWidth={1.8} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleRetry(msg)}
                  className="p-1 text-[#71717a] hover:text-white rounded transition-colors cursor-pointer"
                  title="Retry"
                >
                  <RotateCcw size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMemory(msg)}
                  className="p-1 text-[#71717a] hover:text-white rounded transition-colors cursor-pointer"
                  title="Save to Memory"
                >
                  <Save size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* Activities Timeline */}
            {msg.activities && msg.activities.length > 0 && (
              <details className="bg-[#18181b] border border-[#242428] rounded-xl p-2.5 text-xs group">
                <summary className="cursor-pointer select-none text-[11px] text-[#71717a] flex items-center gap-1.5">
                  <ChevronRight size={12} strokeWidth={1.8} className="group-open:rotate-90 transition-transform" />
                  {msg.activities.length} workspace action{msg.activities.length > 1 ? 's' : ''} performed
                </summary>
                <div className="mt-2 space-y-1">
                  {msg.activities.map((step: ActivityStep) => (
                    <div key={step.id} className="flex items-center gap-2 text-[11px] text-[#9c9ca4]">
                      {step.type === 'file_read' && <FileCode size={12} strokeWidth={1.8} className="text-[#71717a]" />}
                      {step.type === 'file_write' && <FileEdit size={12} strokeWidth={1.8} className="text-[#71717a]" />}
                      <span className="truncate">{step.title}</span>
                      {step.status === 'completed' && <CheckCircle2 size={12} strokeWidth={1.8} className="text-emerald-400" />}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* File Modification Proposal Banner */}
            {msg.fileChanges && msg.fileChanges.length > 0 && (
              <div className="bg-[#1a1a1d] border border-[#2e2e34] rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split size={14} strokeWidth={1.8} className="text-amber-400" />
                    <span className="font-medium text-white">
                      {msg.fileChanges.length} file change{msg.fileChanges.length > 1 ? 's' : ''} proposed
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (msg.fileChanges && msg.fileChanges[0]) {
                        setActiveDiffFile(msg.fileChanges[0]);
                        setBottomPanel('diff');
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#222724] hover:bg-[#28302b] text-[#d4d4dc] border border-[#2e3b32] rounded-md text-xs transition-colors cursor-pointer"
                  >
                    <span>Review Diff</span>
                    <ChevronRight size={12} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.fileChanges.map((fc) => (
                    <span key={fc.filePath} className="text-[10px] font-mono bg-[#141416] border border-[#242427] px-2 py-0.5 rounded text-[#9c9ca4]">
                      {fc.action} {fc.filePath.split('\\').pop()} <span className="text-emerald-400">+{fc.additions}</span> <span className="text-red-400">-{fc.deletions}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Text content */}
            <div className="bg-[#18181b] border border-[#242428] rounded-xl p-3.5 leading-relaxed">
              <MarkdownContent content={msg.content || (isGenerating ? '' : 'No response generated.')} />
              {isGenerating && msg.id === messages[messages.length - 1]?.id && (
                <span className="inline-block w-1.5 h-3 bg-white ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          </div>
        );
      })}

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-[#71717a] py-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <span>Generating response...</span>
        </div>
      )}
    </div>
  );
};