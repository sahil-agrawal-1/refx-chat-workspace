import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isExcludedRelative,
  toComparablePath,
  isWithinRoot,
  resolveWithinWorkspace,
  MAX_FILE_SIZE_BYTES,
} from 'shared/utils/workspace-path';

let tmpRoot: string;
let workspace: string;
let outside: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'refx-wp-'));
  workspace = path.join(tmpRoot, 'workspace');
  outside = path.join(tmpRoot, 'outside');
  fs.mkdirSync(workspace);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(workspace, 'file.txt'), 'hello world\nsecond line', 'utf8');
  fs.mkdirSync(path.join(workspace, 'nested'));
  fs.writeFileSync(path.join(workspace, 'nested', 'inner.txt'), 'nested content', 'utf8');
  fs.mkdirSync(path.join(workspace, 'node_modules'));
  fs.writeFileSync(path.join(workspace, 'node_modules', 'pkg.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(workspace, '.env'), 'SECRET=1', 'utf8');
  fs.writeFileSync(path.join(workspace, 'key.pem'), 'PRIVATE', 'utf8');
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

test('isExcludedRelative excludes node_modules, .git, .env*, keys', () => {
  assert.equal(isExcludedRelative('node_modules/foo'), true);
  assert.equal(isExcludedRelative('.env.local'), true);
  assert.equal(isExcludedRelative('sub/key.pem'), true);
  assert.equal(isExcludedRelative('src/index.ts'), false);
  assert.equal(isExcludedRelative(''), false);
  assert.equal(isExcludedRelative('.'), false);
});

test('toComparablePath is case-insensitive on win32', () => {
  if (process.platform === 'win32') {
    assert.equal(toComparablePath('C:\\Foo\\Bar'), 'c:\\foo\\bar');
  } else {
    assert.equal(toComparablePath('/Foo/Bar'), '/Foo/Bar');
  }
});

test('resolveWithinWorkspace allows existing file inside workspace', () => {
  const p = path.join(workspace, 'file.txt');
  const resolved = resolveWithinWorkspace(p, workspace);
  assert.equal(resolved.toLowerCase(), fs.realpathSync(p).toLowerCase());
});

test('resolveWithinWorkspace allows nested directory', () => {
  const p = path.join(workspace, 'nested');
  const resolved = resolveWithinWorkspace(p, workspace);
  assert.equal(resolved.toLowerCase(), fs.realpathSync(p).toLowerCase());
});

test('resolveWithinWorkspace blocks path traversal via ..', () => {
  assert.throws(() => resolveWithinWorkspace(path.join(workspace, '..', 'outside'), workspace), /outside the selected workspace/);
});

test('resolveWithinWorkspace blocks absolute path outside workspace', () => {
  const outsideFile = path.join(outside, 'secret.txt');
  fs.writeFileSync(outsideFile, 'x', 'utf8');
  assert.throws(() => resolveWithinWorkspace(outsideFile, workspace), /outside the selected workspace/);
});

test('resolveWithinWorkspace allows case-variant path on Windows', () => {
  if (process.platform !== 'win32') return;
  const variant = workspace.toUpperCase() === workspace ? workspace.toLowerCase() : workspace.toUpperCase();
  // Build a case-variant child path
  const childVariant = path.join(variant, 'FILE.TXT');
  // File exists with different casing; realpath normalizes
  const resolved = resolveWithinWorkspace(childVariant, workspace);
  assert.ok(resolved.toLowerCase().includes('file.txt'));
});

test('resolveWithinWorkspace rejects excluded .env', () => {
  const p = path.join(workspace, '.env');
  assert.throws(() => resolveWithinWorkspace(p, workspace), /excluded/);
});

test('resolveWithinWorkspace rejects excluded node_modules', () => {
  const p = path.join(workspace, 'node_modules', 'pkg.json');
  assert.throws(() => resolveWithinWorkspace(p, workspace), /excluded/);
});

test('resolveWithinWorkspace missing file throws unless allowMissing', () => {
  const p = path.join(workspace, 'does-not-exist.txt');
  assert.throws(() => resolveWithinWorkspace(p, workspace), /does not exist/);
  const resolved = resolveWithinWorkspace(p, workspace, { allowMissing: true });
  assert.ok(resolved.toLowerCase().includes('does-not-exist.txt'));
});

test('resolveWithinWorkspace allowMissing still blocks traversal', () => {
  const p = path.join(workspace, '..', 'outside', 'new.txt');
  assert.throws(() => resolveWithinWorkspace(p, workspace, { allowMissing: true }), /outside the selected workspace/);
});

test('resolveWithinWorkspace empty input returns root', () => {
  const resolved = resolveWithinWorkspace('', workspace);
  assert.equal(resolved, workspace);
});

test('isWithinRoot containment', () => {
  assert.equal(isWithinRoot(workspace, workspace), true);
  assert.equal(isWithinRoot(path.join(workspace, 'file.txt'), workspace), true);
  assert.equal(isWithinRoot(outside, workspace), false);
});

test('junction escape is blocked', () => {
  const junctionPath = path.join(workspace, 'escape-junction');
  try {
    fs.symlinkSync(outside, junctionPath, 'junction');
  } catch {
    // junction creation may fail; skip
    return;
  }
  // realpath resolves to outside -> should be blocked
  try {
    assert.throws(() => resolveWithinWorkspace(junctionPath, workspace), /outside the selected workspace/);
  } finally {
    try { fs.rmSync(junctionPath, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

test('symlink escape is blocked', () => {
  const linkPath = path.join(workspace, 'escape-link');
  try {
    fs.symlinkSync(outside, linkPath, 'dir');
  } catch {
    try { fs.symlinkSync(outside, linkPath, 'junction'); } catch { return; }
  }
  try {
    assert.throws(() => resolveWithinWorkspace(linkPath, workspace), /outside the selected workspace/);
  } finally {
    try { fs.rmSync(linkPath, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

test('MAX_FILE_SIZE_BYTES is 1 MB', () => {
  assert.equal(MAX_FILE_SIZE_BYTES, 1024 * 1024);
});