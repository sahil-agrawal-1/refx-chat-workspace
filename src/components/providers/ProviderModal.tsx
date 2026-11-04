import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Globe,
  Key,
  Sparkles,
  Server,
  Zap,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/stores/app-store';
import type { ProviderConfig } from '@/types';

export const ProviderModal: React.FC = () => {
  const { activeModal, closeModal, providers, saveProviderConfig, verifyProviderConnection, setSelectedModel } = useAppStore();
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providers[0]?.id || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'connected' | 'cloud' | 'local'>('all');
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    models: string[];
    message?: string;
  } | null>(null);

  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0] || null;
  const [formConfig, setFormConfig] = useState<ProviderConfig | null>(null);

  React.useEffect(() => {
    if (currentProvider) {
      setFormConfig((prev) => ({ ...currentProvider, apiKey: currentProvider.apiKey || '' }));
      setVerifyResult(null);
    }
  }, [selectedProviderId, currentProvider]);

  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      if (typeof window !== 'undefined' && window.desktop?.hasCredential && formConfig?.id) {
        try {
          const has = await window.desktop.hasCredential(formConfig.id);
          if (!cancelled) setHasStoredKey(has);
        } catch {
          if (!cancelled) setHasStoredKey(false);
        }
      } else {
        if (!cancelled) setHasStoredKey(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [formConfig?.id]);

  if (activeModal !== 'providers' || !formConfig) return null;

  const handleFieldChange = (field: keyof ProviderConfig, value: any) => {
    setFormConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!formConfig) return;
    await saveProviderConfig(formConfig);
  };

  const handleVerify = async () => {
    if (!formConfig) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      await saveProviderConfig(formConfig);
      const res = await verifyProviderConnection(formConfig.id);
      setVerifyResult(res);

      if (res.success && res.models.length > 0) {
        handleFieldChange('status', 'connected');
        handleFieldChange('discoveredModels', res.models);
      } else {
        handleFieldChange('status', res.status);
        handleFieldChange('errorMessage', res.message);
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        models: [],
        message: err.message || 'Verification failed unexpectedly.',
      });
      handleFieldChange('status', 'error');
      handleFieldChange('errorMessage', err.message || 'Verification failed unexpectedly.');
    } finally {
      setVerifying(false);
    }
  };

  const getProviderBrand = (id: string, name: string) => {
    const lower = (id + ' ' + name).toLowerCase();
    if (lower.includes('gemini') || lower.includes('google')) {
      return {
        badge: 'Gemini',
        color: 'from-blue-500 to-indigo-500',
        textColor: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        link: 'https://aistudio.google.com/app/apikey',
      };
    }
    if (lower.includes('anthropic') || lower.includes('claude')) {
      return {
        badge: 'Claude',
        color: 'from-amber-500 to-orange-500',
        textColor: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        link: 'https://console.anthropic.com/settings/keys',
      };
    }
    if (lower.includes('openai') && !lower.includes('compatible')) {
      return {
        badge: 'OpenAI',
        color: 'from-emerald-500 to-teal-500',
        textColor: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        link: 'https://platform.openai.com/api-keys',
      };
    }
    if (lower.includes('ollama')) {
      return {
        badge: 'Ollama',
        color: 'from-purple-500 to-pink-500',
        textColor: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        link: 'https://ollama.com',
      };
    }
    if (lower.includes('lm studio')) {
      return {
        badge: 'LM Studio',
        color: 'from-cyan-500 to-blue-500',
        textColor: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        link: 'https://lmstudio.ai',
      };
    }
    if (lower.includes('openrouter')) {
      return {
        badge: 'OpenRouter',
        color: 'from-indigo-500 to-violet-500',
        textColor: 'text-indigo-400',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
        link: 'https://openrouter.ai/keys',
      };
    }
    return {
      badge: 'Custom',
      color: 'from-zinc-500 to-zinc-600',
      textColor: 'text-zinc-400',
      bg: 'bg-zinc-500/10 border-zinc-500/20',
      link: null,
    };
  };

  const filteredProviders = providers.filter((p) => {
    if (filterType === 'connected') return p.status === 'connected';
    if (filterType === 'cloud') return !p.isLocal;
    if (filterType === 'local') return p.isLocal;
    return true;
  });

  const currentBrand = getProviderBrand(formConfig.id, formConfig.name);

  return (
    <Modal
      isOpen={activeModal === 'providers'}
      onClose={closeModal}
      title="Model Providers & AI Engines"
      subtitle="Configure cloud APIs or connect local runtime daemons (Ollama, LM Studio, vLLM)."
      icon={<Cpu className="w-5 h-5 text-indigo-400" />}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Filter Pills Bar */}
        <div className="flex items-center justify-between border-b border-[#242427] pb-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `All Providers (${providers.length})` },
              { id: 'connected', label: `Connected (${providers.filter((p) => p.status === 'connected').length})` },
              { id: 'cloud', label: 'Cloud APIs' },
              { id: 'local', label: 'Local Daemons' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer font-medium ${
                  filterType === tab.id
                    ? 'bg-white/10 text-white border border-white/15 shadow-xs'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
            {providers.filter((p) => p.status === 'connected').length} of {providers.length} active
          </div>
        </div>

        {/* 2-Column Studio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[460px]">
          {/* Left: Provider Selection Sidebar */}
          <div className="md:col-span-5 space-y-2 border-r border-[#242427] pr-3">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1">
              Select Provider
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[420px] custom-scrollbar pr-1">
              {filteredProviders.map((p) => {
                const isSelected = p.id === selectedProviderId;
                const brand = getProviderBrand(p.id, p.name);
                const isConnected = p.status === 'connected';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProviderId(p.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-[#1e1e24] border border-white/15 text-white shadow-md'
                        : 'bg-[#18181b]/60 hover:bg-[#18181b] border border-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0`}
                      >
                        {brand.badge.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">
                          {p.isLocal ? 'Local Daemon' : 'Cloud Endpoint'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isConnected ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Ready</span>
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredProviders.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No providers match the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Provider Workspace */}
          <div className="md:col-span-7 space-y-4">
            {/* Header Hero Card */}
            <div className="p-4 rounded-2xl bg-[#18181b] border border-white/5 relative overflow-hidden flex items-center justify-between">
              <div className="flex items-center gap-3 z-10">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${currentBrand.color} flex items-center justify-center text-white font-bold text-base shadow-md`}
                >
                  {currentBrand.badge.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white tracking-tight">{formConfig.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 text-zinc-400 border border-white/10">
                      {formConfig.isLocal ? 'Local Host' : 'Cloud API'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formConfig.isLocal
                      ? 'Local inference engine running on your workstation'
                      : 'High-throughput cloud reasoning models'}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="z-10">
                {formConfig.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium shadow-xs">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-white/5 text-zinc-400 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                    <span>Not Configured</span>
                  </span>
                )}
              </div>
            </div>

            {/* Inputs & Parameters */}
            <div className="space-y-3.5 text-xs">
              {/* Endpoint URL Input */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} className="text-zinc-400" />
                    Endpoint Base URL
                  </span>
                  {formConfig.isLocal && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFieldChange('baseUrl', 'http://localhost:11434')}
                        className="text-[10px] text-zinc-500 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                      >
                        Ollama Default
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange('baseUrl', 'http://localhost:1234/v1')}
                        className="text-[10px] text-zinc-500 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                      >
                        LM Studio
                      </button>
                    </div>
                  )}
                </label>
                <input
                  type="text"
                  value={formConfig.baseUrl}
                  onChange={(e) => handleFieldChange('baseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-zinc-500 rounded-xl px-3.5 py-2 text-zinc-100 font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* API Key Input (for Cloud) */}
              {!formConfig.isLocal && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                      <Key size={13} className="text-zinc-400" />
                      API Secret Key
                    </label>
                    {currentBrand.link && (
                      <a
                        href={currentBrand.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Get API Key</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formConfig.apiKey || ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      placeholder="Enter API key"
                      className="w-full bg-[#18181b] border border-[#27272a] focus:border-zinc-500 rounded-xl pl-3.5 pr-10 py-2 text-zinc-100 font-mono focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {hasStoredKey && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 pt-0.5">
                      <ShieldCheck size={12} />
                      <span>Stored securely in native OS Credential Vault.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Model */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-400" />
                  Active Model Name
                </label>
                <input
                  type="text"
                  value={formConfig.selectedModel}
                  onChange={(e) => handleFieldChange('selectedModel', e.target.value)}
                  placeholder="e.g. gemini-2.5-pro, claude-3-7-sonnet, gpt-4o"
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-zinc-500 rounded-xl px-3.5 py-2 text-zinc-100 font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* Discovered Models Grid */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Layers size={13} className="text-zinc-400" />
                    Available Models
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {formConfig.discoveredModels.length} detected
                  </span>
                </div>

                <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl min-h-[64px] max-h-36 overflow-y-auto custom-scrollbar">
                  {formConfig.discoveredModels.length === 0 ? (
                    <div className="text-[11px] text-zinc-500 py-3 text-center">
                      No models cached. Click &quot;Verify Connection&quot; to test credentials and discover available models.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {formConfig.discoveredModels.map((m) => {
                        const isChosen = formConfig.selectedModel === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              handleFieldChange('selectedModel', m);
                              setSelectedModel(m, formConfig.id);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-mono cursor-pointer transition-all flex items-center gap-1.5 ${
                              isChosen
                                ? 'bg-white text-black font-semibold shadow-xs'
                                : 'bg-[#222226] text-zinc-300 hover:text-white hover:bg-[#2b2b30] border border-white/5'
                            }`}
                          >
                            <span>{m}</span>
                            {isChosen && <Check size={12} strokeWidth={2.5} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Verify Outcome Banner */}
              {verifyResult && (
                <div
                  className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                    verifyResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-red-950/30 border-red-500/30 text-red-200'
                  }`}
                >
                  {verifyResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="leading-relaxed flex-1">
                    <div className="font-semibold text-xs">
                      {verifyResult.success ? 'Verification Successful' : 'Connection Failed'}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5">{verifyResult.message}</div>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#242427]">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-2 px-4 py-2 bg-[#18181b] hover:bg-[#222226] text-zinc-200 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-xs font-medium active:scale-95 shadow-xs"
                >
                  <RefreshCw size={13} className={verifying ? 'animate-spin text-indigo-400' : 'text-zinc-400'} />
                  <span>{verifying ? 'Testing Latency...' : 'Verify Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold transition-all cursor-pointer text-xs active:scale-95 shadow-md"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
