import React, { useState } from 'react';
import {
  Split,
  Check,
  X,
  FileCode,
  CheckCheck,
  Maximize2,
  Minimize2,
  Columns,
  AlignLeft,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { computeLineDiff } from '@/utils/diff';

export const DiffReviewPanel: React.FC = () => {
  const {
    bottomPanels,
    toggleBottomPanel,
    pendingChanges,
    activeDiffFile,
    setActiveDiffFile,
    approveChange,
    rejectChange,
    approveAllChanges,
  } = useAppStore();

  const isDiffOpen = bottomPanels.has('diff');

  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  if (!isDiffOpen) return null;

  const currentChange = activeDiffFile || pendingChanges[0] || null;

  const diffResult = currentChange
    ? computeLineDiff(currentChange.originalContent || '', currentChange.newContent || '')
    : null;

  return (
    <div
      className={`w-full bg-[#131315] flex flex-col z-30 transition-all ${
        isExpanded ? 'h-[500px]' : 'h-80'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161618] border-b border-[#222225] text-xs select-none">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="flex items-center gap-1.5 font-medium text-white">
            <Split size={14} strokeWidth={1.8} className="text-[#888891]" />
            Modifications
          </span>

          <div className="flex items-center gap-1">
            {pendingChanges.map((change) => {
              const isSelected = currentChange?.filePath === change.filePath;
              const fileName = change.filePath.split('\\').pop();

              return (
                <button
                  key={change.filePath}
                  type="button"
                  onClick={() => setActiveDiffFile(change)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-[#242428] text-white font-medium border border-[#303036]'
                      : 'text-[#888891] hover:text-white hover:bg-[#1e1e21]'
                  }`}
                >
                  <FileCode size={14} strokeWidth={1.8} className="text-[#888891]" />
                  <span>{fileName}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">+{change.additions}</span>
                  <span className="text-[10px] text-red-400 font-mono">-{change.deletions}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {pendingChanges.length > 0 && (
            <div className="flex items-center bg-[#1c1c1f] p-0.5 rounded border border-[#26262a]">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`p-1 rounded ${viewMode === 'unified' ? 'bg-[#2a2a2f] text-white' : 'text-[#6c6c74]'}`}
                title="Unified view"
              >
                <AlignLeft size={12} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`p-1 rounded ${viewMode === 'split' ? 'bg-[#2a2a2f] text-white' : 'text-[#6c6c74]'}`}
                title="Split view"
              >
                <Columns size={12} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {currentChange && currentChange.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => { if (currentChange.id) approveChange(currentChange.id); }}
                className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors cursor-pointer"
              >
                <Check size={12} strokeWidth={2} className="text-emerald-400" />
                <span>Accept</span>
              </button>

              <button
                type="button"
                onClick={() => { if (currentChange.id) rejectChange(currentChange.id); }}
                className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs transition-colors cursor-pointer"
              >
                <X size={12} strokeWidth={2} className="text-red-400" />
                <span>Reject</span>
              </button>
            </>
          )}

          {pendingChanges.length > 1 && (
            <button
              type="button"
              onClick={approveAllChanges}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#222226] hover:bg-[#2a2a30] text-white rounded text-xs transition-colors cursor-pointer"
            >
              <CheckCheck size={14} strokeWidth={1.8} />
              <span>Accept All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#71717a] hover:text-white rounded hover:bg-[#202023]"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 size={14} strokeWidth={1.8} /> : <Maximize2 size={14} strokeWidth={1.8} />}
          </button>

          <button
            type="button"
            onClick={() => toggleBottomPanel('diff')}
            className="p-1 text-[#71717a] hover:text-white rounded hover:bg-[#202023]"
            title="Close Diff"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs custom-scrollbar bg-[#101012] select-text">
        {pendingChanges.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <h4 className="text-xs font-medium text-white">No pending modifications</h4>
            <p className="text-[11px] text-[#71717a]">
              File changes made during AI tasks will appear here for review.
            </p>
          </div>
        ) : !currentChange || !diffResult ? (
          <div className="p-8 text-center text-[#71717a]">Select a file modification to review diff.</div>
        ) : (
          <div className="divide-y divide-[#1e1e22]">
            {diffResult.lines.map((line, idx) => {
              const isAdd = line.type === 'add';
              const isDel = line.type === 'delete';

              return (
                <div
                  key={idx}
                  className={`flex items-start px-3 py-0.5 leading-5 transition-colors ${
                    isAdd
                      ? 'bg-emerald-950/20 text-[#86efac]'
                      : isDel
                      ? 'bg-red-950/20 text-[#fca5a5]'
                      : 'text-[#9c9ca4] hover:bg-[#161619]'
                  }`}
                >
                  <div className="w-10 shrink-0 text-right pr-2 text-[#52525a] select-none font-mono">
                    {line.oldLineNumber || ''}
                  </div>
                  <div className="w-10 shrink-0 text-right pr-3 text-[#52525a] select-none font-mono border-r border-[#202024]">
                    {line.newLineNumber || ''}
                  </div>
                  <div className="w-6 shrink-0 text-center font-bold select-none text-[#6e6e78]">
                    {isAdd ? '+' : isDel ? '-' : ' '}
                  </div>
                  <div className="flex-1 whitespace-pre-wrap break-all">{line.text || ' '}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {currentChange && (
        <div className="px-3.5 py-1.5 bg-[#141416] border-t border-[#222225] text-[11px] font-mono text-[#71717a] flex items-center justify-between">
          <span className="truncate">{currentChange.filePath}</span>
          <span className="capitalize text-zinc-300">Status: {currentChange.status}</span>
        </div>
      )}
    </div>
  );
};
