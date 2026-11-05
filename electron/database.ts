import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

export interface PersistedConversation {
  id: string;
  title: string;
  providerId: string;
  modelId: string;
  workspacePath: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown> | null;
}

export interface PersistedMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  messageType: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown> | null;
}

let db: Database.Database | null = null;
let dbPath: string | null = null;
let initialized = false;

const MIGRATIONS: Array<{ version: number; name: string; sql: string }> = [
  {
    version: 4,
    name: 'memory_retrieval_log',
    sql: `
      CREATE TABLE IF NOT EXISTS memory_retrieval_log (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        query TEXT NOT NULL,
        selected_ids TEXT NOT NULL,
        token_budget INTEGER NOT NULL,
        used_tokens INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memory_retrieval_conversation
        ON memory_retrieval_log(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_memory_retrieval_created
        ON memory_retrieval_log(created_at);
    `,
  },
  {
    version: 3,
    name: 'memory_index',
    sql: `
      CREATE TABLE IF NOT EXISTS memory_index (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        task_id TEXT,
        category TEXT,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 1,
        content_hash TEXT,
        source TEXT,
        payload TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memory_index_scope ON memory_index(scope);
      CREATE INDEX IF NOT EXISTS idx_memory_index_task ON memory_index(task_id);
      CREATE INDEX IF NOT EXISTS idx_memory_index_updated ON memory_index(updated_at);
      CREATE INDEX IF NOT EXISTS idx_memory_index_hash ON memory_index(scope, content_hash);

      CREATE TABLE IF NOT EXISTS memory_operation_log (
        id TEXT PRIMARY KEY,
        memory_id TEXT,
        scope TEXT NOT NULL,
        operation TEXT NOT NULL,
        source TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memory_oplog_memory ON memory_operation_log(memory_id);
      CREATE INDEX IF NOT EXISTS idx_memory_oplog_created ON memory_operation_log(created_at);
    `,
  },
  {
    version: 2,
    name: 'memory_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS task_memories (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_task_memories_task ON task_memories(task_id);
    `,
  },
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        provider_id TEXT,
        model_id TEXT,
        workspace_path TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        message_type TEXT NOT NULL DEFAULT 'assistant',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS operation_history (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
        ON messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated
        ON conversations(updated_at);
      CREATE INDEX IF NOT EXISTS idx_operation_history_conversation
        ON operation_history(conversation_id);
    `,
  },
];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function applyPragmas(database: Database.Database): void {
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  database.pragma('synchronous = NORMAL');
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    database
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row: any) => Number(row.version))
  );

  const pending = MIGRATIONS.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);

  if (pending.length === 0) return;

  const transaction = database.transaction(() => {
    for (const migration of pending) {
      database.exec(migration.sql);
      database
        .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(migration.version, Date.now());
    }
  });

  transaction();
}

// ---------------- Memory index / search ----------------

let memoryFtsAvailable = false;

/**
 * Creates the FTS5 side-index used for fast memory retrieval. FTS5 is part of
 * the SQLite build shipped with better-sqlite3, but we still guard creation so
 * a stripped-down build can fall back to indexed LIKE queries.
 */
export function ensureMemorySearch(): boolean {
  const database = getDatabase();
  if (!database) {
    memoryFtsAvailable = false;
    return false;
  }
  try {
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts
      USING fts5(title, body, tags, tokenize='unicode61');
    `);
    memoryFtsAvailable = true;
  } catch (err) {
    memoryFtsAvailable = false;
    console.error('[DB] FTS5 unavailable; memory search will use LIKE fallback:', err);
  }
  return memoryFtsAvailable;
}

export function isMemoryFtsAvailable(): boolean {
  return memoryFtsAvailable;
}

function recoverCorruptDatabase(corruptPath: string): void {
  try {
    const backupName = `${path.basename(corruptPath)}.corrupt-${Date.now()}`;
    const backupPath = path.join(path.dirname(corruptPath), backupName);
    if (fs.existsSync(corruptPath)) {
      fs.renameSync(corruptPath, backupPath);
    }
    // Remove sidecar files
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const sidecar = corruptPath + suffix;
      if (fs.existsSync(sidecar)) {
        try {
          fs.renameSync(sidecar, backupPath + suffix);
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error('[DB] Failed to move corrupt database:', err);
  }
}

export function initDatabase(): { success: boolean; path: string; error?: string } {
  if (initialized && db) {
    return { success: true, path: dbPath || '' };
  }

  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  ensureDir(dataDir);
  const targetPath = path.join(dataDir, 'refx.sqlite');
  dbPath = targetPath;

  // Check integrity of existing database before opening
  if (fs.existsSync(targetPath)) {
    try {
      const testDb = new Database(targetPath, { readonly: true, fileMustExist: true });
      const result = testDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
      testDb.close();
      const ok = Array.isArray(result) && result.length > 0 && result[0].integrity_check === 'ok';
      if (!ok) {
        console.error('[DB] Integrity check failed, recovering.');
        recoverCorruptDatabase(targetPath);
      }
    } catch (err) {
      console.error('[DB] Could not open existing database for integrity check:', err);
      recoverCorruptDatabase(targetPath);
    }
  }

  try {
    db = new Database(targetPath);
    applyPragmas(db);
    runMigrations(db);
    ensureMemorySearch();
    initialized = true;
    return { success: true, path: targetPath };
  } catch (err: any) {
    console.error('[DB] Failed to initialize database:', err);
    // Attempt recovery once
    try {
      recoverCorruptDatabase(targetPath);
      db = new Database(targetPath);
      applyPragmas(db);
      runMigrations(db);
      ensureMemorySearch();
      initialized = true;
      return { success: true, path: targetPath };
    } catch (err2: any) {
      db = null;
      initialized = false;
      return { success: false, path: targetPath, error: err2?.message || String(err2) };
    }
  }
}

export function getDatabase(): Database.Database | null {
  if (!db) {
    initDatabase();
  }
  return db;
}

export function getDatabasePath(): string {
  if (!dbPath) {
    dbPath = path.join(app.getPath('userData'), 'data', 'refx.sqlite');
  }
  return dbPath;
}

export function closeDatabase(): void {
  if (db) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // ignore
    }
    try {
      db.close();
    } catch {
      // ignore
    }
    db = null;
    initialized = false;
  }
}

export function isDatabaseInitialized(): boolean {
  return initialized && db !== null;
}

function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stringifyMetadata(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

// ---------------- Conversations ----------------

export function getConversations(): PersistedConversation[] {
  const database = getDatabase();
  if (!database) return [];
  const rows = database
    .prepare(
      'SELECT id, title, provider_id, model_id, workspace_path, created_at, updated_at, metadata FROM conversations ORDER BY updated_at DESC'
    )
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    providerId: r.provider_id || '',
    modelId: r.model_id || '',
    workspacePath: r.workspace_path || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    metadata: parseMetadata(r.metadata),
  }));
}

export function getConversation(id: string): PersistedConversation | null {
  const database = getDatabase();
  if (!database) return null;
  const r = database
    .prepare(
      'SELECT id, title, provider_id, model_id, workspace_path, created_at, updated_at, metadata FROM conversations WHERE id = ?'
    )
    .get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    providerId: r.provider_id || '',
    modelId: r.model_id || '',
    workspacePath: r.workspace_path || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    metadata: parseMetadata(r.metadata),
  };
}

export function createConversation(data: Partial<PersistedConversation> & { id: string; title?: string }): PersistedConversation {
  const database = getDatabase();
  if (!database) throw new Error('Database not available');
  const now = Date.now();
  const conversation: PersistedConversation = {
    id: data.id,
    title: data.title || 'New Conversation',
    providerId: data.providerId || '',
    modelId: data.modelId || '',
    workspacePath: data.workspacePath || null,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    metadata: data.metadata || null,
  };

  const stmt = database.prepare(`
    INSERT INTO conversations (id, title, provider_id, model_id, workspace_path, created_at, updated_at, metadata)
    VALUES (@id, @title, @providerId, @modelId, @workspacePath, @createdAt, @updatedAt, @metadata)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      provider_id = excluded.provider_id,
      model_id = excluded.model_id,
      workspace_path = excluded.workspace_path,
      updated_at = excluded.updated_at,
      metadata = excluded.metadata
  `);
  stmt.run({
    id: conversation.id,
    title: conversation.title,
    providerId: conversation.providerId,
    modelId: conversation.modelId,
    workspacePath: conversation.workspacePath,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    metadata: stringifyMetadata(conversation.metadata),
  });
  return conversation;
}

export function updateConversation(id: string, changes: Partial<PersistedConversation>): PersistedConversation | null {
  const existing = getConversation(id);
  if (!existing) return null;
  const database = getDatabase();
  if (!database) return null;

  const updated: PersistedConversation = {
    ...existing,
    ...changes,
    id,
    updatedAt: changes.updatedAt || Date.now(),
  };

  database
    .prepare(
      `UPDATE conversations SET title = ?, provider_id = ?, model_id = ?, workspace_path = ?, created_at = ?, updated_at = ?, metadata = ? WHERE id = ?`
    )
    .run(
      updated.title,
      updated.providerId,
      updated.modelId,
      updated.workspacePath,
      updated.createdAt,
      updated.updatedAt,
      stringifyMetadata(updated.metadata),
      id
    );
  return updated;
}

export function deleteConversation(id: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const result = database.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return result.changes > 0;
}

export function searchConversations(query: string): PersistedConversation[] {
  const database = getDatabase();
  if (!database) return [];
  const q = `%${query.toLowerCase()}%`;
  const rows = database
    .prepare(
      `SELECT DISTINCT c.id, c.title, c.provider_id, c.model_id, c.workspace_path, c.created_at, c.updated_at, c.metadata
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE LOWER(c.title) LIKE ? OR LOWER(m.content) LIKE ?
       ORDER BY c.updated_at DESC`
    )
    .all(q, q) as any[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    providerId: r.provider_id || '',
    modelId: r.model_id || '',
    workspacePath: r.workspace_path || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    metadata: parseMetadata(r.metadata),
  }));
}

// ---------------- Messages ----------------

export function getMessages(conversationId: string): PersistedMessage[] {
  const database = getDatabase();
  if (!database) return [];
  const rows = database
    .prepare(
      'SELECT id, conversation_id, role, content, message_type, created_at, updated_at, metadata FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    )
    .all(conversationId) as any[];
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role,
    content: r.content,
    messageType: r.message_type,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    metadata: parseMetadata(r.metadata),
  }));
}

export function saveMessage(message: Partial<PersistedMessage> & { id: string; conversationId: string }): PersistedMessage {
  const database = getDatabase();
  if (!database) throw new Error('Database not available');
  const now = Date.now();
  const existing = database.prepare('SELECT created_at FROM messages WHERE id = ?').get(message.id) as any;
  const createdAt = message.createdAt || (existing ? existing.created_at : now);
  const updatedAt = message.updatedAt || now;

  const record: PersistedMessage = {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role || 'assistant',
    content: message.content || '',
    messageType: message.messageType || message.role || 'assistant',
    createdAt,
    updatedAt,
    metadata: message.metadata || null,
  };

  database
    .prepare(
      `INSERT INTO messages (id, conversation_id, role, content, message_type, created_at, updated_at, metadata)
       VALUES (@id, @conversationId, @role, @content, @messageType, @createdAt, @updatedAt, @metadata)
       ON CONFLICT(id) DO UPDATE SET
         conversation_id = excluded.conversation_id,
         role = excluded.role,
         content = excluded.content,
         message_type = excluded.message_type,
         updated_at = excluded.updated_at,
         metadata = excluded.metadata`
    )
    .run({
      id: record.id,
      conversationId: record.conversationId,
      role: record.role,
      content: record.content,
      messageType: record.messageType,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      metadata: stringifyMetadata(record.metadata),
    });
  return record;
}

export function updateMessage(id: string, changes: Partial<PersistedMessage>): PersistedMessage | null {
  const database = getDatabase();
  if (!database) return null;
  const row = database.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
  if (!row) return null;

  const existing: PersistedMessage = {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    messageType: row.message_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: parseMetadata(row.metadata),
  };

  const updated: PersistedMessage = {
    ...existing,
    ...changes,
    id,
    updatedAt: changes.updatedAt || Date.now(),
  };

  database
    .prepare(
      `UPDATE messages SET conversation_id = ?, role = ?, content = ?, message_type = ?, created_at = ?, updated_at = ?, metadata = ? WHERE id = ?`
    )
    .run(
      updated.conversationId,
      updated.role,
      updated.content,
      updated.messageType,
      updated.createdAt,
      updated.updatedAt,
      stringifyMetadata(updated.metadata),
      id
    );
  return updated;
}

export function deleteMessage(id: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const result = database.prepare('DELETE FROM messages WHERE id = ?').run(id);
  return result.changes > 0;
}

// ---------------- Settings ----------------

export function getAppSettings(): Record<string, unknown> {
  const database = getDatabase();
  if (!database) return {};
  const rows = database.prepare('SELECT key, value FROM app_settings').all() as any[];
  const result: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      result[r.key] = JSON.parse(r.value);
    } catch {
      result[r.key] = r.value;
    }
  }
  return result;
}

export function saveAppSetting(key: string, value: unknown): boolean {
  const database = getDatabase();
  if (!database) return false;
  database
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, JSON.stringify(value), Date.now());
  return true;
}

// ---------------- Operation history ----------------

export function recordOperation(conversationId: string | null, operationType: string, status: string): void {
  const database = getDatabase();
  if (!database) return;
  database
    .prepare('INSERT INTO operation_history (id, conversation_id, operation_type, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(`op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, conversationId, operationType, status, Date.now());
}

// ---------------- Backup / Restore ----------------

export async function exportDatabaseBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  const database = getDatabase();
  if (!database) return { success: false, error: 'Database not available' };

  const backupsDir = path.join(app.getPath('userData'), 'backups');
  ensureDir(backupsDir);
  const backupPath = path.join(backupsDir, `refx-backup-${Date.now()}.sqlite`);

  try {
    // Checkpoint WAL before backup
    database.pragma('wal_checkpoint(TRUNCATE)');
    await database.backup(backupPath);
    return { success: true, path: backupPath };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export function validateDatabaseFile(filePath: string): { valid: boolean; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }
  let testDb: Database.Database | null = null;
  try {
    testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const result = testDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
    const ok = Array.isArray(result) && result.length > 0 && result[0].integrity_check === 'ok';
    if (!ok) {
      return { valid: false, error: 'Integrity check failed' };
    }
    // Ensure core tables exist
    const tables = testDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    for (const required of ['conversations', 'messages', 'app_settings', 'schema_migrations']) {
      if (!tables.includes(required)) {
        return { valid: false, error: `Missing required table: ${required}` };
      }
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err?.message || String(err) };
  } finally {
    try {
      testDb?.close();
    } catch {
      // ignore
    }
  }
}

export function restoreDatabaseBackup(filePath: string): { success: boolean; error?: string } {
  const validation = validateDatabaseFile(filePath);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const target = getDatabasePath();
  const currentDb = db;

  try {
    if (currentDb) {
      try {
        currentDb.pragma('wal_checkpoint(TRUNCATE)');
      } catch {
        // ignore
      }
      currentDb.close();
      db = null;
      initialized = false;
    }

    // Move current db to a safety backup
    const safetyPath = `${target}.pre-restore-${Date.now()}`;
    if (fs.existsSync(target)) {
      fs.renameSync(target, safetyPath);
    }
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const sidecar = target + suffix;
      if (fs.existsSync(sidecar)) {
        try {
          fs.renameSync(sidecar, safetyPath + suffix);
        } catch {
          // ignore
        }
      }
    }

    // Copy validated backup to target
    fs.copyFileSync(filePath, target);

    // Reopen
    const reopened = new Database(target);
    applyPragmas(reopened);
    // Do not re-run migrations? Schema already present. But ensure migrations table.
    runMigrations(reopened);
    ensureMemorySearch();
    db = reopened;
    initialized = true;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// ---------------- Migration helper ----------------

export interface LegacyConversationInput {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  providerId: string;
  saveMemoryDefault?: boolean;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: number;
    model?: string;
    providerId?: string;
    attachments?: unknown;
    activities?: unknown;
    fileChanges?: unknown;
    hasMemorySaved?: boolean;
  }>;
}

export function migrateLegacyData(
  legacyConversations: LegacyConversationInput[],
  legacySettings?: Record<string, unknown>
): { success: boolean; imported: number; error?: string } {
  const database = getDatabase();
  if (!database) return { success: false, imported: 0, error: 'Database not available' };

  // Idempotency: if already migrated, skip
  const existingFlag = database.prepare('SELECT value FROM app_settings WHERE key = ?').get('legacy_migration_done') as any;
  if (existingFlag) {
    try {
      const parsed = JSON.parse(existingFlag.value);
      if (parsed === true) {
        return { success: true, imported: 0 };
      }
    } catch {
      // continue
    }
  }

  const transaction = database.transaction(() => {
    let imported = 0;
    for (const conv of legacyConversations) {
      if (!conv || typeof conv.id !== 'string') continue;

      // Never overwrite existing conversation
      const exists = database.prepare('SELECT id FROM conversations WHERE id = ?').get(conv.id);
      if (exists) continue;

      database
        .prepare(
          `INSERT INTO conversations (id, title, provider_id, model_id, workspace_path, created_at, updated_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          conv.id,
          conv.title || 'New Conversation',
          conv.providerId || '',
          conv.model || '',
          null,
          conv.createdAt || Date.now(),
          conv.updatedAt || Date.now(),
          stringifyMetadata({ saveMemoryDefault: conv.saveMemoryDefault ?? false })
        );

      const messages = Array.isArray(conv.messages) ? conv.messages : [];
      messages.forEach((msg, index) => {
        if (!msg || typeof msg.id !== 'string') return;
        const msgExists = database.prepare('SELECT id FROM messages WHERE id = ?').get(msg.id);
        if (msgExists) return;
        database
          .prepare(
            `INSERT INTO messages (id, conversation_id, role, content, message_type, created_at, updated_at, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            msg.id,
            conv.id,
            msg.role || 'assistant',
            msg.content || '',
            msg.role === 'user' ? 'user' : msg.role === 'system' ? 'system' : 'assistant',
            msg.timestamp || Date.now() + index,
            msg.timestamp || Date.now() + index,
            stringifyMetadata({
              model: msg.model,
              providerId: msg.providerId,
              attachments: msg.attachments,
              activities: msg.activities,
              fileChanges: msg.fileChanges,
              hasMemorySaved: msg.hasMemorySaved,
            })
          );
      });
      imported += 1;
    }

    // Settings
    if (legacySettings && typeof legacySettings === 'object') {
      for (const [key, value] of Object.entries(legacySettings)) {
        if (key === 'refx_conversations') continue;
        // Only migrate known safe settings keys
        database
          .prepare(
            `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO NOTHING`
          )
          .run(`legacy:${key}`, JSON.stringify(value), Date.now());
      }
    }

    database
      .prepare(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run('legacy_migration_done', JSON.stringify(true), Date.now());
  });

  try {
    transaction();
    return { success: true, imported: legacyConversations.length };
  } catch (err: any) {
    return { success: false, imported: 0, error: err?.message || String(err) };
  }
}// ---------------- Memory ----------------

export function getTaskMemories(taskId: string): any[] {
  const database = getDatabase();
  if (!database) return [];
  const rows = database.prepare('SELECT id, task_id, title, content, tags, created_at, updated_at FROM task_memories WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as any[];
  return rows.map((r) => ({
    id: r.id,
    taskId: r.task_id,
    title: r.title,
    content: r.content,
    tags: r.tags ? JSON.parse(r.tags) : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function saveTaskMemory(entry: any): any {
  const database = getDatabase();
  if (!database) throw new Error('Database not available');
  const now = Date.now();
  const id = entry.id || `task-mem-${now}-${Math.random().toString(36).slice(2, 8)}`;
  database.prepare(`INSERT INTO task_memories (id, task_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, tags=excluded.tags, updated_at=excluded.updated_at`).run(
    id,
    entry.taskId || 'default-task',
    entry.title || '',
    entry.content || '',
    JSON.stringify(entry.tags || []),
    entry.createdAt || now,
    now
  );
  return { id, taskId: entry.taskId || 'default-task', title: entry.title, content: entry.content, tags: entry.tags || [], createdAt: entry.createdAt || now, updatedAt: now };
}

export function deleteTaskMemory(id: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const r = database.prepare('DELETE FROM task_memories WHERE id = ?').run(id);
  return r.changes > 0;
}

export function getAppMemories(): any[] {
  const database = getDatabase();
  if (!database) return [];
  const rows = database.prepare('SELECT id, category, title, summary, details, enabled, created_at, updated_at FROM app_memories ORDER BY created_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    summary: r.summary,
    details: r.details,
    enabled: Boolean(r.enabled),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function saveAppMemory(entry: any): any {
  const database = getDatabase();
  if (!database) throw new Error('Database not available');
  const now = Date.now();
  const id = entry.id || `app-mem-${now}-${Math.random().toString(36).slice(2, 8)}`;
  database.prepare(`INSERT INTO app_memories (id, category, title, summary, details, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET category=excluded.category, title=excluded.title, summary=excluded.summary, details=excluded.details, enabled=excluded.enabled, updated_at=excluded.updated_at`).run(
    id,
    entry.category || 'preference',
    entry.title || '',
    entry.summary || '',
    entry.details || '',
    entry.enabled ? 1 : 0,
    entry.createdAt || now,
    now
  );
  return { id, category: entry.category, title: entry.title, summary: entry.summary, details: entry.details, enabled: entry.enabled ?? true, createdAt: entry.createdAt || now, updatedAt: now };
}

export function deleteAppMemory(id: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const r = database.prepare('DELETE FROM app_memories WHERE id = ?').run(id);
  return r.changes > 0;
}

export function clearAppMemories(): boolean {
  const database = getDatabase();
  if (!database) return false;
  database.prepare('DELETE FROM app_memories').run();
  return true;
}

export function getMemoryConfig(): any {
  const database = getDatabase();
  const defaultConfig = { autoMemoryEnabled: false, globalMemoryDirectory: '%APPDATA%\\Refx AI\\memory', storageBackend: 'file_index', maxEntries: 1000, retrievalTokenBudget: 1200, retrievalMaxResults: 8 };
  if (!database) return defaultConfig;
  const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get('memory_config') as any;
  if (!row) return defaultConfig;
  try { return { ...defaultConfig, ...JSON.parse(row.value) }; } catch { return defaultConfig; }
}

export function updateMemoryConfig(config: any): any {
  const database = getDatabase();
  const current = getMemoryConfig();
  const updated = { ...current, ...config };
  if (database) {
    database.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run('memory_config', JSON.stringify(updated), Date.now());
  }
  return updated;
}

// ---------------- Memory index ----------------

export interface MemoryIndexRecord {
  id: string;
  scope: 'app' | 'task';
  taskId?: string | null;
  category?: string | null;
  title: string;
  body: string;
  tags?: string[];
  enabled?: boolean;
  contentHash?: string | null;
  source?: string | null;
  payload?: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface MemorySearchOptions {
  scope?: 'app' | 'task';
  taskId?: string | null;
  category?: string;
  includeDisabled?: boolean;
  limit?: number;
}

interface MemoryIndexParams {
  id: string;
  scope: string;
  taskId: string | null;
  category: string | null;
  title: string;
  body: string;
  tags: string;
  enabled: number;
  contentHash: string | null;
  source: string | null;
  payload: string | null;
  createdAt: number;
  updatedAt: number;
}

function memoryIndexParams(record: MemoryIndexRecord): MemoryIndexParams {
  const now = Date.now();
  return {
    id: record.id,
    scope: record.scope,
    taskId: record.taskId ?? null,
    category: record.category ?? null,
    title: record.title || '',
    body: record.body || '',
    tags: JSON.stringify(Array.isArray(record.tags) ? record.tags : []),
    enabled: record.enabled === false ? 0 : 1,
    contentHash: record.contentHash ?? null,
    source: record.source ?? null,
    payload: record.payload === undefined ? null : JSON.stringify(record.payload),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  };
}

function mapMemoryIndexRow(row: any): any {
  let payload: Record<string, any> = {};
  if (row.payload) {
    try {
      const parsed = JSON.parse(row.payload);
      if (parsed && typeof parsed === 'object') payload = parsed;
    } catch {
      // ignore malformed payload
    }
  }
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags || '[]');
    if (Array.isArray(parsed)) tags = parsed.map((value) => String(value));
  } catch {
    // ignore malformed tags
  }
  return {
    ...payload,
    id: row.id,
    scope: row.scope,
    taskId: row.task_id ?? payload.taskId,
    category: row.category ?? payload.category,
    title: row.title ?? payload.title ?? '',
    tags,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(typeof row.rank === 'number' ? { rank: row.rank } : {}),
  };
}

function upsertMemoryIndexRecordInternal(database: Database.Database, record: MemoryIndexRecord): void {
  const params = memoryIndexParams(record);
  database
    .prepare(
      `INSERT INTO memory_index
         (id, scope, task_id, category, title, body, tags, enabled, content_hash, source, payload, created_at, updated_at)
       VALUES
         (@id, @scope, @taskId, @category, @title, @body, @tags, @enabled, @contentHash, @source, @payload, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         scope = excluded.scope,
         task_id = excluded.task_id,
         category = excluded.category,
         title = excluded.title,
         body = excluded.body,
         tags = excluded.tags,
         enabled = excluded.enabled,
         content_hash = excluded.content_hash,
         source = excluded.source,
         payload = excluded.payload,
         updated_at = excluded.updated_at`
    )
    .run(params);

  if (!memoryFtsAvailable) return;

  try {
    const row = database.prepare('SELECT rowid FROM memory_index WHERE id = ?').get(params.id) as any;
    if (!row) return;
    database.prepare('DELETE FROM memory_fts WHERE rowid = ?').run(row.rowid);
    database
      .prepare('INSERT INTO memory_fts (rowid, title, body, tags) VALUES (?, ?, ?, ?)')
      .run(row.rowid, params.title, params.body, params.tags);
  } catch (err) {
    memoryFtsAvailable = false;
    console.error('[DB] Failed to update memory FTS index; using LIKE fallback:', err);
  }
}

export function upsertMemoryIndexRecord(record: MemoryIndexRecord): boolean {
  const database = getDatabase();
  if (!database) return false;
  const transaction = database.transaction(() => {
    upsertMemoryIndexRecordInternal(database, record);
  });
  transaction();
  return true;
}

/**
 * Replaces every index row for one scope/task atomically. This is used after a
 * primary JSON file has been rewritten, so the derived index can never drift
 * from its source file.
 */
export function replaceMemoryIndexRecords(
  scope: 'app' | 'task',
  taskId: string | null,
  records: MemoryIndexRecord[]
): boolean {
  const database = getDatabase();
  if (!database) return false;

  const transaction = database.transaction(() => {
    const where = scope === 'task' ? 'scope = ? AND task_id = ?' : 'scope = ? AND task_id IS NULL';
    const params = scope === 'task' ? [scope, taskId || ''] : [scope];
    const existing = database.prepare(`SELECT id, rowid FROM memory_index WHERE ${where}`).all(...params) as any[];
    for (const row of existing) {
      if (memoryFtsAvailable) {
        try {
          database.prepare('DELETE FROM memory_fts WHERE rowid = ?').run(row.rowid);
        } catch {
          // ignore FTS cleanup failures
        }
      }
      database.prepare('DELETE FROM memory_index WHERE id = ?').run(row.id);
    }
    for (const record of records) {
      upsertMemoryIndexRecordInternal(database, record);
    }
  });

  transaction();
  return true;
}

export function deleteMemoryIndexRecord(id: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const transaction = database.transaction(() => {
    const row = database.prepare('SELECT rowid FROM memory_index WHERE id = ?').get(id) as any;
    if (row && memoryFtsAvailable) {
      try {
        database.prepare('DELETE FROM memory_fts WHERE rowid = ?').run(row.rowid);
      } catch {
        // ignore
      }
    }
    database.prepare('DELETE FROM memory_index WHERE id = ?').run(id);
  });
  transaction();
  return true;
}

export function clearMemoryIndex(scope?: 'app' | 'task', taskId?: string | null): boolean {
  const database = getDatabase();
  if (!database) return false;
  const transaction = database.transaction(() => {
    let existing: any[] = [];
    if (scope === 'task' && taskId) {
      existing = database.prepare('SELECT id, rowid FROM memory_index WHERE scope = ? AND task_id = ?').all(scope, taskId) as any[];
    } else if (scope === 'app') {
      existing = database.prepare('SELECT id, rowid FROM memory_index WHERE scope = ? AND task_id IS NULL').all(scope) as any[];
    } else if (scope === 'task') {
      existing = database.prepare('SELECT id, rowid FROM memory_index WHERE scope = ?').all(scope) as any[];
    } else {
      existing = database.prepare('SELECT id, rowid FROM memory_index').all() as any[];
    }

    for (const row of existing) {
      if (memoryFtsAvailable) {
        try {
          database.prepare('DELETE FROM memory_fts WHERE rowid = ?').run(row.rowid);
        } catch {
          // ignore
        }
      }
      database.prepare('DELETE FROM memory_index WHERE id = ?').run(row.id);
    }
  });
  transaction();
  return true;
}

export function getMemoryIndexRecord(id: string): any | null {
  const database = getDatabase();
  if (!database) return null;
  const row = database.prepare('SELECT * FROM memory_index WHERE id = ?').get(id) as any;
  return row ? mapMemoryIndexRow(row) : null;
}

export function findMemoryIndexByHash(
  scope: 'app' | 'task',
  taskId: string | null,
  contentHash: string
): any | null {
  const database = getDatabase();
  if (!database || !contentHash) return null;
  const where = scope === 'task' ? 'scope = ? AND task_id = ? AND content_hash = ?' : 'scope = ? AND task_id IS NULL AND content_hash = ?';
  const params = scope === 'task' ? [scope, taskId || '', contentHash] : [scope, contentHash];
  const row = database.prepare(`SELECT * FROM memory_index WHERE ${where} ORDER BY updated_at DESC LIMIT 1`).get(...params) as any;
  return row ? mapMemoryIndexRow(row) : null;
}

export function countMemoryIndex(scope?: 'app' | 'task'): number {
  const database = getDatabase();
  if (!database) return 0;
  const row = scope
    ? (database.prepare('SELECT COUNT(*) AS count FROM memory_index WHERE scope = ?').get(scope) as any)
    : (database.prepare('SELECT COUNT(*) AS count FROM memory_index').get() as any);
  return Number(row?.count || 0);
}

export function searchMemoryIndex(query: string, options: MemorySearchOptions = {}): any[] {
  const database = getDatabase();
  if (!database) return [];

  const limit = Math.min(Math.max(options.limit || 20, 1), 100);
  const filters: string[] = [];
  const params: any[] = [];

  if (options.scope) {
    filters.push('mi.scope = ?');
    params.push(options.scope);
  }
  if (options.taskId !== undefined && options.taskId !== null) {
    filters.push('mi.task_id = ?');
    params.push(options.taskId);
  }
  if (options.category) {
    filters.push('mi.category = ?');
    params.push(options.category);
  }
  if (!options.includeDisabled) {
    filters.push("(mi.scope = 'task' OR mi.enabled = 1)");
  }

  const rawQuery = String(query || '').trim();
  if (!rawQuery) {
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = database
      .prepare(`SELECT mi.* FROM memory_index mi ${where} ORDER BY mi.updated_at DESC LIMIT ?`)
      .all(...params, limit) as any[];
    return rows.map(mapMemoryIndexRow);
  }

  const tokens = rawQuery.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [];
  if (memoryFtsAvailable && tokens.length > 0) {
    try {
      const ftsQuery = tokens
        .slice(0, 8)
        .map((token) => `"${token.replace(/"/g, '""')}"*`)
        .join(' OR ');
      const where = filters.length ? `${filters.join(' AND ')} AND memory_fts MATCH ?` : 'memory_fts MATCH ?';
      const rows = database
        .prepare(
          `SELECT mi.*, bm25(memory_fts) AS rank
           FROM memory_fts
           JOIN memory_index mi ON mi.rowid = memory_fts.rowid
           WHERE ${where}
           ORDER BY rank ASC, mi.updated_at DESC
           LIMIT ?`
        )
        .all(...params, ftsQuery, limit) as any[];
      if (rows.length > 0) return rows.map(mapMemoryIndexRow);
    } catch (err) {
      console.error('[DB] FTS memory search failed; using LIKE fallback:', err);
    }
  }

  const like = `%${rawQuery.toLowerCase()}%`;
  const likeFilters = [
    ...filters,
    '(LOWER(mi.title) LIKE ? OR LOWER(mi.body) LIKE ? OR LOWER(mi.tags) LIKE ?)',
  ];
  const rows = database
    .prepare(
      `SELECT mi.* FROM memory_index mi
       WHERE ${likeFilters.join(' AND ')}
       ORDER BY mi.updated_at DESC
       LIMIT ?`
    )
    .all(...params, like, like, like, limit) as any[];
  return rows.map(mapMemoryIndexRow);
}

export function rebuildMemoryFtsFromIndex(): boolean {
  const database = getDatabase();
  if (!database || !memoryFtsAvailable) return false;
  try {
    const transaction = database.transaction(() => {
      database.prepare('DELETE FROM memory_fts').run();
      const rows = database.prepare('SELECT rowid, title, body, tags FROM memory_index').all() as any[];
      const insert = database.prepare('INSERT INTO memory_fts (rowid, title, body, tags) VALUES (?, ?, ?, ?)');
      for (const row of rows) {
        insert.run(row.rowid, row.title || '', row.body || '', row.tags || '[]');
      }
    });
    transaction();
    return true;
  } catch (err) {
    memoryFtsAvailable = false;
    console.error('[DB] Failed to rebuild memory FTS index:', err);
    return false;
  }
}

export function logMemoryOperation(
  memoryId: string,
  scope: 'app' | 'task',
  operation: 'create' | 'update' | 'delete' | 'clear' | 'reindex',
  source: string
): void {
  const database = getDatabase();
  if (!database) return;
  database
    .prepare('INSERT INTO memory_operation_log (id, memory_id, scope, operation, source, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(`mem-op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, memoryId, scope, operation, source, Date.now());
}

export function getMemoryOperationLog(memoryId?: string, limit = 100): any[] {
  const database = getDatabase();
  if (!database) return [];
  const cappedLimit = Math.min(Math.max(limit, 1), 500);
  const rows = memoryId
    ? (database.prepare('SELECT * FROM memory_operation_log WHERE memory_id = ? ORDER BY created_at DESC LIMIT ?').all(memoryId, cappedLimit) as any[])
    : (database.prepare('SELECT * FROM memory_operation_log ORDER BY created_at DESC LIMIT ?').all(cappedLimit) as any[]);
  return rows.map((row) => ({
    id: row.id,
    memoryId: row.memory_id,
    scope: row.scope,
    operation: row.operation,
    source: row.source,
    createdAt: row.created_at,
  }));
}

export function logMemoryRetrieval(
  conversationId: string | null,
  query: string,
  selectedIds: string[],
  tokenBudget: number,
  usedTokens: number
): void {
  const database = getDatabase();
  if (!database) return;
  database
    .prepare(
      `INSERT INTO memory_retrieval_log
         (id, conversation_id, query, selected_ids, token_budget, used_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      `mem-retrieval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      String(query || '').slice(0, 2000),
      JSON.stringify(selectedIds),
      Math.max(0, Math.floor(tokenBudget)),
      Math.max(0, Math.floor(usedTokens)),
      Date.now()
    );

  // Keep the local audit trail bounded so it cannot grow without limit.
  try {
    database
      .prepare(
        `DELETE FROM memory_retrieval_log
         WHERE id NOT IN (
           SELECT id FROM memory_retrieval_log ORDER BY created_at DESC LIMIT 5000
         )`
      )
      .run();
  } catch {
    // pruning is best-effort
  }
}

export function getMemoryRetrievalLog(conversationId?: string, limit = 100): any[] {
  const database = getDatabase();
  if (!database) return [];
  const cappedLimit = Math.min(Math.max(limit, 1), 500);
  const rows = conversationId
    ? (database
        .prepare('SELECT * FROM memory_retrieval_log WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?')
        .all(conversationId, cappedLimit) as any[])
    : (database
        .prepare('SELECT * FROM memory_retrieval_log ORDER BY created_at DESC LIMIT ?')
        .all(cappedLimit) as any[]);

  return rows.map((row) => {
    let selectedIds: string[] = [];
    try {
      const parsed = JSON.parse(row.selected_ids || '[]');
      if (Array.isArray(parsed)) selectedIds = parsed.map((value) => String(value));
    } catch {
      // ignore malformed log row
    }
    return {
      id: row.id,
      conversationId: row.conversation_id,
      query: row.query,
      selectedIds,
      tokenBudget: row.token_budget,
      usedTokens: row.used_tokens,
      createdAt: row.created_at,
    };
  });
}
