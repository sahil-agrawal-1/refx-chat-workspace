export type MemoryConflictType = 'duplicate' | 'contradiction' | 'overlap';

export interface GovernanceMemory {
  id: string;
  scope: 'app' | 'task';
  taskId?: string | null;
  category?: string | null;
  title?: string;
  summary?: string;
  details?: string;
  content?: string;
  enabled?: boolean;
  confidence?: number;
  usageCount?: number;
  expiresAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface MemoryConflictSide {
  id: string;
  scope: 'app' | 'task';
  taskId?: string | null;
  title: string;
  preview: string;
  confidence: number;
  updatedAt?: number;
}

export interface MemoryConflict {
  pairKey: string;
  type: MemoryConflictType;
  similarity: number;
  reason: string;
  left: MemoryConflictSide;
  right: MemoryConflictSide;
}

export interface MemoryReviewItem {
  id: string;
  scope: 'app' | 'task';
  taskId?: string | null;
  title: string;
  preview: string;
  confidence: number;
  expiresAt?: number;
  reason: string;
}

export interface MemoryGovernanceSummary {
  conflicts: MemoryConflict[];
  lowConfidence: MemoryReviewItem[];
  expired: MemoryReviewItem[];
  counts: {
    conflicts: number;
    lowConfidence: number;
    expired: number;
  };
}

export interface DetectConflictOptions {
  now?: number;
  lowConfidenceThreshold?: number;
  duplicateThreshold?: number;
  overlapThreshold?: number;
  maxGroupSize?: number;
  maxConflicts?: number;
  dismissedPairKeys?: Iterable<string>;
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'this',
  'that',
  'these',
  'those',
  'be',
  'are',
  'was',
  'were',
  'as',
  'if',
  'then',
  'than',
  'so',
  'do',
  'does',
  'did',
  'can',
  'could',
  'should',
  'would',
  'use',
  'using',
  'used',
  'always',
  'never',
  'must',
  'should',
  'when',
  'while',
  'into',
  'also',
  'all',
  'any',
  'my',
  'our',
  'your',
]);

const NEGATION_PATTERN = /\b(?:never|avoid|don't|dont|do not|not|no longer|without|instead of)\b/i;

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensOf(value: unknown): Set<string> {
  const tokens = normalize(value).match(/[\p{L}\p{N}_-]+/gu) || [];
  const result = new Set<string>();
  for (const token of tokens) {
    if (token.length <= 2 || STOP_WORDS.has(token)) continue;
    result.add(token);
    if (result.size >= 120) break;
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function memoryText(entry: GovernanceMemory): string {
  if (entry.scope === 'task') {
    return String(entry.content || entry.details || entry.summary || '');
  }
  return [entry.summary, entry.details].filter(Boolean).join(' ');
}

function displayTitle(entry: GovernanceMemory): string {
  const title = String(entry.title || '').trim();
  if (title) return title;
  const text = memoryText(entry).trim();
  if (!text) return 'Memory';
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

function previewOf(entry: GovernanceMemory): string {
  const text = memoryText(entry).trim();
  if (!text) return '';
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.7;
  return Math.min(1, Math.max(0, value));
}

function pairKeyFor(a: GovernanceMemory, b: GovernanceMemory): string {
  const left = `${a.scope}:${a.taskId || ''}:${a.id}`;
  const right = `${b.scope}:${b.taskId || ''}:${b.id}`;
  return [left, right].sort().join('::');
}

function toSide(entry: GovernanceMemory): MemoryConflictSide {
  return {
    id: entry.id,
    scope: entry.scope,
    taskId: entry.taskId || null,
    title: displayTitle(entry),
    preview: previewOf(entry),
    confidence: clampConfidence(entry.confidence),
    updatedAt: entry.updatedAt,
  };
}

export function isMemoryExpired(entry: GovernanceMemory, now = Date.now()): boolean {
  return typeof entry.expiresAt === 'number' && entry.expiresAt > 0 && entry.expiresAt <= now;
}

export function isLowConfidenceMemory(
  entry: GovernanceMemory,
  threshold = 0.6
): boolean {
  return clampConfidence(entry.confidence) < threshold;
}

/**
 * Detect near-duplicate and contradictory memories within the same scope.
 * Task memories are only compared inside their own task so unrelated projects
 * never create noise. Detection is deterministic and file-index friendly.
 */
export function detectMemoryConflicts(
  entries: GovernanceMemory[],
  options: DetectConflictOptions = {}
): MemoryConflict[] {
  const now = options.now ?? Date.now();
  const duplicateThreshold = options.duplicateThreshold ?? 0.82;
  const overlapThreshold = options.overlapThreshold ?? 0.55;
  const maxGroupSize = options.maxGroupSize ?? 400;
  const maxConflicts = options.maxConflicts ?? 50;
  const dismissed = new Set(options.dismissedPairKeys || []);

  const groups = new Map<string, GovernanceMemory[]>();
  for (const entry of entries) {
    if (!entry || !entry.id) continue;
    if (entry.enabled === false) continue;
    if (isMemoryExpired(entry, now)) continue;
    const text = memoryText(entry).trim();
    if (!text && !String(entry.title || '').trim()) continue;
    const groupKey = `${entry.scope}:${entry.scope === 'task' ? entry.taskId || '' : ''}`;
    const group = groups.get(groupKey) || [];
    if (group.length >= maxGroupSize) continue;
    group.push(entry);
    groups.set(groupKey, group);
  }

  const conflicts: MemoryConflict[] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (conflicts.length >= maxConflicts) return conflicts;
        const left = group[i];
        const right = group[j];
        const pairKey = pairKeyFor(left, right);
        if (dismissed.has(pairKey)) continue;

        const leftText = memoryText(left);
        const rightText = memoryText(right);
        const similarity = jaccard(tokensOf(`${left.title} ${leftText}`), tokensOf(`${right.title} ${rightText}`));
        const leftTitle = normalize(left.title);
        const rightTitle = normalize(right.title);
        const sameTitle = leftTitle.length > 2 && leftTitle === rightTitle;
        const titleContained =
          leftTitle.length > 8 &&
          rightTitle.length > 8 &&
          (leftTitle.includes(rightTitle) || rightTitle.includes(leftTitle));

        let type: MemoryConflictType | null = null;
        let reason = '';

        if (
          similarity >= overlapThreshold &&
          NEGATION_PATTERN.test(leftText) !== NEGATION_PATTERN.test(rightText)
        ) {
          type = 'contradiction';
          reason = 'Similar topic with opposite wording (one rule includes a negation)';
        } else if (similarity >= duplicateThreshold) {
          type = 'duplicate';
          reason = `Very similar wording (${Math.round(similarity * 100)}% overlap)`;
        } else if (sameTitle || titleContained) {
          type = 'overlap';
          reason = 'Same or overlapping title with different content';
        } else if (similarity >= overlapThreshold) {
          type = 'overlap';
          reason = `Shared topic (${Math.round(similarity * 100)}% overlap)`;
        }

        if (!type) continue;
        conflicts.push({
          pairKey,
          type,
          similarity: Number(similarity.toFixed(3)),
          reason,
          left: toSide(left),
          right: toSide(right),
        });
      }
    }
  }

  return conflicts;
}

/** Build the full review summary used by the memory manager UI. */
export function buildGovernanceSummary(
  entries: GovernanceMemory[],
  options: DetectConflictOptions = {}
): MemoryGovernanceSummary {
  const now = options.now ?? Date.now();
  const lowConfidenceThreshold = options.lowConfidenceThreshold ?? 0.6;

  const active = entries.filter(
    (entry) => entry && entry.id && entry.enabled !== false && !isMemoryExpired(entry, now)
  );

  const conflicts = detectMemoryConflicts(active, { ...options, now });

  const expired: MemoryReviewItem[] = entries
    .filter((entry) => entry && entry.id && isMemoryExpired(entry, now))
    .map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      taskId: entry.taskId || null,
      title: displayTitle(entry),
      preview: previewOf(entry),
      confidence: clampConfidence(entry.confidence),
      expiresAt: entry.expiresAt,
      reason: 'Expired; excluded from retrieval',
    }));

  const lowConfidence: MemoryReviewItem[] = active
    .filter((entry) => isLowConfidenceMemory(entry, lowConfidenceThreshold))
    .map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      taskId: entry.taskId || null,
      title: displayTitle(entry),
      preview: previewOf(entry),
      confidence: clampConfidence(entry.confidence),
      reason: `Low confidence (${Math.round(clampConfidence(entry.confidence) * 100)}%)`,
    }));

  return {
    conflicts,
    lowConfidence,
    expired,
    counts: {
      conflicts: conflicts.length,
      lowConfidence: lowConfidence.length,
      expired: expired.length,
    },
  };
}
