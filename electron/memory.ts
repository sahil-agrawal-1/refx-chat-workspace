import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as db from './database';
import {
  buildMemoryContext,
  rankMemoryCandidates,
  redactSensitiveText,
  type MemoryCandidate,
} from '../shared/utils/memory-retrieval';
import * as embeddings from './embeddings';
import * as encryption from './encryption';
import {
  atomicWriteEncodedMemoryFile,
  atomicWriteMemoryFile,
  readMemoryJsonFile,
} from '../shared/utils/memory-file';
import type {
  MemoryRetrievalOptions,
  MemoryRetrievalResponse,
  MemoryRetrievalResult,
} from '../shared/contracts/desktop-bridge';
import {
  buildGovernanceSummary,
  type GovernanceMemory,
  type MemoryGovernanceSummary,
} from '../shared/utils/memory-governance';

const DEFAULT_MEMORY_DIR = '%APPDATA%\\Refx AI\\memory';

interface IndexSyncState {
  signature: string;
  indexedAt: number;
}

function expandPath(p: string): string {
  return (p || DEFAULT_MEMORY_DIR).replace(/%APPDATA%/gi, app.getPath('appData'));
}

function safeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Primary memory files are the source of truth. Encryption happens before any
 * filesystem mutation, so an encryption failure leaves the existing file (and
 * its recovery copies) untouched.
 */
function atomicWrite(filePath: string, content: string): void {
  atomicWriteMemoryFile(filePath, content, encryption.encryptText);
}

/**
 * Reads JSON from the primary file, then the pending temp file, then the last
 * known-good backup. Decryption failures fail closed instead of falling back
 * to empty data that a later save could overwrite.
 */
function readJsonFile<T>(filePath: string, fallback: T): T {
  return readMemoryJsonFile(filePath, fallback, encryption.memoryFileCodec());
}

function hashContent(...parts: string[]): string {
  const normalized = parts
    .map((part) => String(part || '').trim().toLowerCase().replace(/\s+/g, ' '))
    .join('\u0000');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function getConfig(): any {
  const stored = db.getAppSettings()['memory_config'];
  const base = stored && typeof stored === 'object' ? (stored as any) : {};
  return {
    autoMemoryEnabled: base.autoMemoryEnabled ?? false,
    globalMemoryDirectory: base.globalMemoryDirectory || DEFAULT_MEMORY_DIR,
    // Files remain the source of truth; SQLite is the derived search index.
    storageBackend:
      base.storageBackend === 'json_file' ? 'json_file' : 'file_index',
    maxEntries: base.maxEntries ?? 1000,
    retrievalTokenBudget: Math.min(Math.max(Number(base.retrievalTokenBudget) || 1200, 200), 16000),
    retrievalMaxResults: Math.min(Math.max(Number(base.retrievalMaxResults) || 8, 1), 30),
    encryptionEnabled: base.encryptionEnabled === true,
    encryptionAvailable: encryption.isEncryptionAvailable(),
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
  if (config?.encryptionEnabled === true && !encryption.isEncryptionAvailable()) {
    throw new Error(
      'Memory encryption cannot be enabled because OS secure storage is unavailable on this system.',
    );
  }
  const current = getConfig();
  // `encryptionAvailable` is a runtime capability probe, not a user setting.
  // Never persist it, or an old "true" could outlive the OS capability.
  const { encryptionAvailable: _runtimeAvailability, ...persistedCurrent } = current;
  const { encryptionAvailable: _ignoredAvailability, ...persistedPatch } = config || {};
  const updated = { ...persistedCurrent, ...persistedPatch };
  if (
    config.globalMemoryDirectory &&
    expandPath(config.globalMemoryDirectory) !== expandPath(current.globalMemoryDirectory)
  ) {
    const result = migrateMemoryDirectory(config.globalMemoryDirectory);
    if (!result.success) throw new Error(result.error || 'Migration failed.');
  }
  db.saveAppSetting('memory_config', updated);
  // The directory may have changed, so rebuild the derived index from the new
  // primary file location.
  syncMemoryIndexIfNeeded(true);
  // Return the effective config so callers see the current runtime capability.
  return getConfig();
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

function appEntriesPath(): string {
  return path.join(memoryRoot(), 'app-memory', 'entries.json');
}

function taskDir(conversationId: string): string {
  return path.join(memoryRoot(), 'tasks', safeId(conversationId));
}

function taskMetadataPath(conversationId: string): string {
  return path.join(taskDir(conversationId), 'metadata.json');
}

function readTaskEntries(conversationId: string): any[] {
  const metaPath = taskMetadataPath(conversationId);
  if (!fs.existsSync(metaPath)) return [];
  const parsed = readJsonFile<any>(metaPath, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeTaskEntries(conversationId: string, entries: any[]): void {
  const dir = taskDir(conversationId);
  ensureDir(dir);
  const metadata = JSON.stringify(entries, null, 2);
  const md = entries.map((e) => `# ${e.title || ''}\n\n${e.content || ''}\n`).join('\n---\n\n');
  // Encode both documents before touching either file so an encryption
  // failure cannot leave metadata.json updated while memory.md is not.
  const metadataPayload = encryption.encryptText(metadata);
  const mdPayload = encryption.encryptText(md);
  atomicWriteEncodedMemoryFile(path.join(dir, 'metadata.json'), metadataPayload);
  atomicWriteEncodedMemoryFile(path.join(dir, 'memory.md'), mdPayload);
}

function readAppEntries(): any[] {
  const filePath = appEntriesPath();
  if (!fs.existsSync(filePath)) return [];
  const parsed = readJsonFile<any>(filePath, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeAppEntries(entries: any[]): void {
  atomicWrite(appEntriesPath(), JSON.stringify(entries, null, 2));
}

function listTaskEntryFiles(): Array<{ taskId: string; entries: any[] }> {
  const tasksPath = path.join(memoryRoot(), 'tasks');
  if (!fs.existsSync(tasksPath)) return [];
  const result: Array<{ taskId: string; entries: any[] }> = [];
  for (const entry of fs.readdirSync(tasksPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(tasksPath, entry.name, 'metadata.json');
    if (!fs.existsSync(metaPath)) continue;
    const parsed = readJsonFile<any>(metaPath, []);
    if (Array.isArray(parsed)) result.push({ taskId: entry.name, entries: parsed });
  }
  return result;
}

// ---------------- SQLite index sync ----------------

function getIndexState(): IndexSyncState | null {
  const stored = db.getAppSettings()['memory_index_sync_state'];
  if (!stored || typeof stored !== 'object') return null;
  const state = stored as any;
  if (typeof state.signature !== 'string') return null;
  return { signature: state.signature, indexedAt: Number(state.indexedAt) || 0 };
}

function setIndexState(state: IndexSyncState): void {
  db.saveAppSetting('memory_index_sync_state', state);
}

function computeDiskSignature(): string {
  const root = memoryRoot();
  const parts: string[] = [path.resolve(root).toLowerCase()];

  const appPath = appEntriesPath();
  if (fs.existsSync(appPath)) {
    const stat = fs.statSync(appPath);
    parts.push(`app:${stat.size}:${stat.mtimeMs}`);
  }

  const tasksPath = path.join(root, 'tasks');
  if (fs.existsSync(tasksPath)) {
    const dirs = fs
      .readdirSync(tasksPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const dir of dirs) {
      const metaPath = path.join(tasksPath, dir, 'metadata.json');
      if (!fs.existsSync(metaPath)) continue;
      const stat = fs.statSync(metaPath);
      parts.push(`task:${dir}:${stat.size}:${stat.mtimeMs}`);
    }
  }

  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

function touchIndexState(): void {
  try {
    setIndexState({ signature: computeDiskSignature(), indexedAt: Date.now() });
  } catch {
    // Index freshness is an optimization; never block a memory write on it.
  }
}

function indexAppEntries(entries: any[]): void {
  const now = Date.now();
  const records: db.MemoryIndexRecord[] = entries.map((entry) => {
    const title = String(entry.title || '');
    const summary = String(entry.summary || '');
    const details = String(entry.details || '');
    const category = String(entry.category || 'preference');
    return {
      id: String(entry.id),
      scope: 'app',
      taskId: null,
      category,
      title,
      body: `${summary}\n${details}`.trim(),
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
      enabled: entry.enabled !== false,
      contentHash: entry.contentHash || hashContent(category, title, summary, details),
      source: 'app-memory/entries.json',
      payload: entry,
      createdAt: Number(entry.createdAt) || now,
      updatedAt: Number(entry.updatedAt) || now,
    };
  });
  db.replaceMemoryIndexRecords('app', null, records);
  touchIndexState();
}

function indexTaskEntries(taskId: string, entries: any[]): void {
  const now = Date.now();
  const indexedTaskId = safeId(taskId);
  const records: db.MemoryIndexRecord[] = entries.map((entry) => {
    const title = String(entry.title || '');
    const content = String(entry.content || '');
    return {
      id: String(entry.id),
      scope: 'task',
      taskId: indexedTaskId,
      category: entry.category ? String(entry.category) : null,
      title,
      body: content,
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
      enabled: entry.enabled !== false,
      contentHash: entry.contentHash || hashContent(title, content),
      source: `tasks/${indexedTaskId}/metadata.json`,
      payload: entry,
      createdAt: Number(entry.createdAt) || now,
      updatedAt: Number(entry.updatedAt) || now,
    };
  });
  db.replaceMemoryIndexRecords('task', indexedTaskId, records);
  touchIndexState();
}

export function rebuildMemoryIndex(): number {
  db.clearMemoryIndex();
  const appEntries = readAppEntries();
  indexAppEntries(appEntries);
  let indexed = appEntries.length;

  for (const task of listTaskEntryFiles()) {
    indexTaskEntries(task.taskId, task.entries);
    indexed += task.entries.length;
  }

  touchIndexState();
  db.logMemoryOperation('', 'app', 'reindex', 'rebuildMemoryIndex');
  return indexed;
}

export function syncMemoryIndexIfNeeded(force = false): boolean {
  if (!db.isDatabaseInitialized()) return false;
  try {
    const signature = computeDiskSignature();
    const state = getIndexState();
    const count = db.countMemoryIndex();
    if (!force && state && state.signature === signature && count > 0) {
      return false;
    }
    rebuildMemoryIndex();
    return true;
  } catch (err) {
    console.error('[Memory] Failed to synchronize memory index:', err);
    return false;
  }
}

export function initializeMemoryIndex(): {
  success: boolean;
  indexed: number;
  fts: boolean;
  rebuilt: boolean;
  error?: string;
} {
  try {
    const fts = db.ensureMemorySearch();
    const rebuilt = syncMemoryIndexIfNeeded(false);
    if (fts) db.rebuildMemoryFtsFromIndex();
    return { success: true, indexed: db.countMemoryIndex(), fts, rebuilt };
  } catch (err: any) {
    return {
      success: false,
      indexed: 0,
      fts: false,
      rebuilt: false,
      error: err?.message || String(err),
    };
  }
}

export function forceRebuildMemoryIndex(): {
  success: boolean;
  indexed: number;
  fts: boolean;
  rebuilt: boolean;
  error?: string;
} {
  try {
    const fts = db.ensureMemorySearch();
    const indexed = rebuildMemoryIndex();
    if (fts) db.rebuildMemoryFtsFromIndex();
    return { success: true, indexed, fts, rebuilt: true };
  } catch (err: any) {
    return {
      success: false,
      indexed: 0,
      fts: false,
      rebuilt: false,
      error: err?.message || String(err),
    };
  }
}

// ---------------- Config ----------------

export function getMemoryConfig(): any {
  return getConfig();
}

export function updateMemoryConfig(config: any): any {
  return updateConfig(config);
}

// ---------------- Task memory ----------------

export function getTaskMemory(conversationId: string): any {
  const entries = readTaskEntries(conversationId);
  return entries.length ? entries[0] : null;
}

export function getTaskMemories(taskId: string): any[] {
  return readTaskEntries(taskId);
}

export function saveTaskMemory(entry: any): any {
  syncMemoryIndexIfNeeded();
  const taskId = entry.taskId || 'default-task';
  const entries = readTaskEntries(taskId);
  const now = Date.now();
  const title = redactSensitiveText(entry.title || '');
  const content = redactSensitiveText(entry.content || '');
  const tags = Array.isArray(entry.tags)
    ? entry.tags.map((tag: any) => redactSensitiveText(String(tag)))
    : [];
  const contentHash = hashContent(title, content);

  const duplicate = db.findMemoryIndexByHash('task', safeId(taskId), contentHash);
  if (duplicate) return duplicate;

  const newEntry = {
    id: `task-mem-${now}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    title,
    content,
    tags,
    contentHash,
    confidence: typeof entry.confidence === 'number' ? entry.confidence : 0.75,
    usageCount: 0,
    lastUsedAt: 0,
    expiresAt: typeof entry.expiresAt === 'number' ? entry.expiresAt : undefined,
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(newEntry);
  writeTaskEntries(taskId, entries);
  indexTaskEntries(taskId, entries);
  db.logMemoryOperation(newEntry.id, 'task', 'create', 'saveTaskMemory');
  return newEntry;
}

export function deleteTaskMemory(id: string): boolean {
  const tasksPath = path.join(memoryRoot(), 'tasks');
  if (!fs.existsSync(tasksPath)) return false;
  for (const task of listTaskEntryFiles()) {
    const idx = task.entries.findIndex((entry: any) => entry.id === id);
    if (idx < 0) continue;
    task.entries.splice(idx, 1);
    writeTaskEntries(task.taskId, task.entries);
    indexTaskEntries(task.taskId, task.entries);
    db.logMemoryOperation(id, 'task', 'delete', 'deleteTaskMemory');
    db.deleteMemoryEmbedding(id);
    return true;
  }
  return false;
}

export function updateTaskMemory(conversationId: string, id: string, changes: any): any {
  const entries = readTaskEntries(conversationId);
  const idx = entries.findIndex((entry: any) => entry.id === id);
  if (idx < 0) return null;
  const previous = { ...entries[idx] };
  const updated = { ...entries[idx], ...changes, updatedAt: Date.now() };
  updated.title = redactSensitiveText(updated.title || '');
  updated.content = redactSensitiveText(updated.content || '');
  updated.contentHash = hashContent(updated.title || '', updated.content || '');
  entries[idx] = updated;
  writeTaskEntries(conversationId, entries);
  indexTaskEntries(conversationId, entries);
  db.logMemoryOperation(id, 'task', 'update', 'updateTaskMemory');
  db.saveMemoryVersion(id, 'task', safeId(conversationId), previous);
  void embeddings.embedMemory(id, 'task', safeId(conversationId), `${updated.title}\n${updated.content}`);
  return updated;
}

// ---------------- App memory ----------------

export function getAppMemories(): any[] {
  return readAppEntries().map((entry) => ({
    ...entry,
    enabled: entry.enabled !== false,
  }));
}

function fallbackSearchMemories(query: string, category?: string): any[] {
  const q = String(query || '').toLowerCase().trim();
  const results: any[] = [];

  for (const memory of getAppMemories()) {
    if (memory.enabled === false) continue;
    if (category && memory.category !== category) continue;
    const hay = `${memory.title || ''} ${memory.summary || ''} ${memory.details || ''}`.toLowerCase();
    if (!q || hay.includes(q)) results.push({ scope: 'app', ...memory });
  }

  for (const task of listTaskEntryFiles()) {
    for (const entry of task.entries) {
      if (category && entry.category !== category) continue;
      const hay = `${entry.title || ''} ${entry.content || ''}`.toLowerCase();
      if (!q || hay.includes(q)) results.push({ scope: 'task', taskId: task.taskId, ...entry });
    }
  }

  return results.slice(0, 20);
}

export function searchMemories(query: string, category?: string): any[] {
  const rawQuery = String(query || '').trim();
  syncMemoryIndexIfNeeded();

  try {
    const rows = db.searchMemoryIndex(rawQuery, { category, limit: 60 });
    if (rows.length > 0 || !rawQuery) {
      return rankMemoryCandidates(rows.map(toMemoryCandidate), {
        query: rawQuery,
        now: Date.now(),
      }).slice(0, 20);
    }
  } catch (err) {
    console.error('[Memory] Indexed search failed; falling back to files:', err);
  }

  return fallbackSearchMemories(rawQuery, category);
}

function toMemoryCandidate(row: any): MemoryCandidate {
  return {
    id: String(row.id),
    scope: row.scope === 'task' ? 'task' : 'app',
    taskId: row.taskId,
    category: row.category,
    title: row.title,
    summary: row.summary,
    details: row.details,
    content: row.content,
    tags: Array.isArray(row.tags) ? row.tags : [],
    confidence: row.confidence,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
    rank: row.rank,
  };
}

function markMemoriesUsed(results: MemoryRetrievalResult[]): void {
  if (!results.length) return;
  const now = Date.now();
  const appIds = new Set<string>();
  const taskGroups = new Map<string, Set<string>>();

  for (const result of results) {
    if (result.scope === 'app') {
      appIds.add(result.id);
    } else if (result.scope === 'task' && result.taskId) {
      const ids = taskGroups.get(result.taskId) || new Set<string>();
      ids.add(result.id);
      taskGroups.set(result.taskId, ids);
    }
  }

  if (appIds.size > 0) {
    const entries = readAppEntries();
    let changed = false;
    for (const entry of entries) {
      if (!appIds.has(String(entry.id))) continue;
      entry.usageCount = Math.max(0, Number(entry.usageCount) || 0) + 1;
      entry.lastUsedAt = now;
      changed = true;
    }
    if (changed) {
      writeAppEntries(entries);
      indexAppEntries(entries);
    }
  }

  for (const [taskId, ids] of taskGroups) {
    const entries = readTaskEntries(taskId);
    let changed = false;
    for (const entry of entries) {
      if (!ids.has(String(entry.id))) continue;
      entry.usageCount = Math.max(0, Number(entry.usageCount) || 0) + 1;
      entry.lastUsedAt = now;
      changed = true;
    }
    if (changed) {
      writeTaskEntries(taskId, entries);
      indexTaskEntries(taskId, entries);
    }
  }
}

/**
 * Ranked, token-budgeted retrieval used for per-message context injection and
 * for the search_memory tool. The result carries retrieval reasons so the UI
 * can explain why a memory was selected.
 */
export async function retrieveMemories(options: MemoryRetrievalOptions): Promise<MemoryRetrievalResponse> {
  const query = String(options?.query || '').trim();
  const config = getConfig();
  const tokenBudget = Math.min(
    Math.max(Number(options?.tokenBudget) || Number(config.retrievalTokenBudget) || 1200, 200),
    16000
  );
  const maxResults = Math.min(
    Math.max(Number(options?.maxResults) || Number(config.retrievalMaxResults) || 8, 1),
    30
  );
  const currentTaskId = options?.conversationId ? safeId(options.conversationId) : null;
  const includeApp = options?.includeAppMemory !== false;
  const includeTask = options?.includeTaskMemory !== false;
  const recallIntent = /previous project|requirements|preference|remember|earlier|before|last time|other conversation/i.test(
    query
  );
  const includeCrossTask = options?.includeCrossTask ?? recallIntent;

  syncMemoryIndexIfNeeded();

  const candidates = new Map<string, MemoryCandidate>();
  const addRows = (rows: any[]) => {
    for (const row of rows) {
      if (!row || !row.id || candidates.has(String(row.id))) continue;
      candidates.set(String(row.id), toMemoryCandidate(row));
    }
  };

  if (includeApp) {
    addRows(db.searchMemoryIndex(query, { scope: 'app', limit: 60 }));
    if (query) addRows(db.searchMemoryIndex('', { scope: 'app', limit: 30 }));
  }

  if (includeTask) {
    if (currentTaskId) {
      addRows(db.searchMemoryIndex(query, { scope: 'task', taskId: currentTaskId, limit: 60 }));
      if (query) addRows(db.searchMemoryIndex('', { scope: 'task', taskId: currentTaskId, limit: 30 }));
    }
    if (includeCrossTask) {
      addRows(db.searchMemoryIndex(query, { scope: 'task', limit: 60 }));
    }
  }

  const embeddingEnabled = embeddings.isEmbeddingEnabled();
  let queryEmbedding: number[] | null = null;
  if (embeddingEnabled && query) {
    try {
      queryEmbedding = await Promise.race([
        embeddings.getQueryEmbedding(query),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
    } catch {
      queryEmbedding = null;
    }
  }

  const candidateList = [...candidates.values()];
  if (embeddingEnabled) {
    for (const candidate of candidateList) {
      const cached = db.getMemoryEmbedding(candidate.id);
      if (cached && Array.isArray(cached.vector) && cached.vector.length > 0) {
        candidate.embedding = cached.vector;
      } else {
        // Fire-and-forget compute for future retrievals.
        const text = candidate.scope === 'task'
          ? `${candidate.title || ''}\n${candidate.content || ''}`
          : `${candidate.title || ''}\n${candidate.summary || ''}\n${candidate.details || ''}`;
        void embeddings.embedMemory(candidate.id, candidate.scope, candidate.taskId || null, text);
      }
    }
  }

  const ranked = rankMemoryCandidates(candidateList, {
    query,
    currentTaskId,
    now: Date.now(),
    queryEmbedding,
  }).slice(0, maxResults);

  const packed = buildMemoryContext(ranked, tokenBudget);

  if (options?.trackUsage !== false && packed.usedResults.length > 0) {
    try {
      markMemoriesUsed(packed.usedResults);
    } catch (err) {
      console.error('[Memory] Failed to record memory usage:', err);
    }
  }

  try {
    db.logMemoryRetrieval(
      options?.conversationId || null,
      query,
      packed.usedResults.map((result) => result.id),
      tokenBudget,
      packed.usedTokens
    );
  } catch (err) {
    console.error('[Memory] Failed to record retrieval event:', err);
  }

  return {
    results: packed.usedResults,
    context: packed.context,
    usedTokens: packed.usedTokens,
    budgetTokens: tokenBudget,
    totalCandidates: candidates.size,
  };
}

export function saveAppMemory(entry: any): any {
  syncMemoryIndexIfNeeded();
  const entries = readAppEntries();
  const now = Date.now();
  const category = entry.category || 'preference';
  const title = redactSensitiveText(entry.title || '');
  const summary = redactSensitiveText(entry.summary || '');
  const details = redactSensitiveText(entry.details || '');
  const contentHash = hashContent(category, title, summary, details);

  const duplicate = db.findMemoryIndexByHash('app', null, contentHash);
  if (duplicate) return duplicate;

  const newEntry = {
    id: `app-mem-${now}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    title,
    summary,
    details,
    enabled: entry.enabled ?? true,
    contentHash,
    confidence: typeof entry.confidence === 'number' ? entry.confidence : 0.7,
    usageCount: 0,
    lastUsedAt: 0,
    expiresAt: typeof entry.expiresAt === 'number' ? entry.expiresAt : undefined,
    createdAt: now,
    updatedAt: now,
  };
  entries.unshift(newEntry);
  writeAppEntries(entries);
  indexAppEntries(entries);
  db.logMemoryOperation(newEntry.id, 'app', 'create', 'saveAppMemory');
  return newEntry;
}

export function deleteAppMemory(id: string): boolean {
  const entries = readAppEntries().filter((entry: any) => entry.id !== id);
  writeAppEntries(entries);
  indexAppEntries(entries);
  db.logMemoryOperation(id, 'app', 'delete', 'deleteAppMemory');
  return true;
}

export function updateAppMemory(id: string, changes: any): any {
  const entries = readAppEntries();
  const idx = entries.findIndex((entry: any) => entry.id === id);
  if (idx < 0) return null;
  const previous = { ...entries[idx] };
  const updated = { ...entries[idx], ...changes, updatedAt: Date.now() };
  if (typeof updated.title === 'string') updated.title = redactSensitiveText(updated.title);
  if (typeof updated.summary === 'string') updated.summary = redactSensitiveText(updated.summary);
  if (typeof updated.details === 'string') updated.details = redactSensitiveText(updated.details);
  updated.contentHash = hashContent(updated.category || 'preference', updated.title || '', updated.summary || '', updated.details || '');
  entries[idx] = updated;
  writeAppEntries(entries);
  indexAppEntries(entries);
  db.logMemoryOperation(id, 'app', 'update', 'updateAppMemory');
  db.saveMemoryVersion(id, 'app', null, previous);
  return updated;
}

export function clearAppMemories(): boolean {
  writeAppEntries([]);
  db.clearMemoryIndex('app');
  touchIndexState();
  db.logMemoryOperation('', 'app', 'clear', 'clearAppMemories');
  return true;
}

export function toggleAppMemory(id: string): boolean {
  const entries = readAppEntries();
  const idx = entries.findIndex((entry: any) => entry.id === id);
  if (idx < 0) return false;
  entries[idx].enabled = entries[idx].enabled === false;
  entries[idx].updatedAt = Date.now();
  writeAppEntries(entries);
  indexAppEntries(entries);
  db.logMemoryOperation(id, 'app', 'update', 'toggleAppMemory');
  return true;
}

// ---------------- Memory governance ----------------

function collectGovernanceEntries(): GovernanceMemory[] {
  const appEntries: GovernanceMemory[] = readAppEntries().map((entry: any) => ({
    ...entry,
    scope: 'app' as const,
  }));
  const taskEntries: GovernanceMemory[] = [];
  for (const task of listTaskEntryFiles()) {
    for (const entry of task.entries) {
      taskEntries.push({
        ...entry,
        scope: 'task' as const,
        taskId: task.taskId,
      });
    }
  }
  return [...appEntries, ...taskEntries];
}

/** Detects duplicate/contradictory memories and flags low-confidence/expired items. */
export function getMemoryGovernance(): MemoryGovernanceSummary {
  const dismissed = db.getMemoryReviewStates('dismissed').map((row) => row.pairKey);
  return buildGovernanceSummary(collectGovernanceEntries(), {
    dismissedPairKeys: dismissed,
  });
}

export function dismissMemoryConflict(pairKey: string): boolean {
  if (!pairKey) return false;
  return db.setMemoryReviewState(pairKey, 'dismissed');
}

/**
 * Resolves a conflict by deleting the memory the user did not keep. The
 * remaining memory keeps its content untouched.
 */
export function resolveMemoryConflict(pairKey: string, keepId: string): boolean {
  const conflict = getMemoryGovernance().conflicts.find((item) => item.pairKey === pairKey);
  if (!conflict || !keepId) return false;
  const discard = conflict.left.id === keepId ? conflict.right : conflict.left;
  if (discard.id === keepId) return false;
  const removed = discard.scope === 'task' ? deleteTaskMemory(discard.id) : deleteAppMemory(discard.id);
  if (!removed) return false;
  db.setMemoryReviewState(pairKey, 'resolved');
  return true;
}

/** Marks a low-confidence memory as reviewed by raising its confidence. */
export function confirmMemory(id: string, scope: 'app' | 'task', taskId?: string): boolean {
  if (scope === 'app') {
    const entries = readAppEntries();
    const idx = entries.findIndex((entry: any) => entry.id === id);
    if (idx < 0) return false;
    entries[idx].confidence = 0.85;
    entries[idx].updatedAt = Date.now();
    writeAppEntries(entries);
    indexAppEntries(entries);
    db.logMemoryOperation(id, 'app', 'update', 'confirmMemory');
    return true;
  }
  if (!taskId) return false;
  const updated = updateTaskMemory(taskId, id, { confidence: 0.85 });
  return Boolean(updated);
}

/** Deletes every expired memory. Returns the number of removed entries. */
export function purgeExpiredMemories(): number {
  const now = Date.now();
  const isExpired = (entry: any) =>
    typeof entry.expiresAt === 'number' && entry.expiresAt > 0 && entry.expiresAt <= now;

  const appEntries = readAppEntries();
  const keptApp = appEntries.filter((entry: any) => !isExpired(entry));
  let removed = appEntries.length - keptApp.length;
  if (removed > 0) {
    for (const entry of appEntries) {
      if (isExpired(entry)) db.logMemoryOperation(entry.id, 'app', 'delete', 'purgeExpiredMemories');
    }
    writeAppEntries(keptApp);
    indexAppEntries(keptApp);
  }

  for (const task of listTaskEntryFiles()) {
    const kept = task.entries.filter((entry: any) => !isExpired(entry));
    if (kept.length === task.entries.length) continue;
    for (const entry of task.entries) {
      if (isExpired(entry)) db.logMemoryOperation(entry.id, 'task', 'delete', 'purgeExpiredMemories');
    }
    removed += task.entries.length - kept.length;
    writeTaskEntries(task.taskId, kept);
    indexTaskEntries(task.taskId, kept);
  }

  return removed;
}

export function getMemoryVersions(memoryId: string): any[] {
  return db.getMemoryVersions(memoryId);
}

export function restoreMemoryVersion(memoryId: string, versionId: string): boolean {
  const version = db.getMemoryVersion(versionId);
  if (!version || version.memoryId !== memoryId) return false;
  const snapshot = version.snapshot || {};
  if (version.scope === 'app') {
    const updated = updateAppMemory(memoryId, snapshot);
    return Boolean(updated);
  }
  if (!version.taskId) return false;
  const updated = updateTaskMemory(version.taskId, memoryId, snapshot);
  return Boolean(updated);
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


// ---------------- Secure local backup / restore ----------------

export function exportMemoryBackup(): { success: boolean; path?: string; error?: string } {
  try {
    const source = memoryRoot();
    ensureDir(source);
    const backupRoot = path.join(app.getPath('appData'), 'Refx AI', 'memory-backups');
    ensureDir(backupRoot);
    const destination = path.join(backupRoot, `memory-backup-${Date.now()}`);
    ensureDir(destination);
    copyDir(source, destination);
    return { success: true, path: destination };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create memory backup.' };
  }
}

export function restoreMemoryBackup(backupPath: string): { success: boolean; error?: string } {
  const resolved = path.resolve(String(backupPath || ''));
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return { success: false, error: 'Backup folder does not exist.' };
  }
  const hasMemoryData =
    fs.existsSync(path.join(resolved, 'app-memory')) ||
    fs.existsSync(path.join(resolved, 'tasks')) ||
    fs.existsSync(path.join(resolved, 'memory_config.json'));
  if (!hasMemoryData) {
    return { success: false, error: 'The selected folder is not a Refx memory backup.' };
  }

  const target = memoryRoot();
  const safetyPath = `${target}.pre-restore-${Date.now()}`;
  try {
    if (fs.existsSync(target)) {
      fs.renameSync(target, safetyPath);
    }
    ensureDir(target);
    copyDir(resolved, target);
    syncMemoryIndexIfNeeded(true);
    return { success: true };
  } catch (err: any) {
    // Restore the previous data if the replacement failed.
    try {
      if (fs.existsSync(safetyPath)) {
        if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
        fs.renameSync(safetyPath, target);
      }
    } catch {
      // ignore secondary failure
    }
    return { success: false, error: err?.message || 'Failed to restore memory backup.' };
  }
}
