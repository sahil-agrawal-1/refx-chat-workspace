import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceAuthorizationStore } from 'shared/utils/workspace-authorization';

let tmpRoot: string;
let approved: string;
let unapproved: string;
let registryFile: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'refx-auth-'));
  approved = path.join(tmpRoot, 'approved');
  unapproved = path.join(tmpRoot, 'unapproved');
  fs.mkdirSync(approved);
  fs.mkdirSync(unapproved);
  registryFile = path.join(tmpRoot, 'authorized-workspaces.json');
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

test('a renderer-provided directory is not authorized by default', () => {
  const store = new WorkspaceAuthorizationStore(registryFile);
  assert.equal(store.isAuthorized(unapproved), false);
  assert.equal(store.getCanonical(unapproved), null);
});

test('explicit authorization stores the canonical directory', () => {
  const store = new WorkspaceAuthorizationStore(registryFile);
  const canonical = store.authorize(approved);
  assert.equal(canonical, fs.realpathSync(approved));
  assert.equal(store.isAuthorized(approved), true);
  assert.equal(store.getCanonical(unapproved), null);
});

test('authorization persists across store instances', () => {
  const first = new WorkspaceAuthorizationStore(registryFile);
  first.authorize(approved);

  const second = new WorkspaceAuthorizationStore(registryFile);
  assert.equal(second.isAuthorized(approved), true);
  assert.equal(second.isAuthorized(unapproved), false);
});

test('non-existent directories and files are rejected', () => {
  const store = new WorkspaceAuthorizationStore(registryFile);
  assert.equal(store.authorize(path.join(tmpRoot, 'missing')), null);

  const filePath = path.join(approved, 'file.txt');
  fs.writeFileSync(filePath, 'x', 'utf8');
  assert.equal(store.authorize(filePath), null);
  assert.equal(store.isAuthorized(filePath), false);
});

test('revoke removes a previous grant', () => {
  const store = new WorkspaceAuthorizationStore(registryFile);
  store.authorize(approved);
  assert.equal(store.revoke(approved), true);
  assert.equal(store.isAuthorized(approved), false);

  const reloaded = new WorkspaceAuthorizationStore(registryFile);
  assert.equal(reloaded.isAuthorized(approved), false);
});

test('unapproved directory stays rejected after registry load', () => {
  fs.writeFileSync(registryFile, JSON.stringify([approved]), 'utf8');
  const store = new WorkspaceAuthorizationStore(registryFile);
  assert.equal(store.isAuthorized(approved), true);
  assert.equal(store.isAuthorized(unapproved), false);
});

test('case variants match on Windows', () => {
  if (process.platform !== 'win32') return;
  const store = new WorkspaceAuthorizationStore(registryFile);
  store.authorize(approved);
  const variant = approved.toUpperCase() === approved ? approved.toLowerCase() : approved.toUpperCase();
  assert.equal(store.isAuthorized(variant), true);
});
