import * as db from './database';
import crypto from 'node:crypto';

const DEFAULT_MODEL = 'nomic-embed-text';
const DEFAULT_ENDPOINT = 'http://127.0.0.1:11434';

const queryCache = new Map<string, number[]>();

export function embeddingConfig(): { enabled: boolean; model: string; endpoint: string } {
  const config = (db.getMemoryConfig() as any) || {};
  return {
    enabled: config.embeddingsEnabled === true,
    model: String(config.embeddingModel || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    endpoint: String(config.embeddingEndpoint || DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT,
  };
}

export function isEmbeddingEnabled(): boolean {
  return embeddingConfig().enabled;
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex').slice(0, 24);
}

export async function getEmbedding(
  text: string,
  options: { model?: string; endpoint?: string; cacheKey?: string; scope?: 'app' | 'task'; taskId?: string | null } = {}
): Promise<number[] | null> {
  const cfg = embeddingConfig();
  const model = options.model || cfg.model;
  const endpoint = options.endpoint || cfg.endpoint;
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const cacheKey = options.cacheKey || `q:${model}:${hashText(trimmed)}`;
  if (queryCache.has(cacheKey)) return queryCache.get(cacheKey) || null;

  // Persistent cache lookup (memory entries).
  if (options.cacheKey) {
    const cached = db.getMemoryEmbedding(options.cacheKey);
    if (cached && cached.model === model && Array.isArray(cached.vector)) {
      queryCache.set(cacheKey, cached.vector);
      return cached.vector;
    }
  }

  try {
    const res = await fetch(`${endpoint}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: trimmed.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const vector = Array.isArray(json?.embedding)
      ? json.embedding.map((value: any) => Number(value) || 0)
      : null;
    if (!vector || vector.length === 0) return null;

    queryCache.set(cacheKey, vector);
    if (options.cacheKey) {
      db.saveMemoryEmbedding(options.cacheKey, options.scope || 'app', options.taskId || null, vector, model);
    }
    return vector;
  } catch {
    return null;
  }
}

export async function embedMemory(
  id: string,
  scope: 'app' | 'task',
  taskId: string | null,
  text: string
): Promise<number[] | null> {
  const cfg = embeddingConfig();
  if (!cfg.enabled) return null;
  const vector = await getEmbedding(text, {
    model: cfg.model,
    endpoint: cfg.endpoint,
    cacheKey: id,
    scope,
    taskId,
  });
  // Ensure scope/taskId stored.
  if (vector) db.saveMemoryEmbedding(id, scope, taskId, vector, cfg.model);
  return vector;
}

export function getCachedEmbedding(id: string): number[] | null {
  const row = db.getMemoryEmbedding(id);
  if (!row || !Array.isArray(row.vector)) return null;
  return row.vector;
}

export async function getQueryEmbedding(text: string): Promise<number[] | null> {
  const cfg = embeddingConfig();
  if (!cfg.enabled) return null;
  return getEmbedding(text, { model: cfg.model, endpoint: cfg.endpoint });
}

export function clearEmbeddingCache(): void {
  queryCache.clear();
}
