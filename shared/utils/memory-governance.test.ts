import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGovernanceSummary,
  detectMemoryConflicts,
  isLowConfidenceMemory,
  isMemoryExpired,
} from './memory-governance';

const now = Date.now();

const base = {
  id: 'one',
  scope: 'app' as const,
  title: 'Indent style',
  summary: 'Always use two spaces for TypeScript indentation',
  confidence: 0.8,
  enabled: true,
  createdAt: now - 1000,
  updatedAt: now - 1000,
};

test('expired memories are detected and excluded from conflicts', () => {
  const expired = { ...base, id: 'old', expiresAt: now - 1 };
  assert.equal(isMemoryExpired(expired, now), true);
  assert.equal(isMemoryExpired({ ...base, expiresAt: now + 60_000 }, now), false);

  const summary = buildGovernanceSummary([expired, base], { now });
  assert.equal(summary.counts.expired, 1);
  assert.equal(summary.expired[0].id, 'old');
});

test('near-duplicate memories are flagged as duplicates', () => {
  const conflicts = detectMemoryConflicts(
    [
      { ...base, id: 'a' },
      { ...base, id: 'b', summary: 'Always use two spaces for TypeScript indentation.' },
    ],
    { now }
  );

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, 'duplicate');
  assert.equal(conflicts[0].left.scope, 'app');
});

test('opposite negation wording is flagged as a contradiction', () => {
  const conflicts = detectMemoryConflicts(
    [
      { ...base, id: 'a', title: 'Quotes', summary: 'Always use single quotes in TypeScript files' },
      { ...base, id: 'b', title: 'Quotes', summary: 'Never use single quotes in TypeScript files' },
    ],
    { now }
  );

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, 'contradiction');
});

test('same title with different content is flagged as overlap', () => {
  const conflicts = detectMemoryConflicts(
    [
      { ...base, id: 'a', title: 'API design', summary: 'Return camelCase fields' },
      { ...base, id: 'b', title: 'API design', summary: 'Use versioned endpoints under /v2' },
    ],
    { now }
  );

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].type, 'overlap');
});

test('task memories are only compared within their own task', () => {
  const conflicts = detectMemoryConflicts(
    [
      { ...base, id: 'a', scope: 'task', taskId: 'task-1', content: 'Return camelCase JSON' },
      { ...base, id: 'b', scope: 'task', taskId: 'task-2', content: 'Return camelCase JSON' },
    ],
    { now }
  );

  assert.equal(conflicts.length, 0);
});

test('dismissed pair keys and disabled memories are skipped', () => {
  const entries = [
    { ...base, id: 'a' },
    { ...base, id: 'b', summary: 'Always use two spaces for TypeScript indentation.' },
  ];
  const first = detectMemoryConflicts(entries, { now });
  assert.equal(first.length, 1);

  const dismissed = detectMemoryConflicts(entries, {
    now,
    dismissedPairKeys: [first[0].pairKey],
  });
  assert.equal(dismissed.length, 0);

  const disabled = detectMemoryConflicts(
    [{ ...base, id: 'a' }, { ...base, id: 'b', enabled: false }],
    { now }
  );
  assert.equal(disabled.length, 0);
});

test('low-confidence review items and counts are reported', () => {
  assert.equal(isLowConfidenceMemory({ ...base, confidence: 0.4 }, 0.6), true);
  assert.equal(isLowConfidenceMemory({ ...base, confidence: 0.9 }, 0.6), false);

  const summary = buildGovernanceSummary([
    { ...base, id: 'low', confidence: 0.4 },
    { ...base, id: 'ok', confidence: 0.9 },
  ], { now });

  assert.equal(summary.counts.lowConfidence, 1);
  assert.equal(summary.lowConfidence[0].id, 'low');
});
