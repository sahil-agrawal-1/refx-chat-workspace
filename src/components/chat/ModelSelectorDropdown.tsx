import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Cpu } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

export const ModelSelectorDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
  const currentProvider = providers.find((p) => p.selectedModel === selectedModel || p.discoveredModels.includes(selectedModel)) || null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#a1a1aa] hover:text-white bg-[#222226] hover:bg-[#2a2a2f] rounded-lg transition-colors border border-[#2f2f35] cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Cpu size={14} strokeWidth={1.8} className="text-[#888891]" />
        <span className="font-normal text-[#dedee3] truncate max-w-[160px]">
          {selectedModel ? `${currentProvider?.name || 'Model'}: ${selectedModel}` : 'No model connected'}
        </span>
        <ChevronDown size={14} strokeWidth={1.8} className="text-[#71717a]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-[#18181b] border border-[#2a2a30] rounded-xl shadow-xl py-1 z-50 overflow-hidden text-xs">
          <div className="px-3 py-1.5 text-[11px] font-medium text-[#71717a] uppercase tracking-wider border-b border-[#222226] flex items-center justify-between">
            <span>Model Provider</span>
            <span className="text-[10px] text-[#71717a] font-mono">
              {connectedProviders.length > 0 ? `${connectedProviders.length} active` : 'Disconnected'}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {connectedProviders.length === 0 ? (
              <div className="p-3 text-center text-[#71717a] space-y-1.5">
                <p className="text-[11px]">No provider connected yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openModal('providers');
                  }}
                  className="w-full py-1.5 bg-[#252529] hover:bg-[#2d2d33] text-white rounded text-xs transition-colors cursor-pointer"
                >
                  Configure Providers
                </button>
              </div>
            ) : (
              connectedProviders.map((prov) => (
                <div key={prov.id} className="px-2 py-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[#888891] font-medium text-[11px]">
                    <span>{prov.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>

                  <div className="space-y-0.5 ml-1 border-l border-[#242428] pl-1.5 mt-0.5">
                    {prov.discoveredModels.length === 0 ? (
                      <div className="text-[10px] text-[#71717a] py-0.5 px-2">No models detected</div>
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
                                ? 'bg-[#26262a] text-white font-medium'
                                : 'text-[#9c9ca4] hover:text-white hover:bg-[#202023]'
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
              ))
            )}
          </div>

          <div className="pt-1 mt-1 border-t border-[#222226] px-2 pb-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openModal('providers');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1 text-[#91919a] hover:text-white hover:bg-[#202024] rounded-md transition-colors text-center cursor-pointer"
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
