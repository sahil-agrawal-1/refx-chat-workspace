import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import * as db from './database';

const DEFAULT_MEMORY_DIR = '%APPDATA%\\Refx AI\\memory';

function expandPath(p: string): string {
  return (p || DEFAULT_MEMORY_DIR).replace(/%APPDATA%/gi, app.getPath('appData'));
}

function safeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function atomicWrite(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

function getConfig(): any {
  const stored = db.getAppSettings()['memory_config'];
  const base = stored && typeof stored === 'object' ? (stored as any) : {};
  return {
    autoMemoryEnabled: base.autoMemoryEnabled ?? false,
    globalMemoryDirectory: base.globalMemoryDirectory || DEFAULT_MEMORY_DIR,
    storageBackend: 'sqlite' as any,
    maxEntries: base.maxEntries ?? 1000,
  };
}

function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function verifyDirIntegrity(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return true;
  const srcFiles: string[] = [];
  const destFiles: string[] = [];
  const walk = (dir: string, base: string, list: string[]) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(base, full);
      if (entry.isDirectory()) walk(full, base, list);
      else list.push(rel);
    }
  };
  walk(src, src, srcFiles);
  walk(dest, dest, destFiles);
  if (srcFiles.length !== destFiles.length) return false;
  for (const rel of srcFiles) {
    const s = fs.readFileSync(path.join(src, rel));
    const d = fs.readFileSync(path.join(dest, rel));
    if (!s.equals(d)) return false;
  }
  return true;
}

function migrateMemoryDirectory(newDirRaw: string): { success: boolean; error?: string } {
  const oldDir = memoryRoot();
  const newDir = expandPath(newDirRaw);
  if (path.resolve(oldDir).toLowerCase() === path.resolve(newDir).toLowerCase()) {
    return { success: true };
  }
  try {
    ensureDir(newDir);
    const testFile = path.join(newDir, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Destination not writable.' };
  }
  if (newDir.toLowerCase().startsWith(oldDir.toLowerCase() + path.sep.toLowerCase())) {
    return { success: false, error: 'Destination cannot be inside source directory.' };
  }
  try {
    const backupDir = path.join(oldDir, 'backups', 'pre-migration-' + Date.now());
    ensureDir(backupDir);
    copyDir(oldDir, backupDir);
    copyDir(oldDir, newDir);
    if (!verifyDirIntegrity(oldDir, newDir)) {
      return { success: false, error: 'Migration verification failed.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Migration failed.' };
  }
}

function updateConfig(config: any): any {
  const current = getConfig();
  const updated = { ...current, ...config };
  if (config.globalMemoryDirectory && expandPath(config.globalMemoryDirectory) !== expandPath(current.globalMemoryDirectory)) {
    const result = migrateMemoryDirectory(config.globalMemoryDirectory);
    if (!result.success) throw new Error(result.error || 'Migration failed.');
  }
  db.saveAppSetting('memory_config', updated);
  return updated;
}

function memoryRoot(): string {
  const cfg = getConfig();
  const root = expandPath(cfg.globalMemoryDirectory);
  ensureDir(root);
  ensureDir(path.join(root, 'app-memory'));
  ensureDir(path.join(root, 'tasks'));
  ensureDir(path.join(root, 'backups'));
  return root;
}

function taskDir(conversationId: string): string {
  return path.join(memoryRoot(), 'tasks', safeId(conversationId));
}

function readTaskEntries(conversationId: string): any[] {
  const metaPath = path.join(taskDir(conversationId), 'metadata.json');
  if (!fs.existsSync(metaPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTaskEntries(conversationId: string, entries: any[]): void {
  const dir = taskDir(conversationId);
  ensureDir(dir);
  atomicWrite(path.join(dir, 'metadata.json'), JSON.stringify(entries, null, 2));
  const md = entries.map((e) => `# ${e.title || ''}\n\n${e.content || ''}\n`).join('\n---\n\n');
  atomicWrite(path.join(dir, 'memory.md'), md);
}

export function getMemoryConfig(): any {
  return getConfig();
}

export function updateMemoryConfig(config: any): any {
  return updateConfig(config);
}

export function getTaskMemory(conversationId: string): any {
  const entries = readTaskEntries(conversationId);
  return entries.length ? entries[0] : null;
}

export function getTaskMemories(taskId: string): any[] {
  return readTaskEntries(taskId);
}

export function saveTaskMemory(entry: any): any {
  const entries = readTaskEntries(entry.taskId || 'default-task');
  const now = Date.now();
  const newEntry = {
    id: `task-mem-${now}-${Math.random().toString(36).slice(2, 8)}`,
    taskId: entry.taskId || 'default-task',
    title: entry.title || '',
    content: entry.content || '',
    tags: entry.tags || [],
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(newEntry);
  writeTaskEntries(newEntry.taskId, entries);
  return newEntry;
}

export function deleteTaskMemory(id: string): boolean {
  // find across task dirs
  const root = memoryRoot();
  const tasksPath = path.join(root, 'tasks');
  if (!fs.existsSync(tasksPath)) return false;
  for (const dir of fs.readdirSync(tasksPath)) {
    const metaPath = path.join(tasksPath, dir, 'metadata.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      const entries = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (!Array.isArray(entries)) continue;
      const idx = entries.findIndex((e: any) => e.id === id);
      if (idx >= 0) {
        entries.splice(idx, 1);
        fs.writeFileSync(metaPath, JSON.stringify(entries, null, 2), 'utf8');
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export function updateTaskMemory(conversationId: string, id: string, changes: any): any {
  const entries = readTaskEntries(conversationId);
  const idx = entries.findIndex((e: any) => e.id === id);
  if (idx < 0) return null;
  entries[idx] = { ...entries[idx], ...changes, updatedAt: Date.now() };
  writeTaskEntries(conversationId, entries);
  return entries[idx];
}

export function getAppMemories(): any[] {
  const filePath = path.join(memoryRoot(), 'app-memory', 'entries.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAppMemory(entry: any): any {
  const entries = getAppMemories();
  const now = Date.now();
  const newEntry = {
    id: `app-mem-${now}-${Math.random().toString(36).slice(2, 8)}`,
    category: entry.category || 'preference',
    title: entry.title || '',
    summary: entry.summary || '',
    details: entry.details || '',
    enabled: entry.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(newEntry);
  const filePath = path.join(memoryRoot(), 'app-memory', 'entries.json');
  atomicWrite(filePath, JSON.stringify(entries, null, 2));
  return newEntry;
}

export function deleteAppMemory(id: string): boolean {
  const entries = getAppMemories().filter((e: any) => e.id !== id);
  const filePath = path.join(memoryRoot(), 'app-memory', 'entries.json');
  atomicWrite(filePath, JSON.stringify(entries, null, 2));
  return true;
}

export function clearAppMemories(): boolean {
  const filePath = path.join(memoryRoot(), 'app-memory', 'entries.json');
  atomicWrite(filePath, '[]');
  return true;
}

export function toggleAppMemory(id: string): boolean {
  const entries = getAppMemories();
  const idx = entries.findIndex((e: any) => e.id === id);
  if (idx < 0) return false;
  entries[idx].enabled = !entries[idx].enabled;
  entries[idx].updatedAt = Date.now();
  const filePath = path.join(memoryRoot(), 'app-memory', 'entries.json');
  atomicWrite(filePath, JSON.stringify(entries, null, 2));
  return true;
}

export function backupMemory(): boolean {
  try {
    const root = memoryRoot();
    const backupDir = path.join(root, 'backups', `backup-${Date.now()}`);
    ensureDir(backupDir);
    // copy app-memory and tasks
    const copyDir = (src: string, dest: string) => {
      if (!fs.existsSync(src)) return;
      ensureDir(dest);
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
      }
    };
    copyDir(path.join(root, 'app-memory'), path.join(backupDir, 'app-memory'));
    copyDir(path.join(root, 'tasks'), path.join(backupDir, 'tasks'));
    return true;
  } catch {
    return false;
  }
}