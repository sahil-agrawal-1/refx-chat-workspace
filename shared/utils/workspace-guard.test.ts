import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceAuthorizationStore } from 'shared/utils/workspace-authorization';
import { WorkspaceGuard } from 'shared/utils/workspace-guard';

let tmpRoot: string;
let approved: string;
let unapproved: string;
let registryFile: string;

function createGuard(): WorkspaceGuard {
  return new WorkspaceGuard(new WorkspaceAuthorizationStore(registryFile));
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'refx-guard-'));
  approved = path.join(tmpRoot, 'approved');
  unapproved = path.join(tmpRoot, 'unapproved');
  fs.mkdirSync(approved);
  fs.mkdirSync(unapproved);
  fs.writeFileSync(path.join(approved, 'inside.txt'), 'inside', 'utf8');
  fs.writeFileSync(path.join(unapproved, 'secret.txt'), 'secret', 'utf8');
  registryFile = path.join(tmpRoot, 'authorized-workspaces.json');
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

test('attempting to activate an unapproved directory is rejected', () => {
  const guard = createGuard();
  assert.equal(guard.activate(unapproved), false);
  assert.equal(guard.hasActiveRoot(), false);
  assert.throws(() => guard.requireRoot(), /not authorized|No workspace/);
});

test('attempting to access an unapproved directory is rejected', () => {
  const guard = createGuard();
  assert.equal(guard.authorizeAndActivate(approved), fs.realpathSync(approved));
  assert.throws(() => guard.resolve(path.join(unapproved, 'secret.txt')), /outside the selected workspace/);
  assert.equal(guard.isWithin(path.join(unapproved, 'secret.txt')), false);
  assert.equal(guard.isWithin(path.join(approved, 'inside.txt')), true);
});

test('explicitly authorized directory resolves its own files', () => {
  const guard = createGuard();
  guard.authorizeAndActivate(approved);
  const resolved = guard.resolve(path.join(approved, 'inside.txt'));
  assert.equal(resolved.toLowerCase(), fs.realpathSync(path.join(approved, 'inside.txt')).toLowerCase());
});

test('clearing the active root does not authorize an arbitrary path', () => {
  const guard = createGuard();
  guard.authorizeAndActivate(approved);
  assert.equal(guard.activate(null), true);
  assert.equal(guard.hasActiveRoot(), false);
  assert.equal(guard.activate(unapproved), false);
  assert.equal(guard.hasActiveRoot(), false);
});

test('restore only re-activates previously authorized roots', () => {
  const first = createGuard();
  first.authorizeAndActivate(approved);

  const restored = createGuard();
  assert.equal(restored.restore(unapproved), false);
  assert.equal(restored.hasActiveRoot(), false);
  assert.equal(restored.restore(approved), true);
  assert.equal(restored.getActiveRoot(), fs.realpathSync(approved));
});

test('moving the active root to another authorized root is allowed', () => {
  const guard = createGuard();
  guard.authorizeAndActivate(approved);
  guard.authorizeAndActivate(unapproved);
  assert.equal(guard.getActiveRoot(), fs.realpathSync(unapproved));
  assert.equal(guard.isWithin(path.join(approved, 'inside.txt')), false);
});
