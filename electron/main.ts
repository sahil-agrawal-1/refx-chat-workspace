import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type {
  DesktopAppInfo,
  OllamaCheckResult,
  OllamaModelsResult,
  OllamaChatMessage,
  ModelInferenceRequest,
  ModelInferenceResult,
  ModelStreamEvent,
  ProviderConfig,
  ProviderType,
  MODEL_IPC_CHANNELS,
} from '../shared/contracts/desktop-bridge';
import { CREDENTIAL_IPC_CHANNELS } from '../shared/contracts/desktop-bridge';

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowlisted IPC channel constants
const IPC_CHANNELS = {
  GET_APP_INFO: 'desktop:getAppInfo',
  SELECT_WORKSPACE: 'desktop:selectWorkspace',
  CHECK_OLLAMA: 'desktop:checkOllama',
  LIST_OLLAMA_MODELS: 'desktop:listOllamaModels',
  START_OLLAMA_CHAT: 'desktop:startOllamaChat',
  CANCEL_OLLAMA_CHAT: 'desktop:cancelOllamaChat',
  OLLAMA_STREAM: 'desktop:ollamaStream',
} as const;

// Unified provider inference IPC channels
const MODEL_CHANNELS = {
  VERIFY_PROVIDER: 'desktop:verifyProvider',
  START_PROVIDER_CHAT: 'desktop:startProviderChat',
  CANCEL_PROVIDER_CHAT: 'desktop:cancelProviderChat',
  PROVIDER_STREAM: 'desktop:providerStream',
} as const;

// Security: strictly restrict Ollama requests to local loopback interface
const OLLAMA_HOST = 'http://127.0.0.1:11434';

// Secure credential storage using Electron safeStorage (Windows DPAPI).
// Encrypted credentials are persisted to a JSON file in the app userData
// directory. Decrypted credentials never leave the main process.
const CREDENTIALS_FILE = path.join(app.getPath('userData'), 'provider-credentials.json');

// In-memory cache of decrypted credentials keyed by providerId.
// Populated on demand from the encrypted store; cleared on process exit.
const credentialCache = new Map<string, string>();

/**
 * Load the encrypted credential store from disk.
 * Returns an empty map if the file does not exist or cannot be read.
 */
function loadCredentialStore(): Map<string, string> {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return new Map();
    }
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Map(parsed.map((entry: { id: string; encrypted: string }) => [entry.id, entry.encrypted]));
    }
    return new Map();
  } catch {
    return new Map();
  }
}

/**
 * Save the encrypted credential store to disk.
 */
function saveCredentialStore(store: Map<string, string>): void {
  try {
    const entries = Array.from(store.entries()).map(([id, encrypted]) => ({ id, encrypted }));
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(entries, null, 2), { encoding: 'utf8' });
  } catch (err) {
    console.error('[Security] Failed to persist credential store:', err);
  }
}

/**
 * Encrypt a plaintext credential using Electron safeStorage (DPAPI on Windows).
 * Returns base64-encoded ciphertext, or null if encryption is unavailable.
 */
function encryptCredential(plaintext: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('[Security] safeStorage encryption is not available on this platform.');
    return null;
  }
  const encryptedBuffer = safeStorage.encryptString(plaintext);
  return encryptedBuffer.toString('base64');
}

/**
 * Decrypt a credential previously encrypted with encryptCredential.
 * Returns the plaintext, or null if decryption fails.
 */
function decryptCredential(encryptedBase64: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('[Security] safeStorage decryption is not available on this platform.');
    return null;
  }
  try {
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(encryptedBuffer);
  } catch {
    return null;
  }
}

/**
 * Retrieve a decrypted credential for a provider from the secure store.
 * Returns null if not found or if encryption is unavailable.
 * This is used ONLY by the main process internally; never exposed to the renderer.
 */
function getCredentialForProvider(providerId: string): string | null {
  // Check cache first
  if (credentialCache.has(providerId)) {
    return credentialCache.get(providerId)!;
  }

  const store = loadCredentialStore();
  const encrypted = store.get(providerId);
  if (!encrypted) {
    return null;
  }

  const plaintext = decryptCredential(encrypted);
  if (plaintext) {
    credentialCache.set(providerId, plaintext);
  }
  return plaintext;
}

// Store for active stream abort controllers (all providers)
const activeChatAborts = new Map<string, AbortController>();

// In-flight provider stream senders keyed by requestId
const activeStreamSenders = new Map<string, Electron.WebContents>();

let mainWindow: BrowserWindow | null = null;

// Determine environment
const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

function registerIpcHandlers(): void {
  // Native method: getAppInfo
  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, async (): Promise<DesktopAppInfo> => {
    return {
      name: 'REFX',
      version: app.getVersion(),
      isElectron: true,
      platform: process.platform as 'win32' | 'darwin' | 'linux',
      arch: process.arch,
      osVersion: os.release(),
      isWindows: process.platform === 'win32',
    };
  });

  // Native method: selectWorkspace (native folder picker)
  ipcMain.handle(
    IPC_CHANNELS.SELECT_WORKSPACE,
    async (_event, defaultPath?: string): Promise<string | null> => {
      if (!mainWindow) return null;

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Project Workspace Folder',
        defaultPath: typeof defaultPath === 'string' && defaultPath ? defaultPath : undefined,
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    }
  );

  // Native method: checkOllama
  ipcMain.handle(IPC_CHANNELS.CHECK_OLLAMA, async (): Promise<OllamaCheckResult> => {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        return { available: true };
      }
      return {
        available: false,
        error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
      };
    } catch (err: any) {
      return {
        available: false,
        error:
          err.code === 'ECONNREFUSED' || err.name === 'TimeoutError'
            ? 'Ollama is not running. Please start the Ollama service on your machine.'
            : (err.message || 'Unable to connect to Ollama service.'),
      };
    }
  });

  // Native method: listOllamaModels
  ipcMain.handle(IPC_CHANNELS.LIST_OLLAMA_MODELS, async (): Promise<OllamaModelsResult> => {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        return {
          success: false,
          models: [],
          error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
        };
      }
      const data = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
      const modelNames = (data.models || [])
        .map((m) => m.name || m.model || '')
        .filter(Boolean);

      return {
        success: true,
        models: modelNames,
      };
    } catch (err: any) {
      return {
        success: false,
        models: [],
        error:
          err.code === 'ECONNREFUSED'
            ? 'Ollama service is unreachable at http://127.0.0.1:11434.'
            : (err.message || 'Failed to query Ollama models.'),
      };
    }
  });

  // Native method: startOllamaChat
  ipcMain.handle(
    IPC_CHANNELS.START_OLLAMA_CHAT,
    async (
      event,
      requestId: string,
      model: string,
      messages: OllamaChatMessage[]
    ): Promise<{ success: boolean; error?: string }> => {
      if (!model || !model.trim()) {
        return { success: false, error: 'No model specified for Ollama inference.' };
      }
      if (!Array.isArray(messages) || messages.length === 0) {
        return { success: false, error: 'No messages provided for chat inference.' };
      }

      const abortController = new AbortController();
      activeChatAborts.set(requestId, abortController);

      // Asynchronous streaming execution
      (async () => {
        const sender = event.sender;
        let fullText = '';

        try {
          const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages,
              stream: true,
            }),
            signal: abortController.signal,
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            let message = `Ollama error ${res.status}: ${res.statusText}`;
            try {
              const errJson = JSON.parse(errorText);
              if (errJson.error) message = errJson.error;
            } catch {}
            if (!sender.isDestroyed()) {
              sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                requestId,
                type: 'error',
                error: message,
              });
            }
            return;
          }

          if (!res.body) {
            if (!sender.isDestroyed()) {
              sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                requestId,
                type: 'error',
                error: 'Empty response stream received from Ollama.',
              });
            }
            return;
          }

          // Parse streaming NDJSON
          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const chunk = JSON.parse(trimmed) as {
                  message?: { content?: string };
                  done?: boolean;
                  error?: string;
                };

                if (chunk.error) {
                  if (!sender.isDestroyed()) {
                    sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                      requestId,
                      type: 'error',
                      error: chunk.error,
                    });
                  }
                  return;
                }

                const delta = chunk.message?.content || '';
                if (delta) {
                  fullText += delta;
                  if (!sender.isDestroyed()) {
                    sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                      requestId,
                      type: 'chunk',
                      delta,
                      fullText,
                    });
                  }
                }

                if (chunk.done) {
                  if (!sender.isDestroyed()) {
                    sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                      requestId,
                      type: 'done',
                      fullText,
                    });
                  }
                  return;
                }
              } catch {
                // Ignore incomplete line parse
              }
            }
          }

          if (buffer.trim()) {
            try {
              const chunk = JSON.parse(buffer.trim());
              if (chunk.message?.content) {
                fullText += chunk.message.content;
                if (!sender.isDestroyed()) {
                  sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                    requestId,
                    type: 'chunk',
                    delta: chunk.message.content,
                    fullText,
                  });
                }
              }
            } catch {}
          }

          if (!sender.isDestroyed()) {
            sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
              requestId,
              type: 'done',
              fullText,
            });
          }
        } catch (err: any) {
          if (abortController.signal.aborted) {
            if (!sender.isDestroyed()) {
              sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                requestId,
                type: 'done',
                fullText,
                error: 'Generation stopped',
              });
            }
          } else {
            if (!sender.isDestroyed()) {
              sender.send(IPC_CHANNELS.OLLAMA_STREAM, {
                requestId,
                type: 'error',
                error:
                  err.code === 'ECONNREFUSED'
                    ? 'Lost connection to Ollama daemon.'
                    : (err.message || 'Stream processing failed.'),
              });
            }
          }
        } finally {
          activeChatAborts.delete(requestId);
        }
      })();

      return { success: true };
    }
  );

  // Native method: cancelOllamaChat
  ipcMain.handle(
    IPC_CHANNELS.CANCEL_OLLAMA_CHAT,
    async (_event, requestId: string): Promise<boolean> => {
      const controller = activeChatAborts.get(requestId);
      if (controller) {
        controller.abort();
        activeChatAborts.delete(requestId);
        return true;
      }
      return false;
    }
  );

  // Native method: verifyProvider (multi-provider)
  ipcMain.handle(
    MODEL_CHANNELS.VERIFY_PROVIDER,
    async (_event, config: ProviderConfig): Promise<{ success: boolean; models: string[]; message?: string }> => {
      return verifyProviderConnection(config);
    }
  );

  // Native method: startProviderChat (multi-provider)
  ipcMain.handle(
    MODEL_CHANNELS.START_PROVIDER_CHAT,
    async (event, request: ModelInferenceRequest): Promise<ModelInferenceResult> => {
      return startProviderChatStream(event, request);
    }
  );

  // Native method: cancelProviderChat (multi-provider)
  ipcMain.handle(
    MODEL_CHANNELS.CANCEL_PROVIDER_CHAT,
    async (_event, requestId: string): Promise<boolean> => {
      const controller = activeChatAborts.get(requestId);
      if (controller) {
        controller.abort();
        activeChatAborts.delete(requestId);
        activeStreamSenders.delete(requestId);
        return true;
      }
      return false;
    }
  );

  // Native method: saveCredential (secure, renderer -> main only)
  ipcMain.handle(
    CREDENTIAL_IPC_CHANNELS.SAVE_CREDENTIAL,
    async (_event, { providerId, apiKey }: { providerId: string; apiKey: string }): Promise<boolean> => {
      if (!safeStorage.isEncryptionAvailable()) {
        console.error('[Security] Cannot save credential: encryption unavailable.');
        return false;
      }
      const encrypted = encryptCredential(apiKey);
      if (!encrypted) {
        return false;
      }
      const store = loadCredentialStore();
      store.set(providerId, encrypted);
      saveCredentialStore(store);
      credentialCache.set(providerId, apiKey);
      return true;
    }
  );

  // Native method: deleteCredential (renderer -> main only)
  ipcMain.handle(
    CREDENTIAL_IPC_CHANNELS.DELETE_CREDENTIAL,
    async (_event, { providerId }: { providerId: string }): Promise<boolean> => {
      const store = loadCredentialStore();
      const had = store.delete(providerId);
      saveCredentialStore(store);
      credentialCache.delete(providerId);
      return had;
    }
  );

  // Native method: hasCredential (renderer -> main only)
  ipcMain.handle(
    CREDENTIAL_IPC_CHANNELS.HAS_CREDENTIAL,
    async (_event, { providerId }: { providerId: string }): Promise<boolean> => {
      if (credentialCache.has(providerId)) {
        return true;
      }
      const store = loadCredentialStore();
      return store.has(providerId);
    }
  );

  // Native method: migrateCredential (renderer -> main, one-time migration from plaintext)
  ipcMain.handle(
    CREDENTIAL_IPC_CHANNELS.MIGRATE_CREDENTIAL,
    async (_event, { providerId, apiKey }: { providerId: string; apiKey: string }): Promise<{ success: boolean; error?: string }> => {
      if (!safeStorage.isEncryptionAvailable()) {
        return { success: false, error: 'Encryption is not available on this platform.' };
      }
      const encrypted = encryptCredential(apiKey);
      if (!encrypted) {
        return { success: false, error: 'Failed to encrypt credential.' };
      }
      const store = loadCredentialStore();
      store.set(providerId, encrypted);
      saveCredentialStore(store);
      credentialCache.set(providerId, apiKey);
      return { success: true };
    }
  );
}

/**
 * Verify a provider connection and discover models.
 */
async function verifyProviderConnection(
  config: ProviderConfig
): Promise<{ success: boolean; models: string[]; message?: string }> {
  try {
    switch (config.type) {
      case 'ollama': {
        const res = await fetch(`${config.baseUrl || OLLAMA_HOST}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          return { success: false, models: [], message: `Ollama returned HTTP ${res.status}: ${res.statusText}` };
        }
        const data = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
        const models = (data.models || []).map((m) => m.name || m.model || '').filter(Boolean);
        return models.length > 0
          ? { success: true, models, message: `Connected to Ollama. ${models.length} model(s) discovered.` }
          : { success: false, models: [], message: 'Ollama is running but no models are installed.' };
      }

      case 'gemini': {
        const apiKey = getCredentialForProvider(config.id);
        if (!apiKey) {
          return { success: false, models: [], message: 'API key not found. Please save your credentials.' };
        }
        return verifyGeminiConnection(apiKey);
      }

      default:
        return { success: false, models: [], message: `Provider type ${config.type} verification not yet implemented.` };
    }
  } catch (err: any) {
    return { success: false, models: [], message: err.message || 'Provider verification failed.' };
  }
}

/**
 * Verify Gemini provider connection and list models using REST API.
 */
async function verifyGeminiConnection(
  apiKey: string
): Promise<{ success: boolean; models: string[]; message?: string }> {
  try {
    // List models from Gemini API
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { success: false, models: [], message: 'Invalid Gemini API key.' };
      }
      if (res.status === 429) {
        return { success: false, models: [], message: 'Gemini rate limit exceeded.' };
      }
      return { success: false, models: [], message: `Gemini API returned HTTP ${res.status}: ${res.statusText}` };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = data.models?.map((m) => m.name?.replace('models/', '') || '').filter(Boolean) || [];
    return models.length > 0
      ? { success: true, models, message: `Connected to Gemini. ${models.length} model(s) discovered.` }
      : { success: false, models: [], message: 'Gemini connected but no models discovered.' };
  } catch (err: any) {
    let message = err.message || 'Gemini verification failed.';
    if (err.status === 401 || err.status === 403) message = 'Invalid Gemini API key.';
    else if (err.status === 429) message = 'Gemini rate limit exceeded.';
    return { success: false, models: [], message };
  }
}

/**
 * Start a streaming chat with any provider.
 */
async function startProviderChatStream(
  event: { sender: Electron.WebContents },
  request: ModelInferenceRequest
): Promise<ModelInferenceResult> {
  switch (request.providerType) {
    case 'ollama':
      return startProviderChatOllama(event, request);
    case 'gemini':
      return startProviderChatGemini(event, request);
    case 'openai':
    case 'openai_compatible':
    case 'lm_studio':
    case 'custom_local':
      return startProviderChatOpenAICompatible(event, request);
    case 'anthropic':
      return startProviderChatAnthropic(event, request);
    case 'openrouter':
      return startProviderChatOpenRouter(event, request);
    default:
      return { requestId: request.requestId, success: false, error: `Unsupported provider type: ${request.providerType}` };
  }
}

async function startProviderChatOllama(
  event: { sender: Electron.WebContents },
  request: ModelInferenceRequest
): Promise<ModelInferenceResult> {
  if (!request.model || !request.model.trim()) {
    return { requestId: request.requestId, success: false, error: 'No model specified.' };
  }
  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    return { requestId: request.requestId, success: false, error: 'No messages provided.' };
  }

  const abortController = new AbortController();
  activeChatAborts.set(request.requestId, abortController);
  activeStreamSenders.set(request.requestId, event.sender);

  (async () => {
    const sender = event.sender;
    let fullText = '';

    try {
      const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: true,
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
          ...(request.maxTokens !== undefined ? { num_predict: request.maxTokens } : {}),
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let message = `Ollama error ${res.status}: ${res.statusText}`;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.error) message = errJson.error;
        } catch {}
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: message,
          });
        }
        return;
      }

      if (!res.body) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: 'Empty response stream from Ollama.',
          });
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (abortController.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.error) {
              if (!sender.isDestroyed()) {
                sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                  requestId: request.requestId,
                  type: 'error',
                  error: chunk.error,
                });
              }
              return;
            }
            const delta = chunk.message?.content || '';
            if (delta) {
              fullText += delta;
              if (!sender.isDestroyed()) {
                sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                  requestId: request.requestId,
                  type: 'chunk',
                  delta,
                  fullText,
                });
              }
            }
            if (chunk.done) {
              if (!sender.isDestroyed()) {
                sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                  requestId: request.requestId,
                  type: 'done',
                  fullText,
                });
              }
              return;
            }
          } catch {
            // Ignore incomplete line parse
          }
        }
      }

      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer.trim());
          if (chunk.message?.content) {
            fullText += chunk.message.content;
            if (!sender.isDestroyed()) {
              sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                requestId: request.requestId,
                type: 'chunk',
                delta: chunk.message.content,
                fullText,
              });
            }
          }
        } catch {}
      }

      if (!sender.isDestroyed()) {
        sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
          requestId: request.requestId,
          type: 'done',
          fullText,
        });
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'done',
            fullText,
            error: 'Generation stopped',
          });
        }
      } else {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: err.message || 'Stream processing failed.',
          });
        }
      }
    } finally {
      activeChatAborts.delete(request.requestId);
      activeStreamSenders.delete(request.requestId);
    }
  })();

  return { requestId: request.requestId, success: true };
}

function buildOpenAIMessages(messages: Array<{ role: string; content: string }>): any[] {
  return messages.map((m) => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }));
}

async function startProviderChatOpenAICompatible(
  event: { sender: Electron.WebContents },
  request: ModelInferenceRequest
): Promise<ModelInferenceResult> {
  const apiKey = getCredentialForProvider(request.providerType);
  const baseUrl = request.baseUrl || (request.providerType === 'openai' ? 'https://api.openai.com/v1' : '');

  const abortController = new AbortController();
  activeChatAborts.set(request.requestId, abortController);
  activeStreamSenders.set(request.requestId, event.sender);

  (async () => {
    const sender = event.sender;
    let fullText = '';

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
        ...(request.providerType === 'lm_studio' || request.providerType === 'custom_local'
          ? { dangerouslyAllowBrowser: true }
          : {}),
      });

      const stream = await client.chat.completions.create({
        model: request.model,
        messages: buildOpenAIMessages(request.messages),
        stream: true,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
      });

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          if (!sender.isDestroyed()) {
            sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
              requestId: request.requestId,
              type: 'chunk',
              delta,
              fullText,
            });
          }
        }
      }

      if (!sender.isDestroyed()) {
        sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
          requestId: request.requestId,
          type: 'done',
          fullText,
        });
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'done',
            fullText,
            error: 'Generation stopped',
          });
        }
      } else {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: err.message || 'Stream failed.',
          });
        }
      }
    } finally {
      activeChatAborts.delete(request.requestId);
      activeStreamSenders.delete(request.requestId);
    }
  })();

  return { requestId: request.requestId, success: true };
}

async function startProviderChatGemini(
  event: { sender: Electron.WebContents },
  request: ModelInferenceRequest
): Promise<ModelInferenceResult> {
  const apiKey = getCredentialForProvider(request.providerType);
  if (!apiKey) {
    const sender = event.sender;
    if (!sender.isDestroyed()) {
      sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
        requestId: request.requestId,
        type: 'error',
        error: 'API key not found. Please save your credentials.',
      });
    }
    return { requestId: request.requestId, success: false, error: 'API key not found.' };
  }

  const abortController = new AbortController();
  activeChatAborts.set(request.requestId, abortController);
  activeStreamSenders.set(request.requestId, event.sender);

  (async () => {
    const sender = event.sender;
    let fullText = '';

    try {
      // Build contents from messages (Gemini API format)
      const contents = request.messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:streamGenerateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: request.temperature,
              maxOutputTokens: request.maxTokens,
            },
          }),
          signal: abortController.signal,
        }
      );

      if (!res.ok) {
        let message = `Gemini API error ${res.status}: ${res.statusText}`;
        if (res.status === 401 || res.status === 403) message = 'Invalid Gemini API key.';
        else if (res.status === 429) message = 'Gemini rate limit exceeded.';
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: message,
          });
        }
        return;
      }

      if (!res.body) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: 'Empty response from Gemini.',
          });
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (abortController.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Parse SSE-style lines (Gemini uses newline-delimited JSON)
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line || line.startsWith(':')) continue; // Skip empty lines and SSE comments
          try {
            const chunk = JSON.parse(line);
            // Gemini streaming response: candidates[0].content.parts[0].text
            const delta = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (delta) {
              fullText += delta;
              if (!sender.isDestroyed()) {
                sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                  requestId: request.requestId,
                  type: 'chunk',
                  delta,
                  fullText,
                });
              }
            }
          } catch {
            // Ignore incomplete line parse
          }
        }
      }

      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer.trim());
          const delta = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (delta) {
            fullText += delta;
            if (!sender.isDestroyed()) {
              sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                requestId: request.requestId,
                type: 'chunk',
                delta,
                fullText,
              });
            }
          }
        } catch {}
      }

      if (!sender.isDestroyed()) {
        sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
          requestId: request.requestId,
          type: 'done',
          fullText,
        });
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'done',
            fullText,
            error: 'Generation stopped',
          });
        }
      } else {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: err.message || 'Gemini stream failed.',
          });
        }
      }
    } finally {
      activeChatAborts.delete(request.requestId);
      activeStreamSenders.delete(request.requestId);
    }
  })();

  return { requestId: request.requestId, success: true };
}

async function startProviderChatAnthropic(
  event: { sender: Electron.WebContents },
  request: ModelInferenceRequest
): Promise<ModelInferenceResult> {
  const apiKey = getCredentialForProvider(request.providerType);
  if (!apiKey) {
    const sender = event.sender;
    if (!sender.isDestroyed()) {
      sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
        requestId: request.requestId,
        type: 'error',
        error: 'API key not found. Please save your credentials.',
      });
    }
    return { requestId: request.requestId, success: false, error: 'API key not found.' };
  }

  const abortController = new AbortController();
  activeChatAborts.set(request.requestId, abortController);
  activeStreamSenders.set(request.requestId, event.sender);

  (async () => {
    const sender = event.sender;
    let fullText = '';

    try {
      const client = new Anthropic({ apiKey, baseURL: request.baseUrl || undefined });

      const systemMsg = request.messages.find((m) => m.role === 'system');
      const userMsgs = request.messages.filter((m) => m.role !== 'system');

      const baseUrl = request.baseUrl || 'https://api.anthropic.com';

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxTokens || 1024,
          system: systemMsg?.content,
          messages: userMsgs.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        let message = `Anthropic API error ${res.status}: ${res.statusText}`;
        if (res.status === 401 || res.status === 403) message = 'Invalid Anthropic API key.';
        else if (res.status === 429) message = 'Anthropic rate limit exceeded.';
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: message,
          });
        }
        return;
      }

      if (!res.body) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: 'Empty response from Anthropic.',
          });
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        if (abortController.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line || line.startsWith(':')) continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const chunk = JSON.parse(data);
              if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
                const delta = chunk.delta.text;
                if (delta) {
                  fullText += delta;
                  if (!sender.isDestroyed()) {
                    sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                      requestId: request.requestId,
                      type: 'chunk',
                      delta,
                      fullText,
                    });
                  }
                }
              }
            } catch {
              // Ignore incomplete SSE data parse
            }
          }
        }
      }

      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data !== '[DONE]') {
            try {
              const chunk = JSON.parse(data);
              if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
                const delta = chunk.delta.text;
                if (delta) {
                  fullText += delta;
                  if (!sender.isDestroyed()) {
                    sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
                      requestId: request.requestId,
                      type: 'chunk',
                      delta,
                      fullText,
                    });
                  }
                }
              }
            } catch {}
          }
        }
      }

      if (!sender.isDestroyed()) {
        sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
          requestId: request.requestId,
          type: 'done',
          fullText,
        });
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'done',
            fullText,
            error: 'Generation stopped',
          });
        }
      } else {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: err.message || 'Anthropic stream failed.',
          });
        }
      }
    } finally {
      activeChatAborts.delete(request.requestId);
      activeStreamSenders.delete(request.requestId);
    }
  })();

  return { requestId: request.requestId, success: true };
}

async function startProviderChatOpenRouter(
  event: { sender: Electron.WebContents },
  request: ModelInferenceRequest
): Promise<ModelInferenceResult> {
  const apiKey = getCredentialForProvider(request.providerType);
  if (!apiKey) {
    const sender = event.sender;
    if (!sender.isDestroyed()) {
      sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
        requestId: request.requestId,
        type: 'error',
        error: 'API key not found. Please save your credentials.',
      });
    }
    return { requestId: request.requestId, success: false, error: 'API key not found.' };
  }

  const abortController = new AbortController();
  activeChatAborts.set(request.requestId, abortController);
  activeStreamSenders.set(request.requestId, event.sender);

  (async () => {
    const sender = event.sender;
    let fullText = '';

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://refx.ai',
          'X-Title': 'REFX AI Desktop',
        },
      });

      const stream = await client.chat.completions.create({
        model: request.model,
        messages: buildOpenAIMessages(request.messages),
        stream: true,
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
      });

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          if (!sender.isDestroyed()) {
            sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
              requestId: request.requestId,
              type: 'chunk',
              delta,
              fullText,
            });
          }
        }
      }

      if (!sender.isDestroyed()) {
        sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
          requestId: request.requestId,
          type: 'done',
          fullText,
        });
      }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'done',
            fullText,
            error: 'Generation stopped',
          });
        }
      } else {
        if (!sender.isDestroyed()) {
          sender.send(MODEL_CHANNELS.PROVIDER_STREAM, {
            requestId: request.requestId,
            type: 'error',
            error: err.message || 'OpenRouter stream failed.',
          });
        }
      }
    } finally {
      activeChatAborts.delete(request.requestId);
      activeStreamSenders.delete(request.requestId);
    }
  })();

  return { requestId: request.requestId, success: true };
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'REFX',
    icon: path.join(__dirname, '../public/assets/app_logo.svg'),
    backgroundColor: '#121214',
    show: false, // Prevent white flash before ready
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (isDev) {
        const allowedOrigin = new URL(devServerUrl).origin;
        if (parsed.origin !== allowedOrigin) {
          event.preventDefault();
        }
      } else {
        if (parsed.protocol !== 'file:') {
          event.preventDefault();
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.warn(`[Electron] Failed to load dev server at ${devServerUrl}:`, err.message);
      const fallbackPath = path.join(__dirname, '../dist/index.html');
      mainWindow?.loadFile(fallbackPath).catch(() => {});
    });
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(prodPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
