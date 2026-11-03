import { contextBridge, ipcRenderer } from 'electron';
import type {
  DesktopAppInfo,
  IDesktopAPI,
  OllamaCheckResult,
  OllamaModelsResult,
  OllamaChatMessage,
  OllamaStreamEvent,
  ModelInferenceRequest,
  ModelInferenceResult,
  ModelStreamEvent,
  ProviderConfig,
} from '../shared/contracts/desktop-bridge';

/**
 * Allowlisted IPC Channels
 * Strictly define allowed channel names to prevent arbitrary IPC invocation.
 */
const IPC_CHANNELS = {
  GET_APP_INFO: 'desktop:getAppInfo',
  SELECT_WORKSPACE: 'desktop:selectWorkspace',
  CHECK_OLLAMA: 'desktop:checkOllama',
  LIST_OLLAMA_MODELS: 'desktop:listOllamaModels',
  START_OLLAMA_CHAT: 'desktop:startOllamaChat',
  CANCEL_OLLAMA_CHAT: 'desktop:cancelOllamaChat',
  OLLAMA_STREAM: 'desktop:ollamaStream',
} as const;

const MODEL_CHANNELS = {
  VERIFY_PROVIDER: 'desktop:verifyProvider',
  START_PROVIDER_CHAT: 'desktop:startProviderChat',
  CANCEL_PROVIDER_CHAT: 'desktop:cancelProviderChat',
  PROVIDER_STREAM: 'desktop:providerStream',
} as const;

/**
 * Native Desktop API implementation for Electron Renderer
 * Exposed via contextBridge. Never exposes ipcRenderer directly to the window object.
 */
const desktopAPI: IDesktopAPI = {
  getAppInfo: (): Promise<DesktopAppInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_APP_INFO);
  },
  selectWorkspace: (defaultPath?: string): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_WORKSPACE, defaultPath);
  },
  checkOllama: (): Promise<OllamaCheckResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_OLLAMA);
  },
  listOllamaModels: (): Promise<OllamaModelsResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LIST_OLLAMA_MODELS);
  },
  startOllamaChat: (
    requestId: string,
    model: string,
    messages: OllamaChatMessage[]
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_OLLAMA_CHAT, requestId, model, messages);
  },
  cancelOllamaChat: (requestId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL_OLLAMA_CHAT, requestId);
  },
  onOllamaStream: (callback: (event: OllamaStreamEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: OllamaStreamEvent) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.OLLAMA_STREAM, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.OLLAMA_STREAM, listener);
    };
  },
  // Multi-provider inference
  verifyProvider: (config: ProviderConfig): Promise<{ success: boolean; models: string[]; message?: string }> => {
    return ipcRenderer.invoke(MODEL_CHANNELS.VERIFY_PROVIDER, config);
  },
  startProviderChat: (request: ModelInferenceRequest): Promise<ModelInferenceResult> => {
    return ipcRenderer.invoke(MODEL_CHANNELS.START_PROVIDER_CHAT, request);
  },
  cancelProviderChat: (requestId: string): Promise<boolean> => {
    return ipcRenderer.invoke(MODEL_CHANNELS.CANCEL_PROVIDER_CHAT, requestId);
  },
  onProviderStream: (callback: (event: ModelStreamEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: ModelStreamEvent) => {
      callback(data);
    };
    ipcRenderer.on(MODEL_CHANNELS.PROVIDER_STREAM, listener);
    return () => {
      ipcRenderer.removeListener(MODEL_CHANNELS.PROVIDER_STREAM, listener);
    };
  },
};

// Expose safe, allowlisted API to renderer window as window.desktop
contextBridge.exposeInMainWorld('desktop', desktopAPI);
