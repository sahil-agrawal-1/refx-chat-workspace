/**
 * URL scheme policy for links that leave the renderer.
 *
 * Only absolute http(s) URLs are allowed. Model output and imported content are
 * untrusted, so `javascript:`, `data:`, `file:`, `vbscript:` and other schemes
 * must never reach an anchor href or `shell.openExternal`.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// Raw whitespace/control characters are rejected before parsing. Browsers can
// silently strip tabs/newlines inside schemes (for example `java\tscript:`),
// so accepting them would make scheme checks easier to bypass.
const RAW_CONTROL_OR_SPACE = /[\u0000-\u0020\u007f]/;

export function parseAllowedExternalUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed || RAW_CONTROL_OR_SPACE.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  if (!parsed.hostname) return null;
  // Embedded credentials are a phishing vector and never needed by the app.
  if (parsed.username || parsed.password) return null;

  return parsed;
}

export function isAllowedExternalUrl(raw: unknown): boolean {
  return parseAllowedExternalUrl(raw) !== null;
}

/** Returns a normalized href, or null when the link must not be clickable. */
export function sanitizeExternalUrl(raw: unknown): string | null {
  const parsed = parseAllowedExternalUrl(raw);
  return parsed ? parsed.href : null;
}
