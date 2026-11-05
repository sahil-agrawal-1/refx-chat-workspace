import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  FileChangeConflictError,
  assertFileChangeState,
  hashContent,
  writeFileChange,
  type FileChangeState,
} from './file-change';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'refx-file-change-'));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function createChange(targetPath: string, content: string): FileChangeState {
  return {
    kind: 'create',
    filePath: targetPath,
    operationType: 'create',
    originalHash: '',
    newContent: content,
  };
}

function editChange(targetPath: string, originalContent: string, nextContent: string): FileChangeState {
  return {
    kind: 'edit',
    filePath: targetPath,
    operationType: 'modify',
    originalHash: hashContent(originalContent),
    newContent: nextContent,
  };
}

function renameChange(
  targetPath: string,
  newPath: string,
  originalContent: string,
  operationType: 'rename' | 'move',
): FileChangeState {
  return {
    kind: 'edit',
    filePath: targetPath,
    operationType,
    originalHash: hashContent(originalContent),
    newContent: originalContent,
    newPath,
  };
}

test('create succeeds while the target is still absent', () => {
  const target = path.join(tmpRoot, 'new.txt');
  writeFileChange(createChange(target, 'hello'), target);

  assert.equal(fs.readFileSync(target, 'utf8'), 'hello');
});

test('create approval fails if the target appeared after proposal', () => {
  const target = path.join(tmpRoot, 'raced.txt');
  const change = createChange(target, 'from proposal');
  assertFileChangeState(change, target);

  fs.writeFileSync(target, 'user file', 'utf8');

  assert.throws(
    () => writeFileChange(change, target),
    (err: unknown) => err instanceof FileChangeConflictError && /already exists/.test(err.message),
  );
  assert.equal(fs.readFileSync(target, 'utf8'), 'user file');
});

test('edit succeeds when the reviewed content is unchanged', () => {
  const target = path.join(tmpRoot, 'edit.txt');
  fs.writeFileSync(target, 'before', 'utf8');

  writeFileChange(editChange(target, 'before', 'after'), target);

  assert.equal(fs.readFileSync(target, 'utf8'), 'after');
});

test('edit approval fails if the target disappeared after proposal', () => {
  const target = path.join(tmpRoot, 'deleted.txt');
  fs.writeFileSync(target, 'before', 'utf8');
  const change = editChange(target, 'before', 'after');

  fs.rmSync(target);

  assert.throws(
    () => writeFileChange(change, target),
    (err: unknown) => err instanceof FileChangeConflictError && /no longer exists/.test(err.message),
  );
  assert.equal(fs.existsSync(target), false, 'a rejected edit must not recreate the file');
});

test('edit approval fails if the target changed after proposal', () => {
  const target = path.join(tmpRoot, 'changed.txt');
  fs.writeFileSync(target, 'before', 'utf8');
  const change = editChange(target, 'before', 'after');

  fs.writeFileSync(target, 'external change', 'utf8');

  assert.throws(
    () => writeFileChange(change, target),
    (err: unknown) => err instanceof FileChangeConflictError && /changed since proposal/.test(err.message),
  );
  assert.equal(fs.readFileSync(target, 'utf8'), 'external change');
});

test('edit approval detects a change even when the reviewed file was empty', () => {
  const target = path.join(tmpRoot, 'empty.txt');
  fs.writeFileSync(target, '', 'utf8');
  const change = editChange(target, '', 'after');

  fs.writeFileSync(target, 'external', 'utf8');

  assert.throws(() => writeFileChange(change, target), FileChangeConflictError);
  assert.equal(fs.readFileSync(target, 'utf8'), 'external');
});

test('rename and move succeed while the source and destination are unchanged', () => {
  const renameSource = path.join(tmpRoot, 'rename-source.txt');
  const renameDestination = path.join(tmpRoot, 'rename-destination.txt');
  fs.writeFileSync(renameSource, 'rename content', 'utf8');
  writeFileChange(
    renameChange(renameSource, renameDestination, 'rename content', 'rename'),
    renameSource,
    renameDestination,
  );
  assert.equal(fs.existsSync(renameSource), false);
  assert.equal(fs.readFileSync(renameDestination, 'utf8'), 'rename content');

  const moveSource = path.join(tmpRoot, 'move-source-ok.txt');
  const moveDestination = path.join(tmpRoot, 'move-destination-ok.txt');
  fs.writeFileSync(moveSource, 'move content', 'utf8');
  writeFileChange(
    renameChange(moveSource, moveDestination, 'move content', 'move'),
    moveSource,
    moveDestination,
  );
  assert.equal(fs.existsSync(moveSource), false);
  assert.equal(fs.readFileSync(moveDestination, 'utf8'), 'move content');
});

test('rename approval fails if the destination appeared after proposal', () => {
  const source = path.join(tmpRoot, 'source.txt');
  const destination = path.join(tmpRoot, 'destination.txt');
  fs.writeFileSync(source, 'source content', 'utf8');
  const change = renameChange(source, destination, 'source content', 'rename');

  fs.writeFileSync(destination, 'occupied', 'utf8');

  assert.throws(
    () => writeFileChange(change, source, destination),
    (err: unknown) => err instanceof FileChangeConflictError && /Destination path already exists/.test(err.message),
  );
  assert.equal(fs.readFileSync(source, 'utf8'), 'source content');
  assert.equal(fs.readFileSync(destination, 'utf8'), 'occupied');
});

test('move approval fails if the destination appeared after proposal', () => {
  const source = path.join(tmpRoot, 'move-source.txt');
  const destination = path.join(tmpRoot, 'move-destination.txt');
  fs.writeFileSync(source, 'source content', 'utf8');
  const change = renameChange(source, destination, 'source content', 'move');

  fs.writeFileSync(destination, 'occupied', 'utf8');

  assert.throws(
    () => writeFileChange(change, source, destination),
    (err: unknown) => err instanceof FileChangeConflictError && /Destination path already exists/.test(err.message),
  );
  assert.equal(fs.readFileSync(source, 'utf8'), 'source content');
  assert.equal(fs.readFileSync(destination, 'utf8'), 'occupied');
});
