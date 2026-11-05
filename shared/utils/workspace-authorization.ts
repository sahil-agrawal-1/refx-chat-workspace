/**
 * Persistent allowlist of workspace roots the user has explicitly authorized.
 *
 * A renderer-provided path never grants access on its own. The only way a root
 * enters this store is through an explicit authorization flow in the Electron
 * main process (currently the native folder picker) or because it was already
 * persisted here by a previous explicit authorization.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface WorkspaceAuthorizationOptions {
  platform?: NodeJS.Platform;
}

function normalizeKey(value: string, platform: NodeJS.Platform): string {
  return platform === 'win32' ? value.toLowerCase() : value;
}

export class WorkspaceAuthorizationStore {
  private readonly filePath: string;
  private readonly platform: NodeJS.Platform;
  private readonly authorized = new Map<string, string>();
  private loaded = false;

  constructor(filePath: string, options: WorkspaceAuthorizationOptions = {}) {
    this.filePath = filePath;
    this.platform = options.platform ?? process.platform;
  }

  /** Resolve an input to a canonical directory path, or null when it is not a real directory. */
  private canonicalizeDirectory(input: string | null | undefined): string | null {
    const trimmed = String(input ?? '').trim();
    if (!trimmed) return null;
    try {
      const real = fs.realpathSync(path.resolve(trimmed));
      return fs.statSync(real).isDirectory() ? real : null;
    } catch {
      return null;
    }
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return;
      for (const entry of parsed) {
        if (typeof entry !== 'string') continue;
        const canonical = this.canonicalizeDirectory(entry);
        if (canonical) {
          this.authorized.set(normalizeKey(canonical, this.platform), canonical);
        }
      }
    } catch {
      // A missing or unreadable registry means no prior authorization.
    }
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(Array.from(this.authorized.values()), null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch {
      // Persistence failure must not crash the app; keep the in-memory grant.
    }
  }

  /**
   * Record an explicit user authorization. Returns the canonical path that was
   * stored, or null when the input is not an existing directory.
   */
  authorize(input: string): string | null {
    const canonical = this.canonicalizeDirectory(input);
    if (!canonical) return null;
    this.load();
    this.authorized.set(normalizeKey(canonical, this.platform), canonical);
    this.persist();
    return canonical;
  }

  /** Return the canonical path when it is already authorized, otherwise null. */
  getCanonical(input: string | null | undefined): string | null {
    if (!input) return null;
    this.load();
    const canonical = this.canonicalizeDirectory(input);
    if (!canonical) return null;
    return this.authorized.get(normalizeKey(canonical, this.platform)) ?? null;
  }

  isAuthorized(input: string | null | undefined): boolean {
    return this.getCanonical(input) !== null;
  }

  revoke(input: string | null | undefined): boolean {
    this.load();
    if (!input) return false;
    const canonical = this.canonicalizeDirectory(input);
    if (!canonical) return false;
    const removed = this.authorized.delete(normalizeKey(canonical, this.platform));
    if (removed) this.persist();
    return removed;
  }

  list(): string[] {
    this.load();
    return Array.from(this.authorized.values());
  }
}
