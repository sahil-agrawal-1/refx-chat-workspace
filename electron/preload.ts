import { contextBridge, ipcRenderer } from 'electron';
import type {
  DesktopAppInfo,
  IDesktopAPI,
  IDatabaseBridge,
  OllamaCheckResult,
  OllamaModelsResult,
  OllamaChatMessage,
  OllamaStreamEvent,
  ModelInferenceRequest,
  ModelInferenceResult,
  ModelStreamEvent,
  ProviderConfig,
  ProviderVerificationResult,
} from '../shared/contracts/desktop-bridge';
import { DATABASE_IPC_CHANNELS, FILESYSTEM_IPC_CHANNELS } from '../shared/contracts/desktop-bridge';

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

const CREDENTIAL_CHANNELS = {
  SAVE_CREDENTIAL: 'desktop:saveCredential',
  DELETE_CREDENTIAL: 'desktop:deleteCredential',
  HAS_CREDENTIAL: 'desktop:hasCredential',
  MIGRATE_CREDENTIAL: 'desktop:migrateCredential',
} as const;

const DB_CHANNELS = DATABASE_IPC_CHANNELS;
const FS_CHANNELS = FILESYSTEM_IPC_CHANNELS;

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
  verifyProvider: (config: ProviderConfig): Promise<ProviderVerificationResult> => {
    return ipcRenderer.invoke(MODEL_CHANNELS.VERIFY_PROVIDER, config);
  },
  startProviderChat: (request: ModelInferenceRequest): Promise<ModelInferenceResult> => {
    return ipcRenderer.invoke(MODEL_CHANNELS.START_PROVIDER_CHAT, request);
  },
  cancelProviderChat: (requestId: string): Promise<boolean> => {
    return ipcRenderer.invoke(MODEL_CHANNELS.CANCEL_PROVIDER_CHAT, requestId);
  },
  // Secure credential management (credentials never returned to renderer)
  saveCredential: (providerId: string, apiKey: string): Promise<boolean> => {
    return ipcRenderer.invoke(CREDENTIAL_CHANNELS.SAVE_CREDENTIAL, { providerId, apiKey });
  },
  deleteCredential: (providerId: string): Promise<boolean> => {
    return ipcRenderer.invoke(CREDENTIAL_CHANNELS.DELETE_CREDENTIAL, { providerId });
  },
  hasCredential: (providerId: string): Promise<boolean> => {
    return ipcRenderer.invoke(CREDENTIAL_CHANNELS.HAS_CREDENTIAL, { providerId });
  },
  migrateCredential: (providerId: string, apiKey: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(CREDENTIAL_CHANNELS.MIGRATE_CREDENTIAL, { providerId, apiKey });
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
  fs: {
    selectFolderDialog: (defaultPath?: string) => ipcRenderer.invoke(IPC_CHANNELS.SELECT_WORKSPACE, defaultPath),
    selectFileDialog: async (_defaultPath?: string) => null,
    getWorkspaceInfo: (workspacePath: string) => ipcRenderer.invoke(FS_CHANNELS.GET_WORKSPACE_INFO, workspacePath),
    readDirectory: (dirPath: string) => ipcRenderer.invoke(FS_CHANNELS.READ_DIRECTORY, dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke(FS_CHANNELS.READ_FILE, filePath),
    searchFiles: (workspacePath: string, query: string) => ipcRenderer.invoke(FS_CHANNELS.SEARCH_FILES, workspacePath, query),
    searchText: (workspacePath: string, query: string) => ipcRenderer.invoke(FS_CHANNELS.SEARCH_TEXT, workspacePath, query),
    getFileMetadata: (filePath: string) => ipcRenderer.invoke(FS_CHANNELS.GET_FILE_METADATA, filePath),
    proposeFileChange: (request: any) => ipcRenderer.invoke(FS_CHANNELS.PROPOSE_CHANGE, request),
    getPendingChanges: () => ipcRenderer.invoke(FS_CHANNELS.GET_PENDING_CHANGES),
    approveFileChange: (id: string) => ipcRenderer.invoke(FS_CHANNELS.APPROVE_CHANGE, id),
    rejectFileChange: (id: string) => ipcRenderer.invoke(FS_CHANNELS.REJECT_CHANGE, id),
    restoreFileBackup: (id: string) => ipcRenderer.invoke(FS_CHANNELS.RESTORE_BACKUP, id),
    writeFile: async () => false,
    watchDirectory: () => () => {},
  },
  database: {
    initializeDatabase: () => ipcRenderer.invoke(DB_CHANNELS.INITIALIZE),
    getConversations: () => ipcRenderer.invoke(DB_CHANNELS.GET_CONVERSATIONS),
    getConversation: (id: string) => ipcRenderer.invoke(DB_CHANNELS.GET_CONVERSATION, id),
    createConversation: (data: any) => ipcRenderer.invoke(DB_CHANNELS.CREATE_CONVERSATION, data),
    updateConversation: (id: string, changes: any) => ipcRenderer.invoke(DB_CHANNELS.UPDATE_CONVERSATION, id, changes),
    deleteConversation: (id: string) => ipcRenderer.invoke(DB_CHANNELS.DELETE_CONVERSATION, id),
    searchConversations: (query: string) => ipcRenderer.invoke(DB_CHANNELS.SEARCH_CONVERSATIONS, query),
    getMessages: (conversationId: string) => ipcRenderer.invoke(DB_CHANNELS.GET_MESSAGES, conversationId),
    saveMessage: (message: any) => ipcRenderer.invoke(DB_CHANNELS.SAVE_MESSAGE, message),
    updateMessage: (id: string, changes: any) => ipcRenderer.invoke(DB_CHANNELS.UPDATE_MESSAGE, id, changes),
    deleteMessage: (id: string) => ipcRenderer.invoke(DB_CHANNELS.DELETE_MESSAGE, id),
    getAppSettings: () => ipcRenderer.invoke(DB_CHANNELS.GET_SETTINGS),
    saveAppSetting: (key: string, value: unknown) => ipcRenderer.invoke(DB_CHANNELS.SAVE_SETTING, key, value),
    exportDatabaseBackup: () => ipcRenderer.invoke(DB_CHANNELS.EXPORT_BACKUP),
    restoreDatabaseBackup: (filePath: string) => ipcRenderer.invoke(DB_CHANNELS.RESTORE_BACKUP, filePath),
    validateDatabaseFile: (filePath: string) => ipcRenderer.invoke(DB_CHANNELS.VALIDATE_BACKUP, filePath),
    migrateLegacyData: (payload: any) => ipcRenderer.invoke(DB_CHANNELS.MIGRATE_LEGACY, payload),
    integrityCheck: () => ipcRenderer.invoke(DB_CHANNELS.INTEGRITY_CHECK),
  } as IDatabaseBridge,
};

// Expose safe, allowlisted API to renderer window as window.desktop
contextBridge.exposeInMainWorld('desktop', desktopAPI);
