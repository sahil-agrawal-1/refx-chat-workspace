/**
 * Pure sender-origin checks for IPC handlers.
 *
 * Electron's preload only exposes a narrow API, but a compromised renderer can
 * still call every method it exposes. IPC handlers therefore verify that the
 * message came from the top-level application document (the Vite dev origin, or
 * a file inside the packaged `dist` directory) and not from a navigated frame.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWithinRoot } from '../utils/workspace-path';

export interface TrustedRendererOptions {
  isDev: boolean;
  devServerUrl?: string;
  /** Absolute path to the built renderer directory (`.../dist`). */
  prodRoot: string;
}

export function isTrustedRendererUrl(
  rawUrl: string,
  options: TrustedRendererOptions,
): boolean {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (options.isDev && options.devServerUrl) {
    try {
      if (parsed.origin === new URL(options.devServerUrl).origin) return true;
    } catch {
      // Invalid dev server URL: fall through to the production check.
    }
  }

  if (parsed.protocol !== 'file:') return false;

  try {
    const filePath = path.resolve(fileURLToPath(parsed));
    return isWithinRoot(filePath, path.resolve(options.prodRoot));
  } catch {
    return false;
  }
}
