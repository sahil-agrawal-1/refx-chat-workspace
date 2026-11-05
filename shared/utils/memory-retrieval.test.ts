import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMemoryContext,
  estimateTokens,
  looksSensitive,
  rankMemoryCandidates,
  redactSensitiveText,
  tokenizeQuery,
} from './memory-retrieval';

const now = Date.now();

const baseCandidate = {
  id: 'base',
  scope: 'app' as const,
  category: 'preference',
  title: 'Indent style',
  summary: 'Use two spaces',
  details: 'Prefer two spaces in TypeScript',
  confidence: 0.8,
  usageCount: 2,
  createdAt: now - 86_400_000,
  updatedAt: now - 86_400_000,
};

test('tokenizeQuery removes stop words and duplicates', () => {
  assert.deepEqual(tokenizeQuery('How do I use the same API and API?'), ['how', 'use', 'same', 'api']);
});

test('ranking favours keyword overlap and title matches', () => {
  const ranked = rankMemoryCandidates(
    [
      { ...baseCandidate, id: 'match', title: 'TypeScript indentation', summary: 'Use two spaces in TypeScript' },
      { ...baseCandidate, id: 'other', title: 'Color palette', summary: 'Use dark blue backgrounds' },
    ],
    { query: 'typescript indentation', now }
  );

  assert.equal(ranked[0]?.id, 'match');
  assert.ok(ranked[0]?.matchedTerms.includes('typescript'));
  assert.ok(ranked[0]?.reasons.some((reason) => reason.startsWith('keyword overlap')));
});

test('current task memory receives a task-affinity boost', () => {
  const ranked = rankMemoryCandidates(
    [
      { ...baseCandidate, id: 'app', title: 'API notes', summary: 'Return camelCase JSON' },
      {
        ...baseCandidate,
        id: 'task',
        scope: 'task',
        taskId: 'conv-1',
        title: 'API notes',
        content: 'Return camelCase JSON',
      },
    ],
    { query: 'camelCase JSON', currentTaskId: 'conv-1', now }
  );

  assert.equal(ranked[0]?.id, 'task');
  assert.ok(ranked[0]?.reasons.includes('current task'));
});

test('usage and confidence influence scores', () => {
  const low = rankMemoryCandidates(
    [{ ...baseCandidate, id: 'low', usageCount: 0, confidence: 0.4 }],
    { query: 'indent style', now }
  )[0];
  const high = rankMemoryCandidates(
    [{ ...baseCandidate, id: 'high', usageCount: 20, confidence: 0.95 }],
    { query: 'indent style', now }
  )[0];

  assert.ok(high.score > low.score);
});

test('credential-looking memories are excluded and redactable', () => {
  const secret = 'sk-abcdefghijklmnopqrstuvwxyz123456';
  assert.equal(looksSensitive(secret), true);
  assert.equal(redactSensitiveText(`key=${secret}`), 'key=sk-[REDACTED]');

  const ranked = rankMemoryCandidates(
    [{ ...baseCandidate, id: 'secret', title: 'API key', summary: secret }],
    { query: 'api key', now }
  );
  assert.equal(ranked.length, 0);
});

test('context builder respects the token budget and labels memory', () => {
  const results = rankMemoryCandidates(
    [
      { ...baseCandidate, id: 'a', title: 'Indent', summary: 'Use two spaces' },
      { ...baseCandidate, id: 'b', title: 'Quotes', summary: 'Use single quotes' },
    ],
    { query: '', now }
  );

  const small = buildMemoryContext(results, 120);
  assert.ok(small.usedTokens <= 120);
  assert.ok(small.context.includes('untrusted'));

  const full = buildMemoryContext(results, 1200);
  assert.equal(full.usedResults.length, 2);
  assert.ok(full.context.includes('[app/preference'));
});

test('estimateTokens is monotonic', () => {
  assert.equal(estimateTokens(''), 0);
  assert.ok(estimateTokens('a'.repeat(400)) >= 100);
});
