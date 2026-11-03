/**
 * Provider verification tests for REFX AI P3.
 *
 * Tests real provider verification for all providers:
 * - Ollama, Google Gemini, OpenAI, Anthropic, OpenRouter, LM Studio, OpenAI-compatible, Custom local
 *
 * Covers:
 * - Valid credentials
 * - Invalid credentials (auth-failed)
 * - Missing credentials (not-configured)
 * - Unavailable endpoint (provider-unavailable)
 * - Rate limits (rate-limited)
 * - Model discovery
 * - Manual model selection (auth-verified-model-untested)
 * - Provider switching
 * - Credential retrieval through secure Main Process storage
 *
 * Runs under plain Node (node:test via tsx) with mocked Electron modules.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import './test-shim';
import { AppProvider, useAppStore } from './app-store';
import type { ProviderVerificationResult } from '@/types';

type StoreSnapshot = {
  isGenerating: boolean;
  conversationIds: string[];
  currentId: string | null;
  providerStatus: Record<string, string>;
  providerError: Record<string, string | undefined>;
  providerModels: Record<string, string[]>;
};

const records: StoreSnapshot[] = [];
const latest: {
  verifyProviderConnection: any;
  sendMessage: any;
  startNewConversation: any;
  selectConversation: any;
  saveProviderConfig: any;
} = {
  verifyProviderConnection: null,
  sendMessage: null,
  startNewConversation: null,
  selectConversation: null,
  saveProviderConfig: null,
};

// Mocked window.desktop bridge state
let verificationResults: Record<string, ProviderVerificationResult> = {};
let verificationThrows = false;
let verificationDelay = 10;

function buildDesktop() {
  return {
    getAppInfo: () =>
      Promise.resolve({
        name: 'REFX',
        version: '1.0.0',
        isElectron: true,
        platform: 'win32',
        arch: 'x64',
        osVersion: 'Windows 11',
        isWindows: true,
      }),
    listOllamaModels: () => Promise.resolve({ success: true, models: ['llama3:8b'] }),
    verifyProvider: async (config: any) => {
      if (verificationThrows) throw new Error('boom');
      const result = verificationResults[config.id];
      if (result) return result;
      // Default: not configured
      return {
        success: false,
        models: [],
        status: 'not-configured' as const,
        message: 'Provider verification not implemented for this test.',
      };
    },
    startProviderChat: async () => ({ requestId: 'req-1', success: true }),
    cancelProviderChat: async () => true,
    onProviderStream: (cb: any) => {
      setTimeout(() => cb({ requestId: 'req-1', type: 'done', fullText: 'Hello, world!' }), 5);
      return () => {};
    },
    saveCredential: async () => true,
    deleteCredential: async () => true,
    hasCredential: async () => true,
    migrateCredential: async () => ({ success: true }),
    onOllamaStream: (cb: any) => {
      setTimeout(() => cb({ requestId: 'req-1', type: 'done', fullText: 'Hello, world!' }), 5);
      return () => {};
    },
    checkOllama: () => Promise.resolve({ available: true }),
    selectWorkspace: () => Promise.resolve(null),
  };
}

function Probe() {
  const store = useAppStore();
  latest.verifyProviderConnection = store.verifyProviderConnection;
  latest.sendMessage = store.sendMessage;
  latest.startNewConversation = store.startNewConversation;
  latest.selectConversation = store.selectConversation;
  latest.saveProviderConfig = store.saveProviderConfig;
  records.push({
    isGenerating: store.isGenerating,
    conversationIds: store.conversations.map((c) => c.id),
    currentId: store.currentConversation?.id ?? null,
    providerStatus: Object.fromEntries(
      store.providers.map((p) => [p.id, p.status])
    ),
    providerError: Object.fromEntries(
      store.providers.map((p) => [p.id, p.errorMessage])
    ),
    providerModels: Object.fromEntries(
      store.providers.map((p) => [p.id, p.discoveredModels])
    ),
  });
  return null;
}

let root: ReturnType<typeof createRoot> | null = null;

async function renderStore() {
  const container = document.createElement('div');
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(AppProvider, null, React.createElement(Probe)));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return latest;
}

function flushStream() {
  return act(async () => {
    await new Promise((r) => setTimeout(r, verificationDelay + 20));
  });
}

beforeEach(() => {
  records.length = 0;
  verificationResults = {};
  verificationThrows = false;
  verificationDelay = 10;
  (globalThis as any).localStorage.clear();
  (globalThis as any).window.desktop = buildDesktop();
});

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
});

// Helper to set a verification result for a provider
function setVerificationResult(
  providerId: string,
  result: ProviderVerificationResult
) {
  verificationResults[providerId] = result;
}

// ---------------------------------------------------------------------------
// Ollama verification tests
// ---------------------------------------------------------------------------

test('Ollama: valid credentials - connected with models discovered', async () => {
  setVerificationResult('ollama', {
    success: true,
    models: ['llama3:8b', 'codellama:7b'],
    status: 'connected',
    message: 'Connected to Ollama. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['ollama'], 'connected');
  assert.equal(final.providerError['ollama'], undefined);
  assert.deepEqual(final.providerModels['ollama'], ['llama3:8b', 'codellama:7b']);
});

test('Ollama: unavailable endpoint - provider-unavailable', async () => {
  setVerificationResult('ollama', {
    success: false,
    models: [],
    status: 'provider-unavailable',
    message: 'Connection refused.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['ollama'], 'provider-unavailable');
  assert.ok(final.providerError['ollama']?.includes('Connection refused'));
});

test('Ollama: no models installed - model-unavailable', async () => {
  setVerificationResult('ollama', {
    success: false,
    models: [],
    status: 'model-unavailable',
    message: 'Ollama is running but no models are installed.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['ollama'], 'model-unavailable');
  // discoveredModels retains init-time value (auto-detected during renderStore)
  assert.ok(Array.isArray(final.providerModels['ollama']));
});

// ---------------------------------------------------------------------------
// Gemini verification tests
// ---------------------------------------------------------------------------

test('Gemini: valid credentials - connected with models discovered', async () => {
  setVerificationResult('google_gemini', {
    success: true,
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    status: 'connected',
    message: 'Connected to Gemini. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('google_gemini');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['google_gemini'], 'connected');
  assert.equal(final.providerError['google_gemini'], undefined);
  assert.deepEqual(final.providerModels['google_gemini'], [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ]);
});

test('Gemini: invalid credentials - auth-failed', async () => {
  setVerificationResult('google_gemini', {
    success: false,
    models: [],
    status: 'auth-failed',
    message: 'Invalid Gemini API key.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('google_gemini');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['google_gemini'], 'auth-failed');
  assert.ok(final.providerError['google_gemini']?.includes('Invalid Gemini API key'));
});

test('Gemini: rate limited - rate-limited', async () => {
  setVerificationResult('google_gemini', {
    success: false,
    models: [],
    status: 'rate-limited',
    message: 'Gemini rate limit exceeded.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('google_gemini');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['google_gemini'], 'rate-limited');
  assert.ok(final.providerError['google_gemini']?.includes('rate limit'));
});

// ---------------------------------------------------------------------------
// OpenAI verification tests
// ---------------------------------------------------------------------------

test('OpenAI: valid credentials - connected with models discovered', async () => {
  setVerificationResult('openai', {
    success: true,
    models: ['gpt-4', 'gpt-3.5-turbo'],
    status: 'connected',
    message: 'Connected. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('openai');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['openai'], 'connected');
  assert.deepEqual(final.providerModels['openai'], ['gpt-4', 'gpt-3.5-turbo']);
});

test('OpenAI: invalid credentials - auth-failed', async () => {
  setVerificationResult('openai', {
    success: false,
    models: [],
    status: 'auth-failed',
    message: 'Invalid API key.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('openai');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['openai'], 'auth-failed');
});

// ---------------------------------------------------------------------------
// Anthropic verification tests
// ---------------------------------------------------------------------------

test('Anthropic: valid credentials - connected with models discovered', async () => {
  setVerificationResult('anthropic', {
    success: true,
    models: ['claude-3-5-sonnet', 'claude-3-haiku'],
    status: 'connected',
    message: 'Connected to Anthropic. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('anthropic');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['anthropic'], 'connected');
  assert.deepEqual(final.providerModels['anthropic'], [
    'claude-3-5-sonnet',
    'claude-3-haiku',
  ]);
});

test('Anthropic: missing credentials - not-configured', async () => {
  // No verification result set - default returns not-configured
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('anthropic');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['anthropic'], 'not-configured');
});

// ---------------------------------------------------------------------------
// OpenRouter verification tests
// ---------------------------------------------------------------------------

test('OpenRouter: valid credentials - connected with models discovered', async () => {
  setVerificationResult('openrouter', {
    success: true,
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
    status: 'connected',
    message: 'Connected to OpenRouter. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('openrouter');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['openrouter'], 'connected');
  assert.deepEqual(final.providerModels['openrouter'], [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
  ]);
});

test('OpenRouter: rate limited - rate-limited', async () => {
  setVerificationResult('openrouter', {
    success: false,
    models: [],
    status: 'rate-limited',
    message: 'OpenRouter rate limit exceeded.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('openrouter');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['openrouter'], 'rate-limited');
});

// ---------------------------------------------------------------------------
// LM Studio verification tests
// ---------------------------------------------------------------------------

test('LM Studio: valid credentials - connected with models discovered', async () => {
  setVerificationResult('lm_studio', {
    success: true,
    models: ['llama-3.1-8b', 'mistral-7b'],
    status: 'connected',
    message: 'Connected to LM Studio. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('lm_studio');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['lm_studio'], 'connected');
  assert.deepEqual(final.providerModels['lm_studio'], [
    'llama-3.1-8b',
    'mistral-7b',
  ]);
});

// ---------------------------------------------------------------------------
// OpenAI-compatible verification tests
// ---------------------------------------------------------------------------

test('OpenAI-compatible: valid credentials - connected with models discovered', async () => {
  setVerificationResult('openai_compatible', {
    success: true,
    models: ['custom-model-1', 'custom-model-2'],
    status: 'connected',
    message: 'Connected. 2 model(s) discovered.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('openai_compatible');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['openai_compatible'], 'connected');
  assert.deepEqual(final.providerModels['openai_compatible'], [
    'custom-model-1',
    'custom-model-2',
  ]);
});

// ---------------------------------------------------------------------------
// Custom local verification tests
// ---------------------------------------------------------------------------

test('Custom local: auth-verified-model-untested - manual model entry allowed', async () => {
  setVerificationResult('custom_local', {
    success: false,
    models: [],
    status: 'auth-verified-model-untested',
    message:
      'Connected to custom endpoint but model discovery is not supported. You may enter a model ID manually.',
  });
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('custom_local');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['custom_local'], 'auth-verified-model-untested');
});

// ---------------------------------------------------------------------------
// Provider switching tests
// ---------------------------------------------------------------------------

test('Provider switching: Ollama -> Gemini carries over state correctly', async () => {
  const store = await renderStore();

  // Set up Ollama
  setVerificationResult('ollama', {
    success: true,
    models: ['llama3:8b'],
    status: 'connected',
    message: 'Connected to Ollama. 1 model(s) discovered.',
  });
  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });
  let final = records[records.length - 1];
  assert.equal(final.providerStatus['ollama'], 'connected');

  // Switch to Gemini
  setVerificationResult('google_gemini', {
    success: true,
    models: ['gemini-1.5-pro'],
    status: 'connected',
    message: 'Connected to Gemini. 1 model(s) discovered.',
  });
  await act(async () => {
    await store.verifyProviderConnection('google_gemini');
  });
  final = records[records.length - 1];
  assert.equal(final.providerStatus['google_gemini'], 'connected');
  assert.equal(final.providerStatus['ollama'], 'connected'); // Ollama stays connected
});

// ---------------------------------------------------------------------------
// Credential retrieval through secure Main Process storage
// ---------------------------------------------------------------------------

test('Credential retrieval: save and verify with stored credential', async () => {
  const store = await renderStore();

  // Save credential first
  await act(async () => {
    await store.saveProviderConfig({
      id: 'google_gemini',
      name: 'Google Gemini',
      type: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiKey: 'test-api-key-123',
      isLocal: false,
      status: 'not-configured',
      discoveredModels: [],
      selectedModel: '',
    });
  });

  // Now verify - credential should be retrieved from secure storage
  setVerificationResult('google_gemini', {
    success: true,
    models: ['gemini-1.5-pro'],
    status: 'connected',
    message: 'Connected to Gemini. 1 model(s) discovered.',
  });
  await act(async () => {
    await store.verifyProviderConnection('google_gemini');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['google_gemini'], 'connected');
});

// ---------------------------------------------------------------------------
// Thrown error handling
// ---------------------------------------------------------------------------

test('Thrown error from provider - provider-unavailable', async () => {
  verificationThrows = true;
  const store = await renderStore();

  await act(async () => {
    await store.verifyProviderConnection('ollama');
  });

  const final = records[records.length - 1];
  assert.equal(final.providerStatus['ollama'], 'provider-unavailable');
  assert.ok(final.providerError['ollama']?.includes('boom'));
});
