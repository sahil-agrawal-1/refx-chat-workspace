/**
 * Active-workspace guard used by the Electron main process.
 *
 * The guard can only activate roots that are present in the authorization
 * store. Every filesystem operation should route through `resolve` / `isWithin`
 * so the boundary is rechecked at the moment of access, not at selection time.
 */

import fs from 'node:fs';
import path from 'node:path';
import { isWithinRoot, resolveWithinWorkspace } from './workspace-path';
import { WorkspaceAuthorizationStore } from './workspace-authorization';

export class WorkspaceGuard {
  private activeRoot: string | null = null;

  constructor(private readonly store: WorkspaceAuthorizationStore) {}

  /**
   * Explicit authorization flow (native folder picker). Records the root and
   * makes it active. Returns the canonical root, or null if it was invalid.
   */
  authorizeAndActivate(input: string): string | null {
    const canonical = this.store.authorize(input);
    if (canonical) this.activeRoot = canonical;
    return canonical;
  }

  /**
   * Activate an already-authorized root. A renderer-provided path is only
   * accepted when the authorization store already contains it. `null` clears
   * the active root without revoking the persistent authorization.
   */
  activate(input: string | null | undefined): boolean {
    if (!input) {
      this.activeRoot = null;
      return true;
    }
    const canonical = this.store.getCanonical(input);
    if (!canonical) return false;
    this.activeRoot = canonical;
    return true;
  }

  /** Restore a previously authorized root, e.g. from persisted app settings. */
  restore(input: string | null | undefined): boolean {
    if (!input) return false;
    return this.activate(input);
  }

  getActiveRoot(): string | null {
    return this.activeRoot;
  }

  hasActiveRoot(): boolean {
    return this.activeRoot !== null;
  }

  requireRoot(): string {
    if (!this.activeRoot) {
      throw new Error('No workspace selected or workspace is not authorized.');
    }
    return this.activeRoot;
  }

  /** Resolve a path and enforce containment in the active workspace. */
  resolve(inputPath: string, allowMissing = false): string {
    return resolveWithinWorkspace(inputPath, this.requireRoot(), { allowMissing });
  }

  /** Recheck that a concrete path still belongs to the active workspace. */
  isWithin(candidate: string): boolean {
    if (!this.activeRoot) return false;
    try {
      const resolved = fs.existsSync(candidate) ? fs.realpathSync(candidate) : path.resolve(candidate);
      return isWithinRoot(resolved, this.activeRoot);
    } catch {
      return false;
    }
  }
}
