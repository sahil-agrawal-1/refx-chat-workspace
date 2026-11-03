import type {
  ProviderConfig,
  ProviderType,
  FileChange,
  TaskMemoryEntry,
  AppMemoryEntry,
  MemoryConfig,
  TerminalSessionInfo,
  PermissionRequest,
  SystemInfo,
  FileItem
} from 'shared/contracts/desktop-bridge';

export type {
  ProviderConfig,
  ProviderType,
  FileChange,
  TaskMemoryEntry,
  AppMemoryEntry,
  MemoryConfig,
  TerminalSessionInfo,
  PermissionRequest,
  SystemInfo,
  FileItem
};

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'file' | 'image' | 'diff' | 'command';
  path?: string;
  size?: number;
}

export interface ActivityStep {
  id: string;
  type: 'thinking' | 'file_read' | 'file_write' | 'terminal_run' | 'plan' | 'completed' | 'error';
  title: string;
  detail?: string;
  timestamp: number;
  status: 'running' | 'completed' | 'failed';
  durationMs?: number;
  outputPreview?: string;
  fileChanges?: FileChange[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  providerId?: string;
  attachments?: MessageAttachment[];
  activities?: ActivityStep[];
  fileChanges?: FileChange[];
  hasMemorySaved?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  projectId?: string;
  model: string;
  providerId: string;
  messages: ChatMessage[];
  saveMemoryDefault: boolean;
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  fileCount?: number;
  branch?: string;
}

export interface ScheduledTask {
  id: string;
  title: string;
  prompt: string;
  cronExpression: string;
  nextRun: string;
  enabled: boolean;
  model: string;
}

export type ActiveModal =
  | null
  | 'settings'
  | 'providers'
  | 'memory'
  | 'export'
  | 'workspace-picker'
  | 'permission'
  | 'diff-review'
  | 'onboarding';

export type ActiveDrawer =
  | null
  | 'file-explorer'
  | 'history'
  | 'schedule'
  | 'terminal'
  | 'diff';
