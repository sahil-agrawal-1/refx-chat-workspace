/**
 * File-change safety helpers shared by the Electron main process and tests.
 *
 * A proposed change is reviewed against a specific file state. Approval must
 * therefore apply only while that state still holds. These helpers revalidate
 * the target immediately before touching it, and use an exclusive write for
 * creates so a file that appeared after review is never overwritten.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type FileChangeKind = 'create' | 'edit';

export type FileChangeOperation =
  | 'create'
  | 'modify'
  | 'rename'
  | 'move'
  | 'delete'
  | 'patch';

export interface FileChangeState {
  kind: FileChangeKind;
  filePath: string;
  operationType: FileChangeOperation;
  originalHash: string;
  newContent?: string;
  newPath?: string;
}

/** Raised when the file state no longer matches what the user reviewed. */
export class FileChangeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileChangeConflictError';
  }
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/** A create is the only operation that expects a missing target. */
export function fileChangeKindFor(operationType: string): FileChangeKind {
  return operationType === 'create' ? 'create' : 'edit';
}

/**
 * Revalidate a pending change against the current filesystem state.
 *
 * - create: the target must still be absent.
 * - edit (modify/delete/rename/move/patch): the target must still exist with
 *   exactly the content hash captured at proposal time.
 * - rename/move: the destination must still be absent.
 */
export function assertFileChangeState(
  change: Pick<FileChangeState, 'kind' | 'operationType' | 'originalHash'>,
  targetPath: string,
  newPath?: string,
): void {
  const targetExists = fs.existsSync(targetPath);

  if (change.kind === 'create') {
    if (targetExists) {
      throw new FileChangeConflictError(
        'Create target already exists; refusing to overwrite the file.',
      );
    }
  } else {
    if (!targetExists) {
      throw new FileChangeConflictError(
        'Original file no longer exists; refusing to apply the change.',
      );
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      throw new FileChangeConflictError('Target is a directory; refusing to apply the change.');
    }
    const currentContent = fs.readFileSync(targetPath).toString('utf8');
    const currentHash = hashContent(currentContent);
    if (currentHash !== change.originalHash) {
      throw new FileChangeConflictError(
        'File changed since proposal; refusing to overwrite newer content.',
      );
    }
  }

  if (change.operationType === 'rename' || change.operationType === 'move') {
    if (!newPath) {
      throw new FileChangeConflictError('Missing destination path for rename/move.');
    }
    if (fs.existsSync(newPath)) {
      throw new FileChangeConflictError(
        'Destination path already exists; refusing to overwrite it.',
      );
    }
  }
}

function writeTempFile(targetPath: string, content: string): string {
  const tmp = `${targetPath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  fs.writeFileSync(tmp, content, 'utf8');
  return tmp;
}

function removeQuietly(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // best effort cleanup
  }
}

/**
 * Validate and then write a file change.
 *
 * Validation happens at the last possible moment before the target is
 * modified. A validation failure leaves both the source and any existing
 * destination untouched.
 */
export function writeFileChange(
  change: FileChangeState,
  targetPath: string,
  newPath?: string,
  trashItem?: (filePath: string) => void,
): void {
  if (change.operationType === 'delete') {
    assertFileChangeState(change, targetPath);
    if (fs.existsSync(targetPath)) {
      if (trashItem) {
        try {
          trashItem(targetPath);
        } catch {
          fs.renameSync(targetPath, `${targetPath}.deleted-${Date.now()}`);
        }
      } else {
        fs.renameSync(targetPath, `${targetPath}.deleted-${Date.now()}`);
      }
    }
    return;
  }

  if (change.operationType === 'rename' || change.operationType === 'move') {
    assertFileChangeState(change, targetPath, newPath);
    fs.renameSync(targetPath, newPath!);
    return;
  }

  // create/modify/patch/write
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmp = writeTempFile(targetPath, change.newContent ?? '');

  try {
    // Recheck immediately before replacing the target. Writing the temp file
    // does not touch the target, so a conflict here preserves it exactly.
    assertFileChangeState(change, targetPath);

    if (change.kind === 'create') {
      // COPYFILE_EXCL never replaces a file, even if one appears between the
      // check above and this call.
      try {
        fs.copyFileSync(tmp, targetPath, fs.constants.COPYFILE_EXCL);
      } catch (err: any) {
        if (err?.code === 'EEXIST') {
          throw new FileChangeConflictError(
            'Create target already exists; refusing to overwrite the file.',
          );
        }
        throw err;
      }
      removeQuietly(tmp);
    } else {
      fs.renameSync(tmp, targetPath);
    }
  } catch (err) {
    removeQuietly(tmp);
    throw err;
  }
}
