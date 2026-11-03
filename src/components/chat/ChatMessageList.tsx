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
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { ChatMessage, ActivityStep } from '@/types';
import { Logo } from '@/components/ui/Logo';

export const ChatMessageList: React.FC = () => {
  const { currentConversation, isGenerating, setActiveDiffFile, setBottomPanel } = useAppStore();
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
            {/* Header info */}
            <div className="flex items-center justify-between text-[11px] text-[#71717a]">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[#9c9ca4]">{msg.model || 'Assistant'}</span>
                {msg.hasMemorySaved && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-700/50 px-1.5 py-0.2 rounded">
                    <Bookmark size={10} strokeWidth={1.8} />
                    Memory Saved
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(msg.content, msg.id)}
                className="p-1 hover:text-white rounded transition-colors cursor-pointer"
                title="Copy response"
                aria-label="Copy response"
              >
                {copiedId === msg.id ? (
                  <Check size={14} strokeWidth={2} className="text-emerald-400" />
                ) : (
                  <Copy size={14} strokeWidth={1.8} className="text-[#71717a]" />
                )}
              </button>
            </div>

            {/* Activities Timeline (if any) */}
            {msg.activities && msg.activities.length > 0 && (
              <div className="bg-[#18181b] border border-[#242428] rounded-xl p-2.5 space-y-1.5 text-xs">
                <div className="text-[11px] font-medium text-[#71717a] uppercase tracking-wider px-1">
                  Timeline
                </div>

                {msg.activities.map((step: ActivityStep) => {
                  const isExpanded = expandedActivities[step.id];

                  return (
                    <div
                      key={step.id}
                      className="bg-[#1e1e21] border border-[#27272b] rounded-lg p-2 transition-colors"
                    >
                      <div
                        onClick={() => toggleActivityExpand(step.id)}
                        className="flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          {step.type === 'terminal_run' && <Terminal size={14} strokeWidth={1.8} className="text-[#888891]" />}
                          {step.type === 'file_write' && <FileEdit size={14} strokeWidth={1.8} className="text-[#888891]" />}
                          {step.type === 'file_read' && <FileCode size={14} strokeWidth={1.8} className="text-[#888891]" />}

                          <span className="truncate font-medium text-[#d4d4dc] text-xs">{step.title}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {step.durationMs && (
                            <span className="text-[10px] text-[#71717a] font-mono">{step.durationMs}ms</span>
                          )}
                          {step.status === 'completed' ? (
                            <CheckCircle2 size={14} strokeWidth={1.8} className="text-emerald-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                          )}
                          {isExpanded ? (
                            <ChevronDown size={14} strokeWidth={1.8} className="text-[#71717a]" />
                          ) : (
                            <ChevronRight size={14} strokeWidth={1.8} className="text-[#71717a]" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-[#252529] text-[11px] space-y-1 font-mono">
                          {step.detail && <p className="text-[#a1a1aa] break-all">{step.detail}</p>}
                          {step.outputPreview && (
                            <div className="bg-[#121214] border border-[#202024] rounded p-2 text-[#a1a1aa] whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                              {step.outputPreview}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Staged Modifications */}
            {msg.fileChanges && msg.fileChanges.length > 0 && (
              <div className="bg-[#161917] border border-[#202b23] rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Split size={14} strokeWidth={1.8} className="text-emerald-400" />
                    <span className="font-medium text-[#dedee3]">
                      {msg.fileChanges.length} File Modification{msg.fileChanges.length > 1 ? 's' : ''} Staged
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
              </div>
            )}

            {/* Text content */}
            <div className="bg-[#18181b] border border-[#242428] rounded-xl p-3.5 leading-relaxed whitespace-pre-wrap select-text">
              {msg.content ? msg.content : (isGenerating ? '' : 'No response generated.')}
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
