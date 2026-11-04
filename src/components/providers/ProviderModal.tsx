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
        textColor: 'text-blue-500',
        bg: 'bg-blue-500/10 border-blue-500/20',
        link: 'https://aistudio.google.com/app/apikey',
      };
    }
    if (lower.includes('anthropic') || lower.includes('claude')) {
      return {
        badge: 'Claude',
        color: 'from-amber-500 to-orange-500',
        textColor: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/20',
        link: 'https://console.anthropic.com/settings/keys',
      };
    }
    if (lower.includes('openai') && !lower.includes('compatible')) {
      return {
        badge: 'OpenAI',
        color: 'from-emerald-500 to-teal-500',
        textColor: 'text-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        link: 'https://platform.openai.com/api-keys',
      };
    }
    if (lower.includes('ollama')) {
      return {
        badge: 'Ollama',
        color: 'from-purple-500 to-pink-500',
        textColor: 'text-purple-500',
        bg: 'bg-purple-500/10 border-purple-500/20',
        link: 'https://ollama.com',
      };
    }
    if (lower.includes('lm studio')) {
      return {
        badge: 'LM Studio',
        color: 'from-cyan-500 to-blue-500',
        textColor: 'text-cyan-500',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        link: 'https://lmstudio.ai',
      };
    }
    if (lower.includes('openrouter')) {
      return {
        badge: 'OpenRouter',
        color: 'from-indigo-500 to-violet-500',
        textColor: 'text-indigo-500',
        bg: 'bg-indigo-500/10 border-indigo-500/20',
        link: 'https://openrouter.ai/keys',
      };
    }
    return {
      badge: 'Custom',
      color: 'from-zinc-500 to-zinc-600',
      textColor: 'text-foreground-muted',
      bg: 'bg-surface border-border',
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
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
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
                    ? 'bg-surface text-foreground border border-border shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-foreground-muted font-mono hidden sm:block">
            {providers.filter((p) => p.status === 'connected').length} of {providers.length} active
          </div>
        </div>

        {/* 2-Column Studio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[460px]">
          {/* Left: Provider Selection Sidebar */}
          <div className="md:col-span-5 space-y-2 border-r border-border pr-3">
            <div className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider px-1">
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
                        ? 'bg-surface text-foreground border border-border font-medium shadow-md'
                        : 'bg-surface-raised hover:bg-surface border border-border text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0`}
                      >
                        {brand.badge.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5 text-foreground">
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[10px] text-foreground-muted truncate font-mono mt-0.5">
                          {p.isLocal ? 'Local Daemon' : 'Cloud Endpoint'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isConnected ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Ready</span>
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-border" />
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredProviders.length === 0 && (
                <div className="text-center py-8 text-foreground-muted text-xs">
                  No providers match the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Provider Workspace */}
          <div className="md:col-span-7 space-y-4">
            {/* Header Hero Card */}
            <div className="p-4 rounded-2xl bg-surface border border-border relative overflow-hidden flex items-center justify-between">
              <div className="flex items-center gap-3 z-10">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${currentBrand.color} flex items-center justify-center text-white font-bold text-base shadow-md`}
                >
                  {currentBrand.badge.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">{formConfig.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-surface-raised text-foreground-muted border border-border">
                      {formConfig.isLocal ? 'Local Host' : 'Cloud API'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {formConfig.isLocal
                      ? 'Local inference engine running on your workstation'
                      : 'High-throughput cloud reasoning models'}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="z-10">
                {formConfig.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-medium shadow-xs">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-border text-foreground-muted text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground-muted" />
                    <span>Not Configured</span>
                  </span>
                )}
              </div>
            </div>

            {/* Inputs & Parameters */}
            <div className="space-y-3.5 text-xs">
              {/* Endpoint URL Input */}
              <div className="space-y-1.5">
                <label className="text-foreground font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} className="text-foreground-muted" />
                    Endpoint Base URL
                  </span>
                  {formConfig.isLocal && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFieldChange('baseUrl', 'http://localhost:11434')}
                        className="text-[10px] text-foreground-muted hover:text-foreground px-1.5 py-0.5 rounded bg-surface hover:bg-surface-raised border border-border cursor-pointer"
                      >
                        Ollama Default
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange('baseUrl', 'http://localhost:1234/v1')}
                        className="text-[10px] text-foreground-muted hover:text-foreground px-1.5 py-0.5 rounded bg-surface hover:bg-surface-raised border border-border cursor-pointer"
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
                  className="w-full bg-surface-raised border border-border focus:border-accent rounded-xl px-3.5 py-2 text-foreground font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* API Key Input (for Cloud) */}
              {!formConfig.isLocal && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-foreground font-medium flex items-center gap-1.5">
                      <Key size={13} className="text-foreground-muted" />
                      API Secret Key
                    </label>
                    {currentBrand.link && (
                      <a
                        href={currentBrand.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
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
                      className="w-full bg-surface-raised border border-border focus:border-accent rounded-xl pl-3.5 pr-10 py-2 text-foreground font-mono focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {hasStoredKey && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-500 pt-0.5">
                      <ShieldCheck size={12} />
                      <span>Stored securely in native OS Credential Vault.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Model */}
              <div className="space-y-1.5">
                <label className="text-foreground font-medium flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-400" />
                  Active Model Name
                </label>
                <input
                  type="text"
                  value={formConfig.selectedModel}
                  onChange={(e) => handleFieldChange('selectedModel', e.target.value)}
                  placeholder="e.g. gemini-2.5-pro, claude-3-7-sonnet, gpt-4o"
                  className="w-full bg-surface-raised border border-border focus:border-accent rounded-xl px-3.5 py-2 text-foreground font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* Discovered Models Grid */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <Layers size={13} className="text-foreground-muted" />
                    Available Models
                  </span>
                  <span className="text-[11px] font-mono text-foreground-muted">
                    {formConfig.discoveredModels.length} detected
                  </span>
                </div>

                <div className="p-3 bg-surface border border-border rounded-xl min-h-[64px] max-h-36 overflow-y-auto custom-scrollbar">
                  {formConfig.discoveredModels.length === 0 ? (
                    <div className="text-[11px] text-foreground-muted py-3 text-center">
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
                                ? 'bg-foreground text-surface font-semibold shadow-xs'
                                : 'bg-surface-raised text-foreground hover:bg-surface border border-border'
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
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}
                >
                  {verifyResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
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
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-raised text-foreground border border-border rounded-xl transition-all cursor-pointer disabled:opacity-50 text-xs font-medium active:scale-95 shadow-xs"
                >
                  <RefreshCw size={13} className={verifying ? 'animate-spin text-indigo-400' : 'text-foreground-muted'} />
                  <span>{verifying ? 'Testing Latency...' : 'Verify Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-foreground text-surface hover:opacity-90 rounded-xl font-semibold transition-all cursor-pointer text-xs active:scale-95 shadow-md"
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
