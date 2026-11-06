import React, { useState } from 'react';
import {
  Folder,
  Check,
  ChevronRight,
  ChevronLeft,
  Cpu,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/stores/app-store';
import { Toggle } from '@/components/common/Toggle';

export const OnboardingModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    providers,
    selectedModel,
    setSelectedModel,
    selectedWorkspace,
    openWorkspaceDialog,
    saveMemoryActive,
    setSaveMemoryActive,
  } = useAppStore();

  const [step, setStep] = useState(1);

  if (activeModal !== 'onboarding') return null;

  return (
    <Modal
      isOpen={activeModal === 'onboarding'}
      onClose={closeModal}
      title="Refx Setup"
      subtitle="Initial configuration for local-first Windows AI."
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
          {[
            { num: 1, label: 'Provider' },
            { num: 2, label: 'Workspace' },
            { num: 3, label: 'Memory' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 ${
                step === s.num
                  ? 'text-foreground font-medium'
                  : step > s.num
                  ? 'text-foreground-muted'
                  : 'text-foreground-muted'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  step === s.num
                    ? 'bg-white text-black font-bold'
                    : step > s.num
                    ? 'bg-zinc-700 text-foreground'
                    : 'bg-surface text-foreground-muted'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Model Choice */}
        {step === 1 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-medium text-foreground">Select Primary Model Provider</h3>
            <p className="text-foreground-muted text-[11px] leading-relaxed">
              Connect to an offline local runtime (Ollama, LM Studio) or configure a cloud API provider.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {providers.slice(0, 4).map((p) => {
                const isSelected = p.selectedModel === selectedModel && selectedModel !== '';
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (p.selectedModel) {
                        setSelectedModel(p.selectedModel, p.id);
                      }
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-surface border-zinc-500 text-foreground'
                        : 'bg-surface border-border text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-xs text-foreground">{p.name}</span>
                      {isSelected && <Check size={12} strokeWidth={2} className="text-foreground" />}
                    </div>
                    <div className="text-[10px] text-foreground-muted font-mono">
                      {p.isLocal ? 'Local Runtime' : 'API Key'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Workspace Directory */}
        {step === 2 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-medium text-foreground">Workspace Directory</h3>
            <p className="text-foreground-muted text-[11px] leading-relaxed">
              All file modifications and terminal commands are scoped to this directory.
            </p>

            <div className="p-3 bg-surface border border-border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Folder size={16} strokeWidth={1.8} className="text-foreground-muted shrink-0" />
                  <span className="font-mono text-foreground text-xs truncate">
                    {selectedWorkspace ? selectedWorkspace.path : 'No folder selected'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={openWorkspaceDialog}
                  className="px-2.5 py-1 bg-surface hover:bg-surface text-foreground rounded text-xs transition-colors cursor-pointer border border-border shrink-0"
                >
                  Browse...
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Memory */}
        {step === 3 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-medium text-foreground">Memory Configuration</h3>
            <p className="text-foreground-muted text-[11px] leading-relaxed">
              Save key context instructions into local Task Memory by default during conversations.
            </p>

            <div className="p-3 bg-surface border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground text-xs">Default Save Memory</span>
                  <p className="text-[11px] text-foreground-muted mt-0.5">Captures requirements from prompt submissions.</p>
                </div>
                <Toggle checked={saveMemoryActive} onChange={setSaveMemoryActive} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 px-2.5 py-1 text-foreground-muted hover:text-foreground transition-colors cursor-pointer text-xs"
            >
              <ChevronLeft size={14} strokeWidth={1.8} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-foreground text-surface hover:opacity-90 rounded-xl font-medium transition-colors cursor-pointer text-xs"
            >
              <span>Next</span>
              <ChevronRight size={14} strokeWidth={1.8} />
            </button>
          ) : (
            <button
              type="button"
              onClick={closeModal}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-foreground text-surface hover:opacity-90 rounded-xl font-medium transition-colors cursor-pointer text-xs"
            >
              <span>Complete</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
