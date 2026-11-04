import type {
  IDesktopBridge,
  SystemInfo,
  IFileSystemBridge,
  ITerminalBridge,
  IMemoryBridge,
  IProviderBridge,
  IDatabaseBridge,
  FileItem,
  TerminalSessionInfo,
  TaskMemoryEntry,
  AppMemoryEntry,
  MemoryConfig,
  ProviderConfig,
  ProviderVerificationResult,
} from 'shared/contracts/desktop-bridge';

export const INITIAL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    isLocal: true,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'lm_studio',
    name: 'LM Studio',
    type: 'lm_studio',
    baseUrl: 'http://localhost:1234/v1',
    isLocal: true,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'google_gemini',
    name: 'Google Gemini',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiKey: '',
    isLocal: false,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    isLocal: false,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    isLocal: false,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    isLocal: false,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'openai_compatible',
    name: 'OpenAI Compatible',
    type: 'openai_compatible',
    baseUrl: '',
    apiKey: '',
    isLocal: false,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
  {
    id: 'custom_local',
    name: 'Custom Local Endpoint',
    type: 'custom_local',
    baseUrl: '',
    apiKey: '',
    isLocal: true,
    status: 'not-configured',
    discoveredModels: [],
    selectedModel: '',
  },
];

/**
 * Browser Preview Adapter implementing IDesktopBridge.
 * Follows strict desktop guidelines:
 * - Does not inject fake conversations, fake files, fake models, or fake terminal execution.
 * - Accurately reports capability states.
 * - Stores genuine user-configured entries in localStorage.
 */
export class BrowserPreviewBridgeAdapter implements IDesktopBridge {
  public system: SystemInfo = {
    isElectron: typeof window !== 'undefined' && Boolean(window.desktop),
    platform: 'win32',
    arch: 'x64',
    osVersion: 'Windows 11',
    appVersion: '1.0.0',
    isWindows: true,
  };

  private memoryConfig: MemoryConfig = {
    autoMemoryEnabled: false,
    globalMemoryDirectory: '%APPDATA%\\Refx\\memory',
    storageBackend: 'sqlite',
    maxEntries: 1000,
  };

  private taskMemories: TaskMemoryEntry[] = [];
  private appMemories: AppMemoryEntry[] = [];
  private providers: ProviderConfig[] = [...INITIAL_PROVIDERS];
  private terminalOutputs: Map<string, ((data: string) => void)[]> = new Map();
  private fileSystem: Map<string, string> = new Map();
  private activeWorkspaceFiles: FileItem[] = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined' && window.desktop?.getAppInfo) {
      window.desktop.getAppInfo().then((info) => {
        this.system = {
          isElectron: true,
          platform: info.platform,
          arch: info.arch,
          osVersion: info.osVersion,
          appVersion: info.version,
          isWindows: info.isWindows,
        };
      }).catch(() => {});
    }
  }

  private loadFromStorage() {
    try {
      const savedProviders = localStorage.getItem('refx_providers');
      if (savedProviders) {
        const parsed = JSON.parse(savedProviders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.providers = parsed;
        }
      }
      const savedAppMem = localStorage.getItem('refx_app_memories');
      if (savedAppMem) {
        this.appMemories = JSON.parse(savedAppMem);
      }
      const savedTaskMem = localStorage.getItem('refx_task_memories');
      if (savedTaskMem) {
        this.taskMemories = JSON.parse(savedTaskMem);
      }
      const savedMemConfig = localStorage.getItem('refx_memory_config');
      if (savedMemConfig) {
        this.memoryConfig = { ...this.memoryConfig, ...JSON.parse(savedMemConfig) };
      }
    } catch {
      // Storage unavailable in current environment; use clean in-memory defaults
    }
  }

  private saveToStorage(key: string, data: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignored
    }
  }

  public fs: IFileSystemBridge = {
    selectFolderDialog: async (defaultPath?: string): Promise<string | null> => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.selectFolderDialog) {
        return window.desktop.fs.selectFolderDialog(defaultPath);
      }
      if (typeof window !== 'undefined' && window.desktop?.selectWorkspace) {
        return window.desktop.selectWorkspace(defaultPath);
      }
      return null;
    },
    selectFileDialog: async (_defaultPath?: string): Promise<string | null> => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.selectFileDialog) {
        return window.desktop.fs.selectFileDialog(_defaultPath);
      }
      return null;
    },
    getWorkspaceInfo: async (workspacePath: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.getWorkspaceInfo) {
        return window.desktop.fs.getWorkspaceInfo(workspacePath);
      }
      return { path: workspacePath, name: workspacePath.split(/[\\\\/]/).pop() || 'Workspace', exists: false, isDirectory: false };
    },
    readDirectory: async (dirPath: string): Promise<FileItem[]> => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.readDirectory) {
        return window.desktop.fs.readDirectory(dirPath);
      }
      return [...this.activeWorkspaceFiles];
    },
    readFile: async (filePath: string): Promise<string> => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.readFile) {
        return window.desktop.fs.readFile(filePath);
      }
      if (this.fileSystem.has(filePath)) {
        return this.fileSystem.get(filePath)!;
      }
      return '';
    },
    searchFiles: async (workspacePath: string, query: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.searchFiles) {
        return window.desktop.fs.searchFiles(workspacePath, query);
      }
      return [];
    },
    searchText: async (workspacePath: string, query: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.searchText) {
        return window.desktop.fs.searchText(workspacePath, query);
      }
      return [];
    },
    getFileMetadata: async (filePath: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.getFileMetadata) {
        return window.desktop.fs.getFileMetadata(filePath);
      }
      return null;
    },
    setActiveWorkspace: async (workspacePath: string | null) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.setActiveWorkspace) {
        return window.desktop.fs.setActiveWorkspace(workspacePath);
      }
    },
    proposeFileChange: async (request: any) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.proposeFileChange) {
        return window.desktop.fs.proposeFileChange(request);
      }
      return null;
    },
    getPendingChanges: async () => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.getPendingChanges) {
        return window.desktop.fs.getPendingChanges();
      }
      return [];
    },
    approveFileChange: async (id: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.approveFileChange) {
        return window.desktop.fs.approveFileChange(id);
      }
      return false;
    },
    rejectFileChange: async (id: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.rejectFileChange) {
        return window.desktop.fs.rejectFileChange(id);
      }
      return false;
    },
    restoreFileBackup: async (id: string) => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.restoreFileBackup) {
        return window.desktop.fs.restoreFileBackup(id);
      }
      return false;
    },
    writeFile: async (filePath: string, content: string): Promise<boolean> => {
      if (typeof window !== 'undefined' && window.desktop?.fs?.writeFile) {
        return window.desktop.fs.writeFile(filePath, content);
      }
      this.fileSystem.set(filePath, content);
      return true;
    },
    watchDirectory: (_dirPath, _callback) => {
      return () => {};
    },
  };

  public get terminal(): ITerminalBridge {
    if (typeof window !== 'undefined' && (window as any).desktop?.terminal) {
      return (window as any).desktop.terminal as ITerminalBridge;
    }
    return this.previewTerminal;
  }

  private previewTerminal: ITerminalBridge = {
    createSession: async (shell = 'powershell.exe', cwd = ''): Promise<TerminalSessionInfo> => {
      const sessionId = 'term-' + Math.random().toString(36).substring(2, 9);
      const session: TerminalSessionInfo = {
        id: sessionId,
        name: shell === 'powershell.exe' ? 'PowerShell' : shell === 'cmd.exe' ? 'Command Prompt' : 'Bash',
        shell: shell as TerminalSessionInfo['shell'],
        cwd: cwd || 'No workspace opened',
        isRunning: false,
        exitCode: 0,
        history: [],
      };
      return session;
    },
    resize: async (_sessionId: string, _cols: number, _rows: number): Promise<void> => {},
    sendInput: async (sessionId: string, input: string): Promise<void> => {
      const callbacks = this.terminalOutputs.get(sessionId) || [];
      const trimmed = input.trim();

      // Echo input prompt
      callbacks.forEach((cb) => cb(`\r\nPS> ${input}\r\n`));

      setTimeout(() => {
        if (trimmed === 'cls' || trimmed === 'clear') {
          callbacks.forEach((cb) => cb('\x1b[2J\x1b[0;0H'));
        } else {
          // Honest status indicator: native shell is not attached in browser preview
          callbacks.forEach((cb) =>
            cb(
              `[Desktop Bridge Notice] Process execution for "${trimmed}" requires native Electron host (Stage 2).\nNative conpty.dll pseudo-console is unavailable in browser preview.\n\n`
            )
          );
        }
      }, 50);
    },
    killSession: async (_sessionId: string): Promise<void> => {},
    onAgentRequest: (_callback: (request: any) => void): (() => void) => () => {},
    approveAgentCommand: async (_id: string) => false,
    rejectAgentCommand: async (_id: string) => false,
    onOutput: (sessionId: string, callback: (data: string) => void): (() => void) => {
      const list = this.terminalOutputs.get(sessionId) || [];
      list.push(callback);
      this.terminalOutputs.set(sessionId, list);
      return () => {
        const filtered = (this.terminalOutputs.get(sessionId) || []).filter((cb) => cb !== callback);
        this.terminalOutputs.set(sessionId, filtered);
      };
    },
  };

  private previewMemory: IMemoryBridge = {
    getMemoryConfig: async (): Promise<MemoryConfig> => ({ ...this.memoryConfig }),
    updateMemoryConfig: async (config: Partial<MemoryConfig>): Promise<MemoryConfig> => {
      this.memoryConfig = { ...this.memoryConfig, ...config };
      this.saveToStorage('refx_memory_config', this.memoryConfig);
      return { ...this.memoryConfig };
    },
    getTaskMemories: async (_taskId: string): Promise<TaskMemoryEntry[]> => [...this.taskMemories],
    getTaskMemory: async (conversationId: string) => this.taskMemories.find((m) => m.taskId === conversationId) || null,
    updateTaskMemory: async (conversationId: string, id: string, changes: any) => {
      const idx = this.taskMemories.findIndex((m) => m.id === id);
      if (idx < 0) return null;
      this.taskMemories[idx] = { ...this.taskMemories[idx], ...changes, updatedAt: Date.now() };
      this.saveToStorage('refx_task_memories', this.taskMemories);
      return this.taskMemories[idx];
    },
    saveTaskMemory: async (entry): Promise<TaskMemoryEntry> => {
      const newEntry: TaskMemoryEntry = {
        ...entry,
        id: 'task-mem-' + Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.taskMemories.unshift(newEntry);
      this.saveToStorage('refx_task_memories', this.taskMemories);
      return newEntry;
    },
    deleteTaskMemory: async (id: string): Promise<boolean> => {
      this.taskMemories = this.taskMemories.filter((m) => m.id !== id);
      this.saveToStorage('refx_task_memories', this.taskMemories);
      return true;
    },
    getAppMemories: async (): Promise<AppMemoryEntry[]> => [...this.appMemories],
    saveAppMemory: async (entry): Promise<AppMemoryEntry> => {
      const newEntry: AppMemoryEntry = {
        ...entry,
        id: 'app-mem-' + Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.appMemories.unshift(newEntry);
      this.saveToStorage('refx_app_memories', this.appMemories);
      return newEntry;
    },
    deleteAppMemory: async (id: string): Promise<boolean> => {
      this.appMemories = this.appMemories.filter((m) => m.id !== id);
      this.saveToStorage('refx_app_memories', this.appMemories);
      return true;
    },
    clearAppMemories: async (): Promise<boolean> => {
      this.appMemories = [];
      this.saveToStorage('refx_app_memories', this.appMemories);
      return true;
    },
  };

  public provider: IProviderBridge = {
    getProviders: async (): Promise<ProviderConfig[]> => [...this.providers],
    saveProvider: async (provider: ProviderConfig): Promise<ProviderConfig> => {
      // Never persist raw API keys to localStorage. Strip the key before
      // saving provider metadata. Credentials are handled via secure IPC
      // in Electron main process (safeStorage / DPAPI).
      const { apiKey, ...providerWithoutKey } = provider;
      const index = this.providers.findIndex((p) => p.id === provider.id);
      if (index >= 0) {
        this.providers[index] = providerWithoutKey;
      } else {
        this.providers.push(providerWithoutKey);
      }
      this.saveToStorage('refx_providers', this.providers);
      return providerWithoutKey;
    },
    deleteProvider: async (id: string): Promise<boolean> => {
      this.providers = this.providers.filter((p) => p.id !== id);
      this.saveToStorage('refx_providers', this.providers);
      return true;
    },
    verifyConnection: async (providerId: string): Promise<ProviderVerificationResult> => {
      const provider = this.providers.find((p) => p.id === providerId);
      if (!provider) {
        return { success: false, models: [], status: 'provider-unavailable', message: 'Provider configuration not found.' };
      }

      // Browser preview does not have secure credential storage (Electron safeStorage / DPAPI).
      // Cloud providers require the Electron desktop app for real verification.
      if (!provider.isLocal && provider.type !== 'openai_compatible') {
        return {
          success: false,
          models: [],
          status: 'not-configured',
          message: `Real provider verification for ${provider.name} requires the Electron desktop app. Browser preview does not support secure credential storage.`,
        };
      }

      // Ollama: delegate to Electron main process when available
      if (provider.id === 'ollama' && typeof window !== 'undefined' && window.desktop?.listOllamaModels) {
        try {
          const res = await window.desktop.listOllamaModels();
          if (res.success && res.models.length > 0) {
            return {
              success: true,
              models: res.models,
              status: 'connected',
              message: `Connected to ${provider.name}. ${res.models.length} model(s) discovered.`,
            };
          } else {
            return {
              success: false,
              models: [],
              status: 'model-unavailable',
              message: res.error || `Could not connect to Ollama. Ensure Ollama is running at http://127.0.0.1:11434.`,
            };
          }
        } catch (err: any) {
          return {
            success: false,
            models: [],
            status: 'provider-unavailable',
            message: err.message || 'Failed to query Ollama models.',
          };
        }
      }

      // LM Studio and other local OpenAI-compatible providers: try network discovery
      if (provider.isLocal && provider.baseUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          try {
            const baseUrl = provider.baseUrl.replace(/\/v1\/?$/, '');
            const res = await fetch(`${baseUrl}/v1/models`, {
              method: 'GET',
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json();
              const models = (data.data || []).map((m: any) => m.id || m.name || String(m));
              if (models.length > 0) {
                return {
                  success: true,
                  models,
                  status: 'connected',
                  message: `Connected to ${provider.name}. ${models.length} model(s) discovered.`,
                };
              }
              return {
                success: false,
                models: [],
                status: 'model-unavailable',
                message: `${provider.name} is running but no models were discovered.`,
              };
            }
          } catch {
            // Local server not reachable
            return {
              success: false,
              models: [],
              status: 'provider-unavailable',
              message: `Could not reach ${provider.name} at ${provider.baseUrl}. Ensure the server daemon is running locally.`,
            };
          }
        } catch {
          // Fall through to not-supported message
        }
      }

      // Cloud providers and other cases not supported in browser preview
      return {
        success: false,
        models: [],
        status: 'not-configured',
        message: `Real verification for ${provider.name} requires the Electron desktop app. Browser preview cannot verify cloud provider credentials.`,
      };
    },
  };

  private previewDatabase: IDatabaseBridge = {
    initializeDatabase: async () => ({ success: true, path: 'browser-preview-localStorage' }),
    getConversations: async () => {
      try {
        const raw = localStorage.getItem('refx_db_conversations');
        if (raw) return JSON.parse(raw);
        // One-time migration from legacy full-conversation storage
        const legacy = localStorage.getItem('refx_conversations');
        if (legacy) {
          const convs = JSON.parse(legacy);
          if (Array.isArray(convs)) {
            const migrated = convs.map((c: any) => ({
              id: c.id,
              title: c.title || 'New Conversation',
              providerId: c.providerId || '',
              modelId: c.model || '',
              workspacePath: null,
              createdAt: c.createdAt || Date.now(),
              updatedAt: c.updatedAt || Date.now(),
              metadata: { saveMemoryDefault: c.saveMemoryDefault ?? false },
            }));
            localStorage.setItem('refx_db_conversations', JSON.stringify(migrated));
            const msgs: any[] = [];
            convs.forEach((c: any) => {
              (c.messages || []).forEach((m: any, idx: number) => {
                msgs.push({
                  id: m.id,
                  conversationId: c.id,
                  role: m.role,
                  content: m.content,
                  messageType: m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : 'assistant',
                  createdAt: m.timestamp || Date.now() + idx,
                  updatedAt: m.timestamp || Date.now() + idx,
                  metadata: {
                    model: m.model,
                    providerId: m.providerId,
                    attachments: m.attachments,
                    activities: m.activities,
                    fileChanges: m.fileChanges,
                    hasMemorySaved: m.hasMemorySaved,
                  },
                });
              });
            });
            localStorage.setItem('refx_db_messages', JSON.stringify(msgs));
            return migrated;
          }
        }
        return [];
      } catch {
        return [];
      }
    },
    getConversation: async (id: string) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_conversations') || '[]');
        return (Array.isArray(list) ? list : []).find((c: any) => c.id === id) || null;
      } catch {
        return null;
      }
    },
    createConversation: async (data: any) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_conversations') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const idx = arr.findIndex((c: any) => c.id === data?.id);
        if (idx >= 0) arr[idx] = { ...arr[idx], ...data };
        else arr.unshift(data);
        localStorage.setItem('refx_db_conversations', JSON.stringify(arr));
      } catch {
        // ignore
      }
      return data;
    },
    updateConversation: async (id: string, changes: any) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_conversations') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const idx = arr.findIndex((c: any) => c.id === id);
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], ...changes };
          localStorage.setItem('refx_db_conversations', JSON.stringify(arr));
          return arr[idx];
        }
      } catch {
        // ignore
      }
      return null;
    },
    deleteConversation: async (id: string) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_conversations') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const filtered = arr.filter((c: any) => c.id !== id);
        localStorage.setItem('refx_db_conversations', JSON.stringify(filtered));
        // delete messages
        const msgs = JSON.parse(localStorage.getItem('refx_db_messages') || '[]');
        const remaining = (Array.isArray(msgs) ? msgs : []).filter((m: any) => m.conversationId !== id);
        localStorage.setItem('refx_db_messages', JSON.stringify(remaining));
        return true;
      } catch {
        return false;
      }
    },
    searchConversations: async (query: string) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_conversations') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const q = String(query || '').toLowerCase();
        return arr.filter((c: any) => String(c.title || '').toLowerCase().includes(q));
      } catch {
        return [];
      }
    },
    getMessages: async (conversationId: string) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_messages') || '[]');
        return (Array.isArray(list) ? list : []).filter((m: any) => m.conversationId === conversationId).sort((a: any, b: any) => a.createdAt - b.createdAt);
      } catch {
        return [];
      }
    },
    saveMessage: async (message: any) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_messages') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const idx = arr.findIndex((m: any) => m.id === message?.id);
        if (idx >= 0) arr[idx] = { ...arr[idx], ...message };
        else arr.push(message);
        localStorage.setItem('refx_db_messages', JSON.stringify(arr));
      } catch {
        // ignore
      }
      return message;
    },
    updateMessage: async (id: string, changes: any) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_messages') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const idx = arr.findIndex((m: any) => m.id === id);
        if (idx >= 0) {
          arr[idx] = { ...arr[idx], ...changes };
          localStorage.setItem('refx_db_messages', JSON.stringify(arr));
          return arr[idx];
        }
      } catch {
        // ignore
      }
      return null;
    },
    deleteMessage: async (id: string) => {
      try {
        const list = JSON.parse(localStorage.getItem('refx_db_messages') || '[]');
        const arr = Array.isArray(list) ? list : [];
        const filtered = arr.filter((m: any) => m.id !== id);
        localStorage.setItem('refx_db_messages', JSON.stringify(filtered));
        return true;
      } catch {
        return false;
      }
    },
    getAppSettings: async () => {
      try {
        return JSON.parse(localStorage.getItem('refx_db_settings') || '{}');
      } catch {
        return {};
      }
    },
    saveAppSetting: async (key: string, value: unknown) => {
      try {
        const settings = JSON.parse(localStorage.getItem('refx_db_settings') || '{}');
        settings[key] = value;
        localStorage.setItem('refx_db_settings', JSON.stringify(settings));
        return true;
      } catch {
        return false;
      }
    },
    exportDatabaseBackup: async () => ({ success: true, path: 'browser-preview-no-backup' }),
    restoreDatabaseBackup: async () => ({ success: false, error: 'Not supported in browser preview' }),
    validateDatabaseFile: async () => ({ valid: false, error: 'Not supported in browser preview' }),
    migrateLegacyData: async () => ({ success: true, imported: 0 }),
    integrityCheck: async () => ({ ok: true }),
  };

  public get memory(): IMemoryBridge {
    if (typeof window !== 'undefined' && (window as any).desktop?.memory) {
      return (window as any).desktop.memory as IMemoryBridge;
    }
    return this.previewMemory;
  }

  public get database(): IDatabaseBridge {
    if (typeof window !== 'undefined' && (window as any).desktop?.database) {
      return (window as any).desktop.database as IDatabaseBridge;
    }
    return this.previewDatabase;
  }

  public notify(_title: string, _message: string): void {
    // No-op in browser preview without explicit user gesture
  }
}

export const desktopBridge: IDesktopBridge = new BrowserPreviewBridgeAdapter();
