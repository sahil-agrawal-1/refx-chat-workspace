import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Cpu, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import type { ProviderConnectionStatus } from '@/types';

export const ModelSelectorDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [manualModel, setManualModel] = useState('');
  const { providers, selectedModel, setSelectedModel, openModal } = useAppStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const connectedProviders = providers.filter((p) => p.status === 'connected');
  const verifyingProviders = providers.filter((p) => p.status === 'connecting');
  const failedProviders = providers.filter(
    (p) => p.status === 'auth-failed' || p.status === 'provider-unavailable'
  );
  const currentProvider = providers.find((p) => p.selectedModel === selectedModel || p.discoveredModels.includes(selectedModel)) || null;

  const statusColor = (status: ProviderConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'auth-failed': return 'bg-red-500';
      case 'rate-limited': return 'bg-orange-500';
      case 'provider-unavailable': return 'bg-zinc-500';
      case 'model-unavailable': return 'bg-zinc-500';
      case 'model-discovery-unsupported': return 'bg-blue-500';
      case 'auth-verified-model-untested': return 'bg-blue-500';
      case 'not-configured': return 'bg-zinc-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground bg-[#222226] hover:bg-[#2a2a2f] rounded-lg transition-colors border border-border cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Cpu size={14} strokeWidth={1.8} className="text-foreground-muted" />
        <span className="font-normal text-foreground truncate max-w-[160px]">
          {selectedModel ? `${currentProvider?.name || 'Model'}: ${selectedModel}` : 'No model connected'}
        </span>
        <ChevronDown size={14} strokeWidth={1.8} className="text-foreground-muted" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 w-72 bg-surface-raised border border-border rounded-xl shadow-xl py-1 z-50 overflow-hidden text-xs">
          <div className="px-3 py-1.5 text-[11px] font-medium text-foreground-muted uppercase tracking-wider border-b border-border flex items-center justify-between">
            <span>Model Provider</span>
            <span className="text-[10px] text-foreground-muted font-mono">
              {connectedProviders.length > 0 ? `${connectedProviders.length} active` : 'Disconnected'}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {providers.length === 0 ? (
              <div className="p-3 text-center text-foreground-muted space-y-1.5">
                <p className="text-[11px]">No providers configured.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openModal('providers');
                  }}
                  className="w-full py-1.5 bg-[#252529] hover:bg-[#2d2d33] text-foreground rounded text-xs transition-colors cursor-pointer"
                >
                  Configure Providers
                </button>
              </div>
            ) : (
              <>
                {connectedProviders.length > 0 ? (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium text-foreground-muted uppercase tracking-wider border-b border-border">
                      Connected Providers
                    </div>
                    {connectedProviders.map((prov) => (
                      <div key={prov.id} className="px-2 py-1">
                        <div className="flex items-center justify-between px-2 py-1 text-foreground-muted font-medium text-[11px]">
                          <span>{prov.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor(prov.status)}`} />
                        </div>

                        <div className="space-y-0.5 ml-1 border-l border-border pl-1.5 mt-0.5">
                          {prov.discoveredModels.length === 0 ? (
                            <div className="text-[10px] text-foreground-muted py-0.5 px-2">No models detected</div>
                          ) : (
                            prov.discoveredModels.map((m) => {
                              const isSelected = selectedModel === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(m, prov.id);
                                    setIsOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-surface text-foreground font-medium'
                                      : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                                  }`}
                                >
                                  <span className="truncate">{m}</span>
                                  {isSelected && <Check size={14} strokeWidth={2} className="text-zinc-300 shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}

                {verifyingProviders.length > 0 ? (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium text-foreground-muted uppercase tracking-wider border-b border-border mt-2">
                      Verifying...
                    </div>
                    {verifyingProviders.map((prov) => (
                      <div key={prov.id} className="px-2 py-1">
                        <div className="flex items-center gap-2 px-2 py-1 text-foreground-muted font-medium text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          <span>{prov.name}</span>
                        </div>
                        <div className="ml-4 mt-0.5 text-[10px] text-foreground-muted">
                          {prov.errorMessage || 'Verifying connection...'}
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}

                {failedProviders.length > 0 ? (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium text-foreground-muted uppercase tracking-wider border-b border-border mt-2">
                      Connection Issues
                    </div>
                    {failedProviders.map((prov) => (
                      <div key={prov.id} className="px-2 py-1">
                        <div className="flex items-center justify-between px-2 py-1 text-foreground-muted font-medium text-[11px]">
                          <span>{prov.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor(prov.status)}`} />
                        </div>
                        <div className="ml-4 mt-0.5 text-[10px] text-[#ef4444]">
                          {prov.errorMessage || 'Connection failed'}
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}

                {connectedProviders.length === 0 && verifyingProviders.length === 0 && failedProviders.length > 0 ? (
                  <div className="p-3 text-center text-foreground-muted space-y-1.5">
                    <p className="text-[11px]">No providers available. Configure and verify a provider first.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        openModal('providers');
                      }}
                      className="w-full py-1.5 bg-[#252529] hover:bg-[#2d2d33] text-foreground rounded text-xs transition-colors cursor-pointer"
                    >
                      Configure Providers
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="pt-1 mt-1 border-t border-border px-2 pb-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openModal('providers');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1 text-[#91919a] hover:text-foreground hover:bg-surface rounded-md transition-colors text-center cursor-pointer"
            >
              <Plus size={14} strokeWidth={1.8} />
              <span>Manage Providers...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
