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
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/stores/app-store';
import type { ProviderConfig } from '@/types';

export const ProviderModal: React.FC = () => {
  const { activeModal, closeModal, providers, saveProviderConfig, verifyProviderConnection } = useAppStore();
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providers[0]?.id || '');
  const [showApiKey, setShowApiKey] = useState(false);
const [hasStoredKey, setHasStoredKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    models: string[];
    message?: string;
  } | null>(null);

  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0] || null;
  const [formConfig, setFormConfig] = useState<ProviderConfig | null>(null);

  React.useEffect(() => {
    if (currentProvider) {
      // Only use the provider's own stored API key. Never carry over prev.apiKey
      // from a previously selected provider — that would leak credentials across
      // providers (e.g., OpenRouter's key showing up in OpenAI Compatible).
      setFormConfig((prev) => ({ ...currentProvider, apiKey: currentProvider.apiKey || '' }));
      setVerifyResult((vr) => vr);
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
    return () => { cancelled = true; };
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

  return (
    <Modal
      isOpen={activeModal === 'providers'}
      onClose={closeModal}
      title="Model Providers & Endpoints"
      subtitle="Configure and verify AI model providers (Ollama, LM Studio, Google Gemini, Anthropic, OpenAI, OpenRouter, or custom endpoints)."
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[400px]">
        {/* Left Provider List */}
        <div className="md:col-span-4 border-r border-border pr-3 space-y-1">
          <div className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider px-2 pb-1">
            Providers
          </div>
          {providers.map((p) => {
            const isSelected = p.id === selectedProviderId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProviderId(p.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-surface text-foreground font-medium border border-border'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-1">
                  <Cpu size={14} strokeWidth={1.8} className="text-foreground-muted" />
                  <span className="truncate">{p.name}</span>
                </div>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    p.status === 'connected' ? 'bg-emerald-400' : 'bg-surface'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Right Provider Form */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Cpu size={16} strokeWidth={1.8} className="text-foreground-muted" />
              <h3 className="text-sm font-medium text-foreground">{formConfig.name}</h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-surface text-foreground-muted border border-border">
                {formConfig.isLocal ? 'Local Runtime' : 'API Service'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  formConfig.status === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
              <span className="capitalize text-foreground-muted">
                {formConfig.status === 'connected' ? 'Connected' : 'Not configured'}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 text-xs">
            {/* Base URL */}
            <div>
              <label className="block text-foreground-muted font-medium mb-1 flex items-center gap-1.5">
                <Globe size={14} strokeWidth={1.8} className="text-foreground-muted" />
                Endpoint URL
              </label>
              <input
                type="text"
                value={formConfig.baseUrl}
                onChange={(e) => handleFieldChange('baseUrl', e.target.value)}
                placeholder="e.g. http://localhost:11434 or https://api.openai.com/v1"
                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground font-mono focus:outline-none focus:border-border"
              />
              <p className="text-[11px] text-foreground-muted mt-1">
                {formConfig.isLocal
                  ? 'Server port where local model daemon is listening.'
                  : 'Upstream completion API endpoint.'}
              </p>
            </div>

            {/* API Key */}
            {!formConfig.isLocal && (
              <div>
                <label className="block text-foreground-muted font-medium mb-1 flex items-center gap-1.5">
                  <Key size={14} strokeWidth={1.8} className="text-foreground-muted" />
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formConfig.apiKey || ''}
                    onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                    placeholder="Enter API key"
                    className="w-full bg-surface border border-border rounded-lg pl-3 pr-10 py-1.5 text-foreground font-mono focus:outline-none focus:border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2 text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
                  </button>
                </div>
                {hasStoredKey && (
                  <p className="text-[11px] text-emerald-400 mt-1">Key configured (stored securely).</p>
                )}
              </div>
            )}

            {/* Selected Model */}
            <div>
              <label className="block text-foreground-muted font-medium mb-1">
                Model Identifier
              </label>
              <input
                type="text"
                value={formConfig.selectedModel}
                onChange={(e) => handleFieldChange('selectedModel', e.target.value)}
                placeholder="e.g. gemini-2.5-pro, claude-3-7-sonnet, gpt-4o, qwen2.5-coder, or a custom model ID"
                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground font-mono focus:outline-none focus:border-border"
              />
            </div>

            {/* Discovered Models */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-foreground-muted font-medium">Discovered Models</span>
                <span className="text-[11px] text-foreground-muted font-mono">
                  {formConfig.discoveredModels.length} detected
                </span>
              </div>
              <div className="p-2 bg-surface border border-border rounded-lg min-h-[48px] max-h-24 overflow-y-auto custom-scrollbar">
                {formConfig.discoveredModels.length === 0 ? (
                  <div className="text-[11px] text-foreground-muted py-1 text-center">
                    No models detected. Click &quot;Verify Connection&quot; to discover available models.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {formConfig.discoveredModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleFieldChange('selectedModel', m)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                          formConfig.selectedModel === m
                            ? 'bg-zinc-200 text-black font-medium'
                            : 'bg-surface text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Verify Feedback */}
            {verifyResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  verifyResult.success
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-red-950/20 border-red-800/40 text-red-300'
                }`}
              >
                {verifyResult.success ? (
                  <CheckCircle2 size={14} strokeWidth={1.8} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={14} strokeWidth={1.8} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <div className="font-medium text-xs">
                    {verifyResult.success ? 'Verification Succeeded' : 'Connection Failed'}
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">{verifyResult.message}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2.5 border-t border-border">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface text-foreground border border-border rounded-md transition-colors cursor-pointer disabled:opacity-50 text-xs"
              >
                <RefreshCw size={12} strokeWidth={1.8} className={verifying ? 'animate-spin' : ''} />
                <span>{verifying ? 'Testing...' : 'Verify Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-md font-medium transition-colors cursor-pointer text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
