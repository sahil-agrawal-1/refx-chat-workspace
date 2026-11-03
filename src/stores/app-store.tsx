import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Conversation,
  ChatMessage,
  ProjectWorkspace,
  ProviderConfig,
  ProviderVerificationResult,
  FileItem,
  FileChange,
  TaskMemoryEntry,
  AppMemoryEntry,
  MemoryConfig,
  TerminalSessionInfo,
  PermissionRequest,
  ActiveModal,
  ActiveDrawer,
  MessageAttachment,
} from '@/types';
import { desktopBridge } from '@/desktop/browser-preview-bridge';

interface AppContextValue {
  // Navigation & UI Layout
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeModal: ActiveModal;
  openModal: (modal: ActiveModal) => void;
  closeModal: () => void;
  activeDrawer: ActiveDrawer;
  toggleDrawer: (drawer: ActiveDrawer) => void;
  bottomPanel: 'terminal' | 'diff' | 'timeline' | null;
  setBottomPanel: (panel: 'terminal' | 'diff' | 'timeline' | null) => void;

  // Conversations & Chat
  conversations: Conversation[];
  currentConversation: Conversation | null;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string, attachments?: MessageAttachment[]) => Promise<void>;
  isGenerating: boolean;
  stopGeneration: () => void;

  // Models & Providers
  providers: ProviderConfig[];
  selectedProvider: ProviderConfig | null;
  selectedModel: string;
  setSelectedModel: (model: string, providerId?: string) => void;
  saveProviderConfig: (provider: ProviderConfig) => Promise<void>;
  verifyProviderConnection: (providerId: string) => Promise<ProviderVerificationResult>;

  // Workspaces & File Explorer
  selectedWorkspace: ProjectWorkspace | null;
  recentWorkspaces: ProjectWorkspace[];
  fileTree: FileItem[];
  selectedFile: string | null;
  selectFile: (path: string | null) => void;
  openWorkspaceDialog: () => Promise<void>;
  setWorkspace: (ws: ProjectWorkspace | null) => void;

  // File Changes & Diff Reviews
  pendingChanges: FileChange[];
  activeDiffFile: FileChange | null;
  setActiveDiffFile: (change: FileChange | null) => void;
  approveChange: (filePath: string) => void;
  rejectChange: (filePath: string) => void;
  approveAllChanges: () => void;

  // Memory
  saveMemoryActive: boolean;
  setSaveMemoryActive: (active: boolean) => void;
  taskMemories: TaskMemoryEntry[];
  appMemories: AppMemoryEntry[];
  memoryConfig: MemoryConfig;
  addTaskMemory: (title: string, content: string, tags?: string[]) => Promise<void>;
  deleteTaskMemory: (id: string) => Promise<void>;
  addAppMemory: (category: AppMemoryEntry['category'], title: string, summary: string, details: string) => Promise<void>;
  deleteAppMemory: (id: string) => Promise<void>;
  toggleAppMemory: (id: string) => Promise<void>;
  clearAppMemories: () => Promise<void>;
  updateMemoryConfig: (config: Partial<MemoryConfig>) => Promise<void>;

  // Terminal
  terminalSessions: TerminalSessionInfo[];
  activeTerminalId: string | null;
  setActiveTerminalId: (id: string) => void;
  terminalLogs: Record<string, string>;
  executeTerminalCommand: (cmd: string) => Promise<void>;
  createNewTerminalSession: (shell?: string) => Promise<void>;
  clearTerminalLogs: () => void;

  // Permissions & Security
  pendingPermission: PermissionRequest | null;
  resolvePermission: (granted: boolean) => void;
  requestPermission: (request: Omit<PermissionRequest, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;

  // Bridge info & Status
  isElectron: boolean;
  systemPlatform: string;
  notification: { title: string; message: string; type: 'info' | 'success' | 'warning' } | null;
  dismissNotification: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [bottomPanel, setBottomPanel] = useState<'terminal' | 'diff' | 'timeline' | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
  } | null>(null);

  const dismissNotification = () => setNotification(null);

  // Conversations (Clean start with no fake conversations)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('refx_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('refx_conversations');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch {
      return null;
    }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const activeRequestIdRef = useRef<string | null>(null);
  const streamUnsubscribeRef = useRef<(() => void) | null>(null);

  // Providers & Models
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedModel, setSelectedModelInternal] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  // Workspaces (No hardcoded fake projects)
  const [selectedWorkspace, setSelectedWorkspace] = useState<ProjectWorkspace | null>(() => {
    try {
      const saved = localStorage.getItem('refx_active_workspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [recentWorkspaces, setRecentWorkspaces] = useState<ProjectWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem('refx_recent_workspaces');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Pending File Modifications (Empty by default)
  const [pendingChanges, setPendingChanges] = useState<FileChange[]>([]);
  const [activeDiffFile, setActiveDiffFile] = useState<FileChange | null>(null);

  // Memory System (Empty by default)
  const [saveMemoryActive, setSaveMemoryActive] = useState<boolean>(false);
  const [taskMemories, setTaskMemories] = useState<TaskMemoryEntry[]>([]);
  const [appMemories, setAppMemories] = useState<AppMemoryEntry[]>([]);
  const [memoryConfig, setMemoryConfig] = useState<MemoryConfig>({
    autoMemoryEnabled: false,
    globalMemoryDirectory: '%APPDATA%\\Antigravity\\memory',
    storageBackend: 'sqlite',
    maxEntries: 1000,
  });

  // Terminal (Clean initial state)
  const [terminalSessions, setTerminalSessions] = useState<TerminalSessionInfo[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<Record<string, string>>({});

  // Security Permissions
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [permissionResolver, setPermissionResolver] = useState<((granted: boolean) => void) | null>(null);

  // Electron detection state
  const [isElectron, setIsElectron] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(window.desktop);
  });

  // Save conversations to storage
  useEffect(() => {
    try {
      localStorage.setItem('refx_conversations', JSON.stringify(conversations));
    } catch {
      // Ignored
    }
  }, [conversations]);

  // Load provider & bridge configuration
  useEffect(() => {
    async function initBridgeData() {
      if (typeof window !== 'undefined' && window.desktop?.getAppInfo) {
        window.desktop.getAppInfo().then((info) => {
          setIsElectron(info.isElectron);
        }).catch(() => {});
      }

      const provs = await desktopBridge.provider.getProviders();
      let activeProvs = provs;

      // No auto-detection of Ollama or any other provider on startup.
      // Providers remain in their configured state until the user explicitly
      // verifies and connects them. No provider is mandatory.
      setProviders(provs);

      // Do not auto-select any provider. The user chooses which provider
      // to use via the Model Providers modal. No provider is mandatory.

      // Migrate any existing plaintext API keys from localStorage to secure
      // Electron safeStorage. Migration is explicit: only after the main
      // process confirms encrypted storage do we remove plaintext from
      // localStorage. Never silently discard credentials.
      if (typeof window !== 'undefined' && window.desktop?.migrateCredential) {
        for (const prov of activeProvs) {
          if (prov.apiKey) {
            const result = await window.desktop.migrateCredential(prov.id, prov.apiKey);
            if (result.success) {
              // Remove plaintext key from localStorage provider config
              await desktopBridge.provider.saveProvider({ ...prov, apiKey: undefined });
              setProviders((prev) =>
                prev.map((p) => (p.id === prov.id ? { ...p, apiKey: undefined } : p))
              );
            }
            // If migration fails, we intentionally keep the plaintext key
            // in localStorage rather than silently discarding it.
          }
        }
      }

      // Load memories
      const tMem = await desktopBridge.memory.getTaskMemories('default-task');
      setTaskMemories(tMem);
      const aMem = await desktopBridge.memory.getAppMemories();
      setAppMemories(aMem);
      const mCfg = await desktopBridge.memory.getMemoryConfig();
      setMemoryConfig(mCfg);

      // Create an initial session if workspace or requested
      const session = await desktopBridge.terminal.createSession(
        'powershell.exe',
        selectedWorkspace?.path || 'No workspace opened'
      );
      setTerminalSessions([session]);
      setActiveTerminalId(session.id);

      desktopBridge.terminal.onOutput(session.id, (data) => {
        setTerminalLogs((prev) => ({
          ...prev,
          [session.id]: (prev[session.id] || '') + data,
        }));
      });

      setTerminalLogs((prev) => ({
        ...prev,
        [session.id]: `Windows Terminal Session (${session.name})\n[Preview Mode] Native ConPTY requires Electron host (Stage 2).\n\n`,
      }));
    }

    initBridgeData();
  }, [selectedWorkspace]);

  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || (conversations.length > 0 ? conversations[0] : null);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId) || null;

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);
  const openModal = (modal: ActiveModal) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);
  const toggleDrawer = (drawer: ActiveDrawer) => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));
  };

  const startNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: 'conv-' + Date.now(),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel || 'No model connected',
      providerId: selectedProviderId || '',
      saveMemoryDefault: saveMemoryActive,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
  }, [selectedModel, selectedProviderId, saveMemoryActive]);

  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (currentConversationId === id) {
        setCurrentConversationId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const setSelectedModel = (model: string, providerId?: string) => {
    setSelectedModelInternal(model);
    if (providerId) {
      setSelectedProviderId(providerId);
    }
  };

  const saveProviderConfig = async (provider: ProviderConfig) => {
    // Never persist the raw API key to localStorage. Strip it before saving
    // the provider metadata, then send the key to the main process for
    // encrypted storage via Electron safeStorage (Windows DPAPI).
    //
    // ORDER MATTERS: Save the credential to secure storage FIRST. Only if
    // that succeeds do we save provider metadata (without key) to localStorage.
    // This prevents a restart from leaving a provider configured with no key.
    const { apiKey, ...providerWithoutKey } = provider;

    // Persist the credential securely in the main process first.
    // If encryption is unavailable or the write fails, fail securely —
    // do not fall back to plaintext, and do not save provider metadata.
    if (apiKey) {
      let saved = false;
      try {
        const result = await window.desktop?.saveCredential?.(provider.id, apiKey);
        saved = result === true;
      } catch {
        saved = false;
      }
      if (!saved) {
        setNotification({
          title: 'Credential Storage Failed',
          message: 'Encryption is unavailable or the credential file could not be written. API key was not saved.',
          type: 'warning',
        });
        return;
      }
    }

    // Save provider metadata (without API key) to localStorage.
    const updated = await desktopBridge.provider.saveProvider(providerWithoutKey);
    // Preserve the API key in the in-memory provider state (but it is NOT
    // persisted to localStorage — it goes to Electron safeStorage via IPC).
    setProviders((prev) => prev.map((p) => (p.id === updated.id ? { ...updated, apiKey: provider.apiKey } : p)));

    setNotification({
      title: 'Configuration Saved',
      message: `${provider.name} settings updated.`,
      type: 'info',
    });
  };

  const verifyProviderConnection = async (providerId: string) => {
    // Use Electron IPC when available for real provider verification
    if (typeof window !== 'undefined' && window.desktop?.verifyProvider) {
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) {
        const res: ProviderVerificationResult = {
          success: false,
          models: [],
          status: 'provider-unavailable',
          message: 'Provider not found.',
        };
        setProviders((prev) =>
          prev.map((p) =>
            p.id === providerId ? { ...p, status: res.status, errorMessage: res.message } : p
          )
        );
        return res;
      }
      // Never send the API key through IPC — main process retrieves it
      // internally from safeStorage. Strip apiKey before sending.
      const { apiKey, ...configWithoutKey } = provider;
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId ? { ...p, status: 'connecting' } : p
        )
      );
      let res: ProviderVerificationResult;
      try {
        res = await window.desktop.verifyProvider(configWithoutKey);
      } catch (err: any) {
        res = {
          success: false,
          models: [],
          status: 'provider-unavailable',
          message: err.message || 'Provider verification failed.',
        };
      }
      const now = Date.now();
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId
            ? {
                ...p,
                status: res.status,
                errorMessage: res.success ? undefined : res.message,
                discoveredModels: res.success ? res.models : p.discoveredModels,
                lastVerifiedAt: now,
              }
            : p
        )
      );
      if (res.success && res.models.length > 0) {
        setSelectedModelInternal((prev) => prev || res.models[0]);
        setSelectedProviderId(providerId);
        setNotification({
          title: 'Provider Connected',
          message: res.message || `Connected to ${provider.name}.`,
          type: 'success',
        });
      } else if (res.status === 'auth-verified-model-untested') {
        setNotification({
          title: 'Provider Verified',
          message: res.message || `${provider.name} verified. Enter a model ID manually.`,
          type: 'info',
        });
      } else {
        setNotification({
          title: 'Connection Failed',
          message: res.message || `Failed to connect to ${provider.name}.`,
          type: 'warning',
        });
      }
      return res;
    }
    // Fallback to browser preview bridge — no secure credential storage available
    const res = await desktopBridge.provider.verifyConnection(providerId);
    const now = Date.now();
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId
          ? {
              ...p,
              status: res.success ? 'connected' : 'not-configured',
              errorMessage: res.success ? undefined : res.message,
              discoveredModels: res.success ? res.models : p.discoveredModels,
              lastVerifiedAt: now,
            }
          : p
      )
    );
    if (res.success && res.models.length > 0) {
      setSelectedModelInternal((prev) => prev || res.models[0]);
      setSelectedProviderId(providerId);
    }
    return res;
  };

  const openWorkspaceDialog = async () => {
    let folderPath: string | null = null;

    if (typeof window !== 'undefined' && window.desktop?.selectWorkspace) {
      folderPath = await window.desktop.selectWorkspace(selectedWorkspace?.path);
    } else {
      folderPath = await desktopBridge.fs.selectFolderDialog(selectedWorkspace?.path);
      if (!folderPath) {
        const entered = window.prompt(
          'Enter directory path for Windows workspace:\n(Native Windows folder picker activates in Electron Stage 2)',
          'C:\\Projects\\my-project'
        );
        if (entered && entered.trim()) {
          folderPath = entered.trim();
        }
      }
    }

    if (folderPath && folderPath.trim()) {
      folderPath = folderPath.trim();
      const folderName = folderPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'Workspace';
      const ws: ProjectWorkspace = {
        id: 'ws-' + Date.now(),
        name: folderName,
        path: folderPath,
        lastOpened: Date.now(),
      };
      setSelectedWorkspace(ws);
      setRecentWorkspaces((prev) => [ws, ...prev.filter((p) => p.path !== folderPath)].slice(0, 5));
      try {
        localStorage.setItem('refx_active_workspace', JSON.stringify(ws));
        localStorage.setItem('refx_recent_workspaces', JSON.stringify([ws, ...recentWorkspaces]));
      } catch {
        // Ignored
      }
      setNotification({
        title: 'Workspace Selected',
        message: `Set active folder to: ${folderPath}`,
        type: 'info',
      });
    }
  };

  const setWorkspace = (ws: ProjectWorkspace | null) => {
    setSelectedWorkspace(ws);
    try {
      localStorage.setItem('refx_active_workspace', JSON.stringify(ws));
    } catch {
      // Ignored
    }
  };

  const selectFile = (path: string | null) => {
    setSelectedFile(path);
  };

  const approveChange = (filePath: string) => {
    setPendingChanges((prev) =>
      prev.map((c) => (c.filePath === filePath ? { ...c, status: 'approved' as const } : c))
    );
    setNotification({
      title: 'Modification Approved',
      message: `Accepted changes to ${filePath.split('\\').pop()}`,
      type: 'success',
    });
  };

  const rejectChange = (filePath: string) => {
    setPendingChanges((prev) =>
      prev.map((c) => (c.filePath === filePath ? { ...c, status: 'rejected' as const } : c))
    );
    setNotification({
      title: 'Modification Rejected',
      message: `Discarded changes for ${filePath.split('\\').pop()}`,
      type: 'warning',
    });
  };

  const approveAllChanges = () => {
    setPendingChanges((prev) => prev.map((c) => ({ ...c, status: 'approved' as const })));
  };

  const addTaskMemory = async (title: string, content: string, tags: string[] = []) => {
    const entry = await desktopBridge.memory.saveTaskMemory({
      taskId: currentConversation?.id || 'default-task',
      title,
      content,
      tags,
    });
    setTaskMemories((prev) => [entry, ...prev]);
  };

  const deleteTaskMemory = async (id: string) => {
    await desktopBridge.memory.deleteTaskMemory(id);
    setTaskMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const addAppMemory = async (category: AppMemoryEntry['category'], title: string, summary: string, details: string) => {
    const entry = await desktopBridge.memory.saveAppMemory({
      category,
      title,
      summary,
      details,
      enabled: true,
    });
    setAppMemories((prev) => [entry, ...prev]);
  };

  const deleteAppMemory = async (id: string) => {
    await desktopBridge.memory.deleteAppMemory(id);
    setAppMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleAppMemory = async (id: string) => {
    const target = appMemories.find((m) => m.id === id);
    if (target) {
      const updated = { ...target, enabled: !target.enabled };
      setAppMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  };

  const clearAppMemories = async () => {
    await desktopBridge.memory.clearAppMemories();
    setAppMemories([]);
  };

  const updateMemoryConfig = async (config: Partial<MemoryConfig>) => {
    const updated = await desktopBridge.memory.updateMemoryConfig(config);
    setMemoryConfig(updated);
  };

  const executeTerminalCommand = async (cmd: string) => {
    if (!activeTerminalId) return;
    await desktopBridge.terminal.sendInput(activeTerminalId, cmd);
  };

  const createNewTerminalSession = async (shell = 'powershell.exe') => {
    const session = await desktopBridge.terminal.createSession(
      shell,
      selectedWorkspace?.path || 'No workspace opened'
    );
    setTerminalSessions((prev) => [...prev, session]);
    setActiveTerminalId(session.id);

    desktopBridge.terminal.onOutput(session.id, (data) => {
      setTerminalLogs((prev) => ({
        ...prev,
        [session.id]: (prev[session.id] || '') + data,
      }));
    });

    setTerminalLogs((prev) => ({
      ...prev,
      [session.id]: `PS> `,
    }));
  };

  const clearTerminalLogs = () => {
    if (activeTerminalId) {
      setTerminalLogs((prev) => ({
        ...prev,
        [activeTerminalId]: '',
      }));
    }
  };

  const requestPermission = (request: Omit<PermissionRequest, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const req: PermissionRequest = {
        ...request,
        id: 'perm-' + Date.now(),
        createdAt: Date.now(),
        status: 'pending',
      };
      setPendingPermission(req);
      setPermissionResolver(() => resolve);
      setActiveModal('permission');
    });
  };

  const resolvePermission = (granted: boolean) => {
    if (permissionResolver) {
      permissionResolver(granted);
      setPermissionResolver(null);
    }
    setPendingPermission(null);
    setActiveModal(null);
  };

  // Honest chat message flow:
  // If no provider is connected, accurately informs user to configure one.
  const sendMessage = async (text: string, attachments: MessageAttachment[] = []): Promise<void> => {
    if (!text.trim() && attachments.length === 0) return;

    // MARK: Set generating state immediately so UI shows loading
    setIsGenerating(true);

    // Resolve the target conversation. If there is no active conversation,
    // create one so the user message is never silently dropped.
    let targetConvId = currentConversationId;
    let targetConv = conversations.find((c) => c.id === targetConvId);

    if (!targetConv) {
      const newConv: Conversation = {
        id: "conv-" + Date.now(),
        title: "New Conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel || "No model connected",
        providerId: selectedProviderId || "",
        saveMemoryDefault: saveMemoryActive,
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      targetConvId = newConv.id;
      targetConv = newConv;
    }

    const providerLabel = selectedProvider?.name || selectedProvider?.type || "Provider";

    // Declared outside try so the catch block can remove an empty placeholder on failure.
    const assistantMsgId = "msg-ai-" + Date.now();

    try {
      const userMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "user",
        content: text,
        timestamp: Date.now(),
        attachments,
      };

      // Append the user message to the correct conversation
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConvId) {
            const updatedMessages = [...c.messages, userMsg];
            const newTitle =
              c.messages.length === 0 ? text.slice(0, 36) + (text.length > 36 ? "..." : "") : c.title;
            return {
              ...c,
              title: newTitle,
              updatedAt: Date.now(),
              messages: updatedMessages,
            };
          }
          return c;
        })
      );

      // If no provider is connected, post a genuine system message explaining real state.
      // isGenerating is always reset here — this branch used to leave it stuck at true.
      const isModelConnected = selectedProvider && selectedProvider.status === "connected" && selectedModel;

      if (!isModelConnected) {
        const sysNotice: ChatMessage = {
          id: "msg-sys-" + Date.now(),
          role: "system",
          content:
            "No model provider connected. To run prompts, open **AI Models & Providers** and configure and verify a provider (Ollama, LM Studio, Google Gemini, Anthropic, OpenAI, OpenRouter, or a custom endpoint).",
          timestamp: Date.now(),
        };

        setConversations((prev) =>
          prev.map((c) => (c.id === targetConvId ? { ...c, messages: [...c.messages, sysNotice] } : c))
        );
        setIsGenerating(false);
        activeRequestIdRef.current = null;
        streamUnsubscribeRef.current?.();
        streamUnsubscribeRef.current = null;
        return;
      }

      // Validate that the selected model is available for cloud providers
      // (local providers like Ollama/LM Studio may allow manually entered models)
      const cloudProviderTypes = [
        'gemini',
        'openai',
        'anthropic',
        'openrouter',
        'openai_compatible',
        'custom_local',
      ] as const;
      const isCloudProvider =
        selectedProvider && cloudProviderTypes.includes(selectedProvider.type as (typeof cloudProviderTypes)[number]);
      const isModelDiscovered = isCloudProvider
        ? selectedProvider.discoveredModels.includes(selectedModel)
        : true;

      if (!isModelDiscovered && isCloudProvider) {
        const sysNotice: ChatMessage = {
          id: "msg-sys-" + Date.now(),
          role: "system",
          content:
            `**${providerLabel} Error:** The selected model "${selectedModel}" is not available for this provider. Open **AI Models & Providers**, verify the connection to refresh the model list, then select a valid model.`,
          timestamp: Date.now(),
        };

        setConversations((prev) =>
          prev.map((c) => (c.id === targetConvId ? { ...c, messages: [...c.messages, sysNotice] } : c))
        );
        setIsGenerating(false);
        activeRequestIdRef.current = null;
        streamUnsubscribeRef.current?.();
        streamUnsubscribeRef.current = null;
        return;
      }

      // Save task memory if active
      if (saveMemoryActive && text.length > 15) {
        await addTaskMemory(
          text.slice(0, 40) + "...",
          `Task requirement from user prompt: "${text}"`,
          ["prompt-context"]
        );
      }

      // Real streaming inference via Electron desktop bridge
      setIsGenerating(true);

      // Create a placeholder assistant message that will be updated incrementally
      const requestId = "req-" + Date.now();
      activeRequestIdRef.current = requestId;

      const placeholderMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        model: selectedModel,
        providerId: selectedProviderId,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? { ...c, updatedAt: Date.now(), messages: [...c.messages, placeholderMsg] }
            : c
        )
      );

      // Build the message history from the latest known conversation state plus the
      // current user message. Complete, correctly ordered, no duplicates, no stale state.
      const historyMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
      if (targetConv) {
        for (const msg of targetConv.messages) {
          if (msg.role === "user" || msg.role === "assistant") {
            historyMessages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      historyMessages.push({ role: "user", content: text });

      // Check if we are running inside Electron with the desktop bridge
      if (typeof window !== "undefined" && window.desktop?.startProviderChat) {
        // Subscribe to streaming events BEFORE starting the chat
        const unsubscribe = window.desktop.onProviderStream((event) => {
          if (event.requestId !== requestId) return;

          if (event.type === "chunk" && event.fullText !== undefined) {
            // Update the assistant message content incrementally
            setConversations((prev) =>
              prev.map((c) =>
                c.id === targetConvId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: event.fullText! } : m
                      ),
                    }
                  : c
              )
            );
          } else if (event.type === "done") {
            // Finalize the message
            if (event.fullText) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === targetConvId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMsgId ? { ...m, content: event.fullText! } : m
                        ),
                      }
                    : c
                )
              );
            }
            setIsGenerating(false);
            activeRequestIdRef.current = null;
            streamUnsubscribeRef.current?.();
            streamUnsubscribeRef.current = null;
          } else if (event.type === "error") {
            // Show the error as a system message with an accurate provider label
            const errorMsg: ChatMessage = {
              id: "msg-err-" + Date.now(),
              role: "system",
              content: `**${providerLabel} Error:** ${event.error || "Unknown error during generation."}`,
              timestamp: Date.now(),
            };
            setConversations((prev) =>
              prev.map((c) =>
                c.id === targetConvId
                  ? {
                      ...c,
                      // Remove the empty placeholder if no content was generated, add error
                      messages: [
                        ...c.messages.filter((m) => !(m.id === assistantMsgId && !m.content)),
                        errorMsg,
                      ],
                    }
                  : c
              )
            );
            setIsGenerating(false);
            activeRequestIdRef.current = null;
            streamUnsubscribeRef.current?.();
            streamUnsubscribeRef.current = null;
          }
        });

        streamUnsubscribeRef.current = unsubscribe;

        // Start the chat with the selected provider
        const startResult = await window.desktop.startProviderChat({
          requestId,
          providerId: selectedProvider?.id ?? "",
          providerType: selectedProvider?.type ?? "ollama",
          model: selectedModel,
          messages: historyMessages,
          temperature: 0.7,
          baseUrl: selectedProvider?.baseUrl ?? undefined,
        });

        if (!startResult.success) {
          // IPC call itself failed
          unsubscribe();
          streamUnsubscribeRef.current = null;
          activeRequestIdRef.current = null;
          setIsGenerating(false);

          const errorMsg: ChatMessage = {
            id: "msg-err-" + Date.now(),
            role: "system",
            content: `**${providerLabel} Error:** ${startResult.error || "Unknown error."}`,
            timestamp: Date.now(),
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === targetConvId
                ? {
                    ...c,
                    messages: [
                      ...c.messages.filter((m) => !(m.id === assistantMsgId && !m.content)),
                      errorMsg,
                    ],
                  }
                : c
            )
          );
        }
      } else {
        // Browser fallback: no Electron bridge available
        const fallbackMsg: ChatMessage = {
          id: assistantMsgId,
          role: "system",
          content:
            "Real-time inference requires the Electron desktop app. Please launch REFX via `npm run electron:dev` or `npm run electron:start`.",
          timestamp: Date.now(),
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? { ...c, messages: c.messages.map((m) => (m.id === assistantMsgId ? fallbackMsg : m)) }
              : c
          )
        );
        setIsGenerating(false);
      }
    } catch (error) {
      // Ensure generating state is reset if an error occurred
      setIsGenerating(false);
      activeRequestIdRef.current = null;
      streamUnsubscribeRef.current?.();
      streamUnsubscribeRef.current = null;

      console.error("sendMessage error:", error);
      const errorMsg: ChatMessage = {
        id: "msg-err-" + Date.now(),
        role: "system",
        content: `**Error during message send:** ${(error as Error).message || "Unknown error."}`,
        timestamp: Date.now(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                messages: [
                  ...c.messages.filter((m) => !(m.id === assistantMsgId && !m.content)),
                  errorMsg,
                ],
              }
            : c
        )
      );
    } // Close catch block
  };
  const stopGeneration = useCallback(() => {
    // Cancel the active provider stream
    if (activeRequestIdRef.current && typeof window !== 'undefined' && window.desktop?.cancelProviderChat) {
      window.desktop.cancelProviderChat(activeRequestIdRef.current);
    }
    // Unsubscribe from stream events
    if (streamUnsubscribeRef.current) {
      streamUnsubscribeRef.current();
      streamUnsubscribeRef.current = null;
    }
    activeRequestIdRef.current = null;
    setIsGenerating(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        activeModal,
        openModal,
        closeModal,
        activeDrawer,
        toggleDrawer,
        bottomPanel,
        setBottomPanel,
        conversations,
        currentConversation,
        startNewConversation,
        selectConversation,
        deleteConversation,
        sendMessage,
        isGenerating,
        stopGeneration,
        providers,
        selectedProvider,
        selectedModel,
        setSelectedModel,
        saveProviderConfig,
        verifyProviderConnection,
        selectedWorkspace,
        recentWorkspaces,
        fileTree,
        selectedFile,
        selectFile,
        openWorkspaceDialog,
        setWorkspace,
        pendingChanges,
        activeDiffFile,
        setActiveDiffFile,
        approveChange,
        rejectChange,
        approveAllChanges,
        saveMemoryActive,
        setSaveMemoryActive,
        taskMemories,
        appMemories,
        memoryConfig,
        addTaskMemory,
        deleteTaskMemory,
        addAppMemory,
        deleteAppMemory,
        toggleAppMemory,
        clearAppMemories,
        updateMemoryConfig,
        terminalSessions,
        activeTerminalId,
        setActiveTerminalId,
        terminalLogs,
        executeTerminalCommand,
        createNewTerminalSession,
        clearTerminalLogs,
        pendingPermission,
        resolvePermission,
        requestPermission,
        isElectron: isElectron || desktopBridge.system.isElectron,
        systemPlatform: desktopBridge.system.platform,
        notification,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
