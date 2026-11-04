import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
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
import { ModelSelectorDropdown } from '@/components/chat/ModelSelectorDropdown';

export const ChatPromptInput: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showEffortMenu, setShowEffortMenu] = useState(false);
  const [showApprovalMenu, setShowApprovalMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const projectPickerRef = useRef<HTMLDivElement>(null);

  const {
    sendMessage,
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
  } = useAppStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

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
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2 select-none">
      {/* Workspace indicator / selector directly above prompt container */}
      <div className="relative mb-2 inline-block" ref={projectPickerRef}>
        <button
          type="button"
          onClick={() => setShowProjectPicker(!showProjectPicker)}
          className="flex items-center gap-1.5 text-xs text-[#8a8a92] hover:text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        >
          <span>{selectedWorkspace ? selectedWorkspace.name : 'No workspace selected'}</span>
          <ChevronDown size={14} strokeWidth={1.8} className="text-[#6c6c74]" />
        </button>

        {showProjectPicker && (
          <div className="absolute left-0 bottom-full mb-1 w-64 bg-[#18181b] border border-[#2a2a30] rounded-xl shadow-xl py-1 z-50 text-xs">
            <div className="px-3 py-1.5 text-[11px] text-[#71717a] uppercase tracking-wider border-b border-[#222226]">
              Workspace Directory
            </div>
            <button
              type="button"
              onClick={() => {
                setWorkspace(null);
                setShowProjectPicker(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                !selectedWorkspace ? 'bg-[#242428] text-white font-medium' : 'text-[#9c9ca4] hover:text-white hover:bg-[#202023]'
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
                  selectedWorkspace?.id === ws.id ? 'bg-[#242428] text-white font-medium' : 'text-[#9c9ca4] hover:text-white hover:bg-[#202023]'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="truncate">{ws.name}</div>
                  <div className="text-[10px] text-[#6c6c74] font-mono truncate">{ws.path}</div>
                </div>
                {selectedWorkspace?.id === ws.id && <Check size={14} strokeWidth={2} className="text-zinc-300 shrink-0" />}
              </button>
            ))}
            <div className="border-t border-[#222226] mt-1 pt-1 px-2">
              <button
                type="button"
                onClick={() => {
                  setShowProjectPicker(false);
                  openWorkspaceDialog();
                }}
                className="w-full text-center py-1.5 text-xs text-[#9c9ca4] hover:text-white hover:bg-[#202024] rounded-md transition-colors cursor-pointer"
              >
                Open workspace folder...
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Prompt Box */}
      <div className="bg-[#1b1b1e] border border-[#2a2a30] rounded-xl p-3 shadow-lg transition-colors focus-within:border-[#3c3c44]">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          rows={1}
          className="w-full bg-transparent text-[#e4e4e7] placeholder-[#6c6c74] text-sm resize-none focus:outline-none custom-scrollbar min-h-[38px] max-h-[160px] leading-relaxed select-text"
        />

        <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#242428]">
          <div className="flex items-center gap-1.5">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-1.5 text-[#888891] hover:text-white hover:bg-[#242428] rounded-md transition-colors cursor-pointer"
                aria-label="Add attachments or context"
                title="Add context"
              >
                <Plus size={16} strokeWidth={1.8} />
              </button>

              {showAttachMenu && (
                <div className="absolute left-0 bottom-full mb-1.5 w-52 bg-[#18181b] border border-[#2a2a30] rounded-xl shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] text-[#71717a] uppercase tracking-wider border-b border-[#222226]">
                    Context
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((prev) => (prev ? prev + '\n' : '') + '@file ');
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#9c9ca4] hover:text-white hover:bg-[#202023] cursor-pointer"
                  >
                    <FileCode size={14} strokeWidth={1.8} className="text-[#888891]" />
                    <span>Workspace File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((prev) => (prev ? prev + '\n' : '') + '@terminal ');
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#9c9ca4] hover:text-white hover:bg-[#202023] cursor-pointer"
                  >
                    <Terminal size={14} strokeWidth={1.8} className="text-[#888891]" />
                    <span>Terminal Output</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt((prev) => (prev ? prev + '\n' : '') + '@memory ');
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[#9c9ca4] hover:text-white hover:bg-[#202023] cursor-pointer"
                  >
                    <Paperclip size={14} strokeWidth={1.8} className="text-[#888891]" />
                    <span>Task Memory</span>
                  </button>
                </div>
              )}
            </div>

            <ModelSelectorDropdown />

            {/* Effort selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEffortMenu(!showEffortMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[#9c9ca4] hover:text-white hover:bg-[#242428] transition-colors cursor-pointer"
                title="Reasoning effort"
              >
                <span>Effort: {effort}</span>
                <ChevronDown size={12} strokeWidth={1.8} />
              </button>
              {showEffortMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-40 bg-[#18181b] border border-[#2a2a30] rounded-xl shadow-xl py-1 z-50 text-xs">
                  {['Auto', 'Low', 'Medium', 'High', 'Extra High', 'Max'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setEffort(opt); setShowEffortMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 transition-colors cursor-pointer ${effort === opt ? 'bg-[#242428] text-white font-medium' : 'text-[#9c9ca4] hover:text-white hover:bg-[#202023]'}`}
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
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[#9c9ca4] hover:text-white hover:bg-[#242428] transition-colors cursor-pointer"
                title="Approval mode"
              >
                <span>Approval: {approvalMode}</span>
                <ChevronDown size={12} strokeWidth={1.8} />
              </button>
              {showApprovalMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-64 bg-[#18181b] border border-[#2a2a30] rounded-xl shadow-xl py-1 z-50 text-xs">
                  {[
                    { id: 'ask', label: 'Ask', desc: 'Require approval for writes and terminal commands.' },
                    { id: 'turbo', label: 'Turbo', desc: 'Auto-apply reversible edits with backups; ask for destructive ops.' },
                    { id: 'auto_preview', label: 'Auto Preview', desc: 'Prepare changes without applying them.' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { setApprovalMode(opt.id as any); setShowApprovalMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 transition-colors cursor-pointer ${approvalMode === opt.id ? 'bg-[#242428] text-white font-medium' : 'text-[#9c9ca4] hover:text-white hover:bg-[#202023]'}`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-[10px] text-[#6c6c74]">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#7c7c85] font-normal">Save Memory</span>
              <Toggle checked={saveMemoryActive} onChange={setSaveMemoryActive} />
            </div>

            <button
              type="button"
              onClick={toggleMic}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isListening
                  ? 'text-red-400 bg-red-950/40'
                  : 'text-[#7c7c85] hover:text-white hover:bg-[#242428]'
              }`}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              title={isListening ? 'Listening...' : 'Voice input'}
            >
              {isListening ? <MicOff size={16} strokeWidth={1.8} /> : <Mic size={16} strokeWidth={1.8} />}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!prompt.trim() || isGenerating}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                prompt.trim() && !isGenerating
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-[#26262a] text-[#55555c] cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
