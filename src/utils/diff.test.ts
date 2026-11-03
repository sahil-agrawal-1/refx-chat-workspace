import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLineDiff, filterMemories } from './diff';

test('diff detects line additions and deletions accurately', () => {
  const original = 'const x = 1;\nconsole.log(x);';
  const modified = 'const x = 2;\nconst y = 3;\nconsole.log(x + y);';

  const result = computeLineDiff(original, modified);
  assert.ok(result.additions > 0, 'Should have additions');
  assert.ok(result.deletions > 0, 'Should have deletions');
  assert.equal(result.lines.some((l) => l.type === 'add'), true);
  assert.equal(result.lines.some((l) => l.type === 'delete'), true);
});

test('diff with identical content returns 0 additions and 0 deletions', () => {
  const code = 'function hello() {\n  return "world";\n}';
  const result = computeLineDiff(code, code);
  assert.equal(result.additions, 0);
  assert.equal(result.deletions, 0);
  assert.equal(result.lines.length, 3);
  assert.equal(result.lines.every((l) => l.type === 'context'), true);
});

test('filterMemories matches titles, content, and tags', () => {
  const memories = [
    { title: 'Prefer Tailwind v4', content: 'Use CSS variable theme', tags: ['styling', 'css'] },
    { title: 'Use SQLite for local memory', content: 'Store in AppData', tags: ['database'] },
    { title: 'Windows PowerShell paths', content: 'Handle backslashes', tags: ['windows', 'cli'] },
  ];

  const res1 = filterMemories(memories, 'sqlite');
  assert.equal(res1.length, 1);
  assert.equal(res1[0].title, 'Use SQLite for local memory');

  const res2 = filterMemories(memories, 'styling');
  assert.equal(res2.length, 1);
  assert.equal(res2[0].tags?.[0], 'styling');

  const res3 = filterMemories(memories, 'nonexistent');
  assert.equal(res3.length, 0);
});
