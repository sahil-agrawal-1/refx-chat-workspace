/**
 * Pure, platform-aware helpers for workspace filesystem containment.
 * Shared between Electron main process and unit tests.
 *
 * Security invariants (preserved by all helpers):
 *  - Paths are normalized via path.resolve / realpath before comparison.
 *  - Containment is checked against the authorized workspace root.
 *  - On Windows, comparison is case-insensitive (filesystem semantics) but
 *    realpath/traversal/exclusion checks still apply.
 *  - Never weaken security via naive lowercasing of traversal sequences.
 */

import path from 'node:path';
import fs from 'node:fs';

export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export const EXCLUDED_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  '.turbo',
  'out',
  'release',
]);

export const EXCLUDED_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.crt', '.cer']);

export function isExcludedRelative(relativePath: string): boolean {
  if (!relativePath || relativePath === '.') return false;
  const segments = relativePath.split(/[\\/]/);
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (EXCLUDED_NAMES.has(lower)) return true;
    if (lower.startsWith('.env')) return true;
    const ext = path.extname(lower);
    if (EXCLUDED_EXTENSIONS.has(ext)) return true;
  }
  return false;
}

export function toComparablePath(p: string, platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? p.toLowerCase() : p;
}

export function isWithinRoot(candidate: string, root: string, platform: NodeJS.Platform = process.platform): boolean {
  const cand = toComparablePath(candidate, platform);
  const rootCmp = toComparablePath(root, platform);
  const sepCmp = toComparablePath(path.sep, platform);
  return cand === rootCmp || cand.startsWith(rootCmp + sepCmp);
}

export interface ResolveOptions {
  allowMissing?: boolean;
  platform?: NodeJS.Platform;
}

export function resolveWithinWorkspace(
  inputPath: string,
  root: string,
  options: ResolveOptions = {},
): string {
  const platform = options.platform ?? process.platform;
  const allowMissing = options.allowMissing ?? false;

  if (!inputPath || !inputPath.trim()) {
    return root;
  }
  const trimmed = inputPath.trim();
  let resolved: string;
  if (/^[a-zA-Z]:[/\\]/.test(trimmed)) {
    resolved = path.resolve(trimmed);
  } else {
    const cleanRel = trimmed.replace(/^[/\\]+/, '');
    resolved = path.resolve(root, cleanRel);
  }
  let real = resolved;
  if (fs.existsSync(resolved)) {
    real = fs.realpathSync(resolved);
  } else if (!allowMissing) {
    throw new Error('Path does not exist.');
  }
  const realCmp = toComparablePath(real, platform);
  const rootCmp = toComparablePath(root, platform);
  const sepCmp = toComparablePath(path.sep, platform);
  if (realCmp !== rootCmp && !realCmp.startsWith(rootCmp + sepCmp)) {
    throw new Error('Path is outside the selected workspace.');
  }
  const relative = path.relative(root, real);
  if (isExcludedRelative(relative)) {
    throw new Error('Path is excluded by workspace security policy.');
  }
  return real;
}