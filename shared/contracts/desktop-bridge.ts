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
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  errorMessage?: string;
  discoveredModels: string[];
  selectedModel: string;
  lastVerifiedAt?: number;
}

export interface IFileSystemBridge {
  readDirectory(dirPath: string): Promise<FileItem[]>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<boolean>;
  selectFolderDialog(defaultPath?: string): Promise<string | null>;
  selectFileDialog(defaultPath?: string): Promise<string | null>;
  watchDirectory(dirPath: string, callback: (event: 'add' | 'change' | 'unlink', path: string) => void): () => void;
}

export interface ITerminalBridge {
  createSession(shell?: string, cwd?: string): Promise<TerminalSessionInfo>;
  sendInput(sessionId: string, input: string): Promise<void>;
  killSession(sessionId: string): Promise<void>;
  onOutput(sessionId: string, callback: (data: string) => void): () => void;
}

export interface IMemoryBridge {
  getMemoryConfig(): Promise<MemoryConfig>;
  updateMemoryConfig(config: Partial<MemoryConfig>): Promise<MemoryConfig>;
  getTaskMemories(taskId: string): Promise<TaskMemoryEntry[]>;
  saveTaskMemory(entry: Omit<TaskMemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskMemoryEntry>;
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
  verifyConnection(providerId: string): Promise<{ success: boolean; models: string[]; message?: string }>;
}

export interface IDesktopBridge {
  system: SystemInfo;
  fs: IFileSystemBridge;
  terminal: ITerminalBridge;
  memory: IMemoryBridge;
  provider: IProviderBridge;
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
  providerType: ProviderType;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  apiKey?: string;
  baseUrl?: string;
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
  type: 'chunk' | 'done' | 'error';
  delta?: string;
  fullText?: string;
  error?: string;
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
  verifyProvider(config: ProviderConfig): Promise<{ success: boolean; models: string[]; message?: string }>;
  startProviderChat(request: ModelInferenceRequest): Promise<ModelInferenceResult>;
  cancelProviderChat(requestId: string): Promise<boolean>;
  onProviderStream(callback: (event: ModelStreamEvent) => void): () => void;
}

declare global {
  interface Window {
    desktop?: IDesktopAPI;
  }
}
