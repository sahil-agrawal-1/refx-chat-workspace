/**
 * Desktop Bridge Contracts
 * Standard typed interface for Electron Native Desktop Bridge (Stage 2/3)
 * and Browser Preview Adapter (Stage 1).
 */

export interface SystemInfo {
  isElectron: boolean;
  platform: 'win32' | 'darwin' | 'linux' | 'browser';
  arch: string;
  osVersion: string;
  appVersion: string;
  isWindows: boolean;
}

export interface WorkspaceFolder {
  path: string;
  name: string;
  lastOpened: number;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: number;
  children?: FileItem[];
}

export interface FileDiffChunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: Array<{
    type: 'add' | 'delete' | 'context';
    text: string;
    oldLineNo?: number;
    newLineNo?: number;
  }>;
}

export interface FileChange {
  id?: string;
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  originalContent?: string;
  newContent?: string;
  additions: number;
  deletions: number;
  diffChunks?: FileDiffChunk[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface TerminalSessionInfo {
  id: string;
  name: string;
  shell: 'powershell.exe' | 'cmd.exe' | 'bash.exe' | 'wsl.exe';
  cwd: string;
  isRunning: boolean;
  exitCode?: number | null;
  history: string[];
}

export interface TerminalExecutionRequest {
  command: string;
  cwd: string;
  shell?: string;
  requiresPermission?: boolean;
}

export interface PermissionRequest {
  id: string;
  type: 'terminal_exec' | 'file_write' | 'network_call' | 'env_read';
  title: string;
  description: string;
  details: Record<string, unknown>;
  createdAt: number;
  status: 'pending' | 'granted' | 'denied';
}

export interface TaskMemoryEntry {
  id: string;
  taskId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppMemoryEntry {
  id: string;
  category: 'preference' | 'convention' | 'architecture' | 'learning' | 'credential_hint';
  title: string;
  summary: string;
  details: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryConfig {
  autoMemoryEnabled: boolean;
  globalMemoryDirectory: string;
  storageBackend: 'sqlite' | 'json_file';
  maxEntries: number;
}

export type ProviderConnectionStatus =
  | 'not-configured'
  | 'connecting'
  | 'connected'
  | 'auth-failed'
  | 'insufficient-permissions'
  | 'rate-limited'
  | 'provider-unavailable'
  | 'model-unavailable'
  | 'model-discovery-unsupported'
  | 'auth-verified-model-untested';

export interface ProviderVerificationResult {
  success: boolean;
  models: string[];
  message?: string;
  status: ProviderConnectionStatus;
  providerUnavailable?: boolean;
  rateLimited?: boolean;
  authFailed?: boolean;
}

export type ProviderType =
  | 'openai'
  | 'gemini'
  | 'anthropic'
  | 'openai_compatible'
  | 'openrouter'
  | 'ollama'
  | 'lm_studio'
  | 'custom_local';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  isLocal: boolean;
  status: ProviderConnectionStatus;
  errorMessage?: string;
  discoveredModels: string[];
  selectedModel: string;
  lastVerifiedAt?: number;
}

export interface WorkspaceInfo {
  path: string;
  name: string;
  exists: boolean;
  isDirectory: boolean;
}

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
}

export interface FileSearchResult {
  path: string;
  name: string;
}

export interface TextSearchResult {
  path: string;
  line: number;
  preview: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  applyByDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ISkillBridge {
  listSkills(): Promise<Skill[]>;
  getSkill(id: string): Promise<Skill | null>;
  saveSkill(skill: Partial<Skill> & { id?: string }): Promise<Skill>;
  deleteSkill(id: string): Promise<boolean>;
  duplicateSkill(id: string): Promise<Skill | null>;
  getSkillsDir(): Promise<string>;
}

export interface TrashItem {
  id: string;
  type: 'conversation' | 'workspace' | 'file';
  data: any;
  deletedAt: number;
}

export interface ITrashBridge {
  listTrash(): Promise<TrashItem[]>;
  addToTrash(type: string, data: any): Promise<TrashItem>;
  restoreTrash(id: string): Promise<TrashItem | null>;
  purgeTrash(id: string): Promise<boolean>;
  purgeExpired(): Promise<number>;
}

export interface IFileSystemBridge {
  selectFolderDialog(defaultPath?: string): Promise<string | null>;
  selectFileDialog(defaultPath?: string): Promise<string | null>;
  getWorkspaceInfo(workspacePath: string): Promise<WorkspaceInfo>;
  readDirectory(dirPath: string): Promise<FileItem[]>;
  readFile(filePath: string): Promise<string>;
  searchFiles(workspacePath: string, query: string): Promise<FileSearchResult[]>;
  searchText(workspacePath: string, query: string): Promise<TextSearchResult[]>;
  getFileMetadata(filePath: string): Promise<FileMetadata | null>;
  setActiveWorkspace(workspacePath: string | null): Promise<void>;
  proposeFileChange(request: any): Promise<any>;
  getPendingChanges(): Promise<any[]>;
  approveFileChange(id: string): Promise<boolean>;
  rejectFileChange(id: string): Promise<boolean>;
  restoreFileBackup(id: string): Promise<boolean>;
  writeFile(filePath: string, content: string): Promise<boolean>;
  watchDirectory(dirPath: string, callback: (event: 'add' | 'change' | 'unlink', path: string) => void): () => void;
}

export interface ITerminalBridge {
  createSession(shell?: string, cwd?: string): Promise<TerminalSessionInfo>;
  sendInput(sessionId: string, input: string): Promise<void>;
  resize(sessionId: string, cols: number, rows: number): Promise<void>;
  killSession(sessionId: string): Promise<void>;
  onOutput(sessionId: string, callback: (data: string) => void): () => void;
  onAgentRequest(callback: (request: any) => void): () => void;
  approveAgentCommand(id: string, sessionId?: string): Promise<boolean>;
  rejectAgentCommand(id: string): Promise<boolean>;
}

export interface IMemoryBridge {
  getMemoryConfig(): Promise<MemoryConfig>;
  updateMemoryConfig(config: Partial<MemoryConfig>): Promise<MemoryConfig>;
  getTaskMemories(taskId: string): Promise<TaskMemoryEntry[]>;
  getTaskMemory(conversationId: string): Promise<TaskMemoryEntry | null>;
  saveTaskMemory(entry: Omit<TaskMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskMemoryEntry>;
  updateTaskMemory(conversationId: string, id: string, changes: any): Promise<TaskMemoryEntry | null>;
  deleteTaskMemory(id: string): Promise<boolean>;
  deleteTaskMemory(id: string): Promise<boolean>;
  getAppMemories(): Promise<AppMemoryEntry[]>;
  saveAppMemory(entry: Omit<AppMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppMemoryEntry>;
  deleteAppMemory(id: string): Promise<boolean>;
  clearAppMemories(): Promise<boolean>;
}

export interface IProviderBridge {
  getProviders(): Promise<ProviderConfig[]>;
  saveProvider(provider: ProviderConfig): Promise<ProviderConfig>;
  deleteProvider(id: string): Promise<boolean>;
  verifyConnection(providerId: string): Promise<ProviderVerificationResult>;
}

export interface IDatabaseBridge {
  initializeDatabase(): Promise<{ success: boolean; path?: string; error?: string }>;
  getConversations(): Promise<any[]>;
  getConversation(id: string): Promise<any | null>;
  createConversation(data: any): Promise<any>;
  updateConversation(id: string, changes: any): Promise<any | null>;
  deleteConversation(id: string): Promise<boolean>;
  searchConversations(query: string): Promise<any[]>;
  getMessages(conversationId: string): Promise<any[]>;
  saveMessage(message: any): Promise<any>;
  updateMessage(id: string, changes: any): Promise<any | null>;
  deleteMessage(id: string): Promise<boolean>;
  getAppSettings(): Promise<Record<string, unknown>>;
  saveAppSetting(key: string, value: unknown): Promise<boolean>;
  exportDatabaseBackup(): Promise<{ success: boolean; path?: string; error?: string }>;
  restoreDatabaseBackup(filePath: string): Promise<{ success: boolean; error?: string }>;
  validateDatabaseFile(filePath: string): Promise<{ valid: boolean; error?: string }>;
  migrateLegacyData(payload: { conversations: any[]; settings?: Record<string, unknown> }): Promise<{ success: boolean; imported: number; error?: string }>;
  integrityCheck(): Promise<{ ok: boolean; error?: string }>;
}

export interface IDesktopBridge {
  system: SystemInfo;
  fs: IFileSystemBridge;
  terminal: ITerminalBridge;
  memory: IMemoryBridge;
  provider: IProviderBridge;
  database: IDatabaseBridge;
  trash: ITrashBridge;
  skills: ISkillBridge;
  notify(title: string, message: string): void;
}

export interface DesktopAppInfo {
  name: string;
  version: string;
  isElectron: boolean;
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  osVersion: string;
  isWindows: boolean;
}

export interface OllamaCheckResult {
  available: boolean;
  error?: string;
}

export interface OllamaModelsResult {
  success: boolean;
  models: string[];
  error?: string;
}

export interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaStreamEvent {
  requestId: string;
  type: 'chunk' | 'done' | 'error';
  delta?: string;
  fullText?: string;
  error?: string;
}

/**
 * Unified model inference request sent to any provider adapter.
 */
export interface ModelInferenceRequest {
  requestId: string;
  providerId: string;
  providerType?: ProviderType;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  effort?: string;
  approvalMode?: 'ask' | 'turbo' | 'auto_preview';
  stream?: boolean;
  apiKey?: string;
  baseUrl?: string;
  workspacePath?: string | null;
  webSearch?: boolean;
}

/**
 * Unified model inference result (non-streaming).
 */
export interface ModelInferenceResult {
  requestId: string;
  success: boolean;
  content?: string;
  model?: string;
  providerType?: ProviderType;
  error?: string;
}

/**
 * Unified streaming event from any provider adapter.
 */
export interface ModelStreamEvent {
  requestId: string;
  type: 'chunk' | 'done' | 'error' | 'activity';
  delta?: string;
  fullText?: string;
  error?: string;
  activities?: Array<{
    id: string;
    type: 'thinking' | 'file_read' | 'file_write' | 'terminal_run' | 'plan' | 'completed' | 'error';
    title: string;
    detail?: string;
    timestamp: number;
    status: 'running' | 'completed' | 'failed';
    durationMs?: number;
    outputPreview?: string;
  }>;
}

/**
 * Common interface that every provider adapter must implement.
 */
export interface IModelProviderAdapter {
  providerType: ProviderType;
  verifyConnection(config: ProviderConfig): Promise<{ success: boolean; models: string[]; message?: string }>;
  sendMessage(request: ModelInferenceRequest): Promise<ModelInferenceResult>;
  streamResponse(request: ModelInferenceRequest, onEvent: (event: ModelStreamEvent) => void): Promise<{ success: boolean; error?: string }>;
  cancelGeneration(requestId: string): Promise<boolean>;
}

/**
 * Allowlisted IPC channel constants for provider inference.
 * Strictly define allowed channel names to prevent arbitrary IPC invocation.
 */
export const MODEL_IPC_CHANNELS = {
  VERIFY_PROVIDER: 'desktop:verifyProvider',
  START_PROVIDER_CHAT: 'desktop:startProviderChat',
  CANCEL_PROVIDER_CHAT: 'desktop:cancelProviderChat',
  PROVIDER_STREAM: 'desktop:providerStream',
} as const;

/**
 * Allowlisted IPC channel constants for secure credential management.
 * Credentials are encrypted at rest via Electron safeStorage (Windows DPAPI)
 * and are never returned to the renderer process.
 */
export const FILESYSTEM_IPC_CHANNELS = {
  SELECT_WORKSPACE: 'desktop:fsSelectWorkspace',
  GET_WORKSPACE_INFO: 'desktop:fsGetWorkspaceInfo',
  READ_DIRECTORY: 'desktop:fsReadDirectory',
  READ_FILE: 'desktop:fsReadFile',
  SEARCH_FILES: 'desktop:fsSearchFiles',
  SEARCH_TEXT: 'desktop:fsSearchText',
  GET_FILE_METADATA: 'desktop:fsGetFileMetadata',
  SET_ACTIVE_WORKSPACE: 'desktop:fsSetActiveWorkspace',
  PROPOSE_CHANGE: 'desktop:fsProposeChange',
  GET_PENDING_CHANGES: 'desktop:fsGetPendingChanges',
  APPROVE_CHANGE: 'desktop:fsApproveChange',
  REJECT_CHANGE: 'desktop:fsRejectChange',
  RESTORE_BACKUP: 'desktop:fsRestoreBackup',
} as const;

export const SYSTEM_IPC_CHANNELS = {
  CHECK_REMOTE_DEBUGGING: 'desktop:checkRemoteDebugging',
  OPEN_REMOTE_DEBUGGING: 'desktop:openRemoteDebugging',
} as const;

export const CREDENTIAL_IPC_CHANNELS = {
  SAVE_CREDENTIAL: 'desktop:saveCredential',
  DELETE_CREDENTIAL: 'desktop:deleteCredential',
  HAS_CREDENTIAL: 'desktop:hasCredential',
  MIGRATE_CREDENTIAL: 'desktop:migrateCredential',
} as const;

export const TERMINAL_IPC_CHANNELS = {
  CREATE: 'desktop:termCreate',
  WRITE: 'desktop:termWrite',
  RESIZE: 'desktop:termResize',
  KILL: 'desktop:termKill',
  LIST: 'desktop:termList',
  OUTPUT: 'desktop:termOutput',
  EXIT: 'desktop:termExit',
  AGENT_REQUEST: 'desktop:termAgentRequest',
  AGENT_APPROVE: 'desktop:termAgentApprove',
  AGENT_REJECT: 'desktop:termAgentReject',
} as const;

export const SKILLS_IPC_CHANNELS = {
  LIST: 'desktop:skillsList',
  GET: 'desktop:skillsGet',
  SAVE: 'desktop:skillsSave',
  DELETE: 'desktop:skillsDelete',
  DUPLICATE: 'desktop:skillsDuplicate',
  DIR: 'desktop:skillsDir',
} as const;

export const TRASH_IPC_CHANNELS = {
  LIST: 'desktop:trashList',
  ADD: 'desktop:trashAdd',
  RESTORE: 'desktop:trashRestore',
  PURGE: 'desktop:trashPurge',
  PURGE_EXPIRED: 'desktop:trashPurgeExpired',
} as const;

export const MEMORY_IPC_CHANNELS = {
  GET_CONFIG: 'desktop:memGetConfig',
  UPDATE_CONFIG: 'desktop:memUpdateConfig',
  GET_TASK_MEMORIES: 'desktop:memGetTaskMemories',
  GET_TASK_MEMORY: 'desktop:memGetTaskMemory',
  SAVE_TASK_MEMORY: 'desktop:memSaveTaskMemory',
  UPDATE_TASK_MEMORY: 'desktop:memUpdateTaskMemory',
  DELETE_TASK_MEMORY: 'desktop:memDeleteTaskMemory',
  GET_APP_MEMORIES: 'desktop:memGetAppMemories',
  SAVE_APP_MEMORY: 'desktop:memSaveAppMemory',
  DELETE_APP_MEMORY: 'desktop:memDeleteAppMemory',
  CLEAR_APP_MEMORIES: 'desktop:memClearAppMemories',
} as const;

export const DATABASE_IPC_CHANNELS = {
  INITIALIZE: 'desktop:dbInitialize',
  GET_CONVERSATIONS: 'desktop:dbGetConversations',
  GET_CONVERSATION: 'desktop:dbGetConversation',
  CREATE_CONVERSATION: 'desktop:dbCreateConversation',
  UPDATE_CONVERSATION: 'desktop:dbUpdateConversation',
  DELETE_CONVERSATION: 'desktop:dbDeleteConversation',
  SEARCH_CONVERSATIONS: 'desktop:dbSearchConversations',
  GET_MESSAGES: 'desktop:dbGetMessages',
  SAVE_MESSAGE: 'desktop:dbSaveMessage',
  UPDATE_MESSAGE: 'desktop:dbUpdateMessage',
  DELETE_MESSAGE: 'desktop:dbDeleteMessage',
  GET_SETTINGS: 'desktop:dbGetSettings',
  SAVE_SETTING: 'desktop:dbSaveSetting',
  EXPORT_BACKUP: 'desktop:dbExportBackup',
  RESTORE_BACKUP: 'desktop:dbRestoreBackup',
  VALIDATE_BACKUP: 'desktop:dbValidateBackup',
  MIGRATE_LEGACY: 'desktop:dbMigrateLegacy',
  INTEGRITY_CHECK: 'desktop:dbIntegrityCheck',
} as const;

export interface IDesktopAPI {
  getAppInfo(): Promise<DesktopAppInfo>;
  selectWorkspace(defaultPath?: string): Promise<string | null>;
  checkOllama(): Promise<OllamaCheckResult>;
  listOllamaModels(): Promise<OllamaModelsResult>;
  startOllamaChat(
    requestId: string,
    model: string,
    messages: OllamaChatMessage[]
  ): Promise<{ success: boolean; error?: string }>;
  cancelOllamaChat(requestId: string): Promise<boolean>;
  onOllamaStream(callback: (event: OllamaStreamEvent) => void): () => void;
  // Unified provider inference (multi-provider)
  verifyProvider(config: ProviderConfig): Promise<ProviderVerificationResult>;
  startProviderChat(request: ModelInferenceRequest): Promise<ModelInferenceResult>;
  cancelProviderChat(requestId: string): Promise<boolean>;
  onProviderStream(callback: (event: ModelStreamEvent) => void): () => void;
  // Secure filesystem bridge (typed, allowlisted)
  fs: IFileSystemBridge;

  // Memory bridge (Electron main process SQLite)
  memory: IMemoryBridge;

  // Skills bridge (Electron main process filesystem)
  skills: ISkillBridge;

  // System helpers
  checkRemoteDebugging(): Promise<boolean>;
  openRemoteDebugging(): Promise<void>;

  // Trash/backup bin bridge
  trash: ITrashBridge;

  // Terminal bridge (Electron main process PTY)
  terminal: ITerminalBridge;

  // Secure credential management (credentials never returned to renderer)
  saveCredential(providerId: string, apiKey: string): Promise<boolean>;
  deleteCredential(providerId: string): Promise<boolean>;
  hasCredential(providerId: string): Promise<boolean>;
  migrateCredential(providerId: string, apiKey: string): Promise<{ success: boolean; error?: string }>;
  // Local SQLite database bridge (Electron main process)
  database: IDatabaseBridge;
}

declare global {
  interface Window {
    desktop?: IDesktopAPI;
  }
}
