import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { ProviderConfig } from '@/types';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Cloud,
  Check,
} from 'lucide-react';

export const ProvidersSettings: React.FC = () => {
  const {
    providers,
    selectedProvider,
    selectedModel,
    setSelectedModel,
    effort,
    setEffort,
    saveProviderConfig,
    verifyProviderConnection,
  } = useAppStore();

  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    selectedProvider?.id || providers[0]?.id || 'ollama'
  );
  const [providerForm, setProviderForm] = useState<ProviderConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    models: string[];
    message?: string;
  } | null>(null);
  const [customModelInput, setCustomModelInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentProvider =
    providers.find((p) => p.id === selectedProviderId) || providers[0] || null;

  useEffect(() => {
    if (currentProvider) {
      setProviderForm({
        ...currentProvider,
        apiKey: currentProvider.apiKey || '',
      });
      setVerifyResult(null);
      setCustomModelInput('');
    }
  }, [selectedProviderId, currentProvider]);

  const handleSaveConfig = async () => {
    if (!providerForm) return;
    try {
      await saveProviderConfig(providerForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save provider config:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!providerForm) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      // First persist the current form values so verify reads latest endpoint/key
      await saveProviderConfig(providerForm);
      const res = await verifyProviderConnection(providerForm.id);
      setVerifyResult(res);
      if (res.success && res.models && res.models.length > 0) {
        setProviderForm((prev) =>
          prev
            ? {
                ...prev,
                status: 'connected',
                discoveredModels: res.models,
              }
            : prev
        );
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        models: [],
        message: err.message || 'Connection verification failed unexpectedly.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const localProviders = providers.filter((p) => p.isLocal);
  const cloudProviders = providers.filter((p) => !p.isLocal);

  return (
    <div className="space-y-4">
      {/* Active Model Banner */}
      <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#242426] border border-[#303034] flex items-center justify-center text-[#F2F2F2] shrink-0">
            <Cpu size={16} />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
              Active LLM Engine
            </div>
            <div className="text-sm font-semibold text-[#F2F2F2] font-mono mt-0.5">
              {selectedModel || 'None selected'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-[#A1A1AA]">
          <span className="px-2 py-0.5 rounded bg-[#141416] border border-[#303034] font-medium">
            Provider: {selectedProvider?.name || 'None'}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#141416] border border-[#303034] font-medium">
            Effort: {effort || 'Auto'}
          </span>
        </div>
      </div>

      {/* Split Pane: Provider List + Detail Config */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 min-h-[480px]">
        {/* Left Column: Categorized Providers */}
        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/50 p-2.5 space-y-4 overflow-y-auto custom-scrollbar max-h-[580px]">
          {/* Local Runtimes */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
              <Server size={11} />
              <span>Local Runtimes</span>
            </div>
            {localProviders.map((p) => {
              const isSelected = p.id === selectedProviderId;
              const isEngineProvider = selectedProvider?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProviderId(p.id)}
                  className={`w-full p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#303034] bg-[#242426] text-[#F2F2F2] shadow-xs'
                      : 'border-transparent hover:bg-[#1D1D1F] text-[#A1A1AA] hover:text-[#F2F2F2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate text-[#F2F2F2]">
                      {p.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        p.status === 'connected'
                          ? 'bg-emerald-400'
                          : p.status === 'not-configured'
                          ? 'bg-[#71717A]'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#71717A] mt-1 font-mono">
                    <span className="capitalize">{p.type.replace('_', ' ')}</span>
                    {isEngineProvider && (
                      <span className="text-emerald-400 font-medium">Active</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cloud Providers */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717A] flex items-center gap-1.5 border-t border-[#303034]/70 pt-2.5">
              <Cloud size={11} />
              <span>Cloud Providers</span>
            </div>
            {cloudProviders.map((p) => {
              const isSelected = p.id === selectedProviderId;
              const isEngineProvider = selectedProvider?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProviderId(p.id)}
                  className={`w-full p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#303034] bg-[#242426] text-[#F2F2F2] shadow-xs'
                      : 'border-transparent hover:bg-[#1D1D1F] text-[#A1A1AA] hover:text-[#F2F2F2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate text-[#F2F2F2]">
                      {p.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        p.status === 'connected'
                          ? 'bg-emerald-400'
                          : p.status === 'not-configured'
                          ? 'bg-[#71717A]'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#71717A] mt-1 font-mono">
                    <span className="capitalize">{p.type.replace('_', ' ')}</span>
                    {isEngineProvider && (
                      <span className="text-emerald-400 font-medium">Active</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Configuration Detail Panel */}
        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-4 space-y-4 overflow-y-auto custom-scrollbar max-h-[580px]">
          {providerForm && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#303034]">
                <div>
                  <h3 className="text-sm font-semibold text-[#F2F2F2] flex items-center gap-2">
                    <span>{providerForm.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#141416] border border-[#303034] text-[#A1A1AA]">
                      {providerForm.isLocal ? 'Local Endpoint' : 'Cloud API'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                    Configure endpoint connection parameters and API credentials.
                  </p>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border capitalize ${
                    providerForm.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : providerForm.status === 'not-configured'
                      ? 'bg-[#141416] text-[#A1A1AA] border-[#303034]'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {providerForm.status.replace('-', ' ')}
                </span>
              </div>

              {/* Endpoint URL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#A1A1AA]">Endpoint URL</label>
                  {providerForm.type === 'ollama' && (
                    <button
                      type="button"
                      onClick={() =>
                        setProviderForm((prev) =>
                          prev ? { ...prev, baseUrl: 'http://127.0.0.1:11434' } : prev
                        )
                      }
                      className="text-[10px] text-[#71717A] hover:text-[#F2F2F2]"
                    >
                      Default: http://127.0.0.1:11434
                    </button>
                  )}
                  {providerForm.type === 'lm_studio' && (
                    <button
                      type="button"
                      onClick={() =>
                        setProviderForm((prev) =>
                          prev ? { ...prev, baseUrl: 'http://127.0.0.1:1234/v1' } : prev
                        )
                      }
                      className="text-[10px] text-[#71717A] hover:text-[#F2F2F2]"
                    >
                      Default: http://127.0.0.1:1234/v1
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={providerForm.baseUrl || ''}
                  onChange={(e) =>
                    setProviderForm((prev) =>
                      prev ? { ...prev, baseUrl: e.target.value } : prev
                    )
                  }
                  placeholder="https://api.example.com/v1"
                  className="w-full bg-[#141416] border border-[#303034] rounded-md px-3 py-1.5 text-xs font-mono text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2]"
                />
              </div>

              {/* API Key (Cloud only) */}
              {!providerForm.isLocal && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-[#A1A1AA]">API Key / Token</label>
                    <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                      <ShieldCheck size={11} className="text-emerald-400" />
                      <span>Encrypted via Windows DPAPI safeStorage</span>
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={providerForm.apiKey || ''}
                      onChange={(e) =>
                        setProviderForm((prev) =>
                          prev ? { ...prev, apiKey: e.target.value } : prev
                        )
                      }
                      placeholder="sk-..."
                      className="w-full bg-[#141416] border border-[#303034] rounded-md pl-3 pr-10 py-1.5 text-xs font-mono text-[#F2F2F2] focus:outline-none focus:border-[#F2F2F2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 text-[#71717A] hover:text-[#F2F2F2] transition-colors"
                      aria-label={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={handleTestConnection}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#242426] hover:bg-[#303034] text-[#F2F2F2] border border-[#303034] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw size={12} className="animate-spin text-[#F2F2F2]" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-3 py-1.5 rounded-md bg-[#1D1D1F] hover:bg-[#242426] text-[#F2F2F2] border border-[#303034] text-xs font-medium transition-colors cursor-pointer"
                  >
                    Save Config
                  </button>
                </div>

                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <Check size={12} />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              {/* Verify Result Notification */}
              {verifyResult && (
                <div
                  className={`rounded-md border p-3 text-xs leading-relaxed ${
                    verifyResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {verifyResult.success ? (
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle size={14} className="shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div>
                      {verifyResult.success ? (
                        <div>
                          <div className="font-semibold">Connection verified successfully</div>
                          <div className="text-[11px] text-emerald-400/80 mt-0.5">
                            Discovered {verifyResult.models.length} available model(s).
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold">Connection verification failed</div>
                          <div className="text-[11px] text-rose-300/90 mt-0.5">
                            {verifyResult.message || 'Check endpoint URL and credentials.'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Discovered Models List */}
              <div className="space-y-2 pt-2 border-t border-[#303034]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F2F2F2]">
                    Discovered Models ({providerForm.discoveredModels?.length || 0})
                  </span>
                  <span className="text-[10px] text-[#71717A]">
                    Click to designate as active model
                  </span>
                </div>

                {providerForm.discoveredModels && providerForm.discoveredModels.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {providerForm.discoveredModels.map((m) => {
                      const isActive = selectedModel === m;
                      return (
                        <div
                          key={m}
                          className="flex items-center justify-between p-2 rounded-md border border-[#303034] bg-[#141416] hover:bg-[#242426]/30 text-xs transition-colors"
                        >
                          <span className="font-mono text-[#F2F2F2] truncate pr-2">{m}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedModel(m, providerForm.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#242426] hover:bg-[#303034] text-[#A1A1AA] hover:text-[#F2F2F2] border border-[#303034]'
                            }`}
                          >
                            {isActive ? 'Active' : 'Set Active'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-md border border-dashed border-[#303034] bg-[#141416]/50 text-center text-xs text-[#71717A]">
                    No models discovered yet. Click "Test Connection" to query available models.
                  </div>
                )}
              </div>

              {/* Custom Model Identifier Override */}
              <div className="space-y-1.5 pt-2 border-t border-[#303034]">
                <label className="text-[11px] font-medium text-[#A1A1AA]">
                  Manual Model Identifier Override
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder="e.g. claude-3-7-sonnet-20250219 or gemini-2.5-pro"
                    className="flex-1 bg-[#141416] border border-[#303034] rounded-md px-3 py-1.5 text-xs font-mono text-[#F2F2F2] placeholder-[#71717A] focus:outline-none focus:border-[#F2F2F2]"
                  />
                  <button
                    type="button"
                    disabled={!customModelInput.trim()}
                    onClick={() => {
                      if (customModelInput.trim()) {
                        setSelectedModel(customModelInput.trim(), providerForm.id);
                        setCustomModelInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#242426] hover:bg-[#303034] text-[#F2F2F2] border border-[#303034] text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Set Active
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
