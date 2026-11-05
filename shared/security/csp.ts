/**
 * Content Security Policy construction shared by the Electron main process,
 * the Vite HTML transform, and unit tests.
 *
 * Production is intentionally strict: only same-origin scripts may execute and
 * inline/eval script is blocked. Development relaxes just enough for Vite's
 * React Refresh preamble and HMR websocket, because those do not exist in the
 * packaged app.
 */

export interface CspOptions {
  isDev: boolean;
  devServerUrl?: string;
}

export type CspDirectives = Record<string, string[]>;

/**
 * Directives that are valid in a `<meta http-equiv="Content-Security-Policy">`
 * tag. `frame-ancestors` is header-only and is ignored (with a console warning)
 * when delivered via meta.
 */
const META_UNSUPPORTED_DIRECTIVES = new Set(['frame-ancestors', 'sandbox', 'report-uri']);

export function buildCspDirectives(options: CspOptions): CspDirectives {
  const directives: CspDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'script-src-attr': ["'none'"],
    // Tailwind and React style attributes need inline CSS. Inline style is far
    // less dangerous than inline script and does not enable code execution.
    'style-src': ["'self'", "'unsafe-inline'"],
    // Attachment previews use blob: URLs; icons may be inline data: SVGs.
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'media-src': ["'self'", 'data:', 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
  };

  if (options.isDev) {
    // Vite's React plugin injects an inline module preamble for React Refresh.
    // This concession is development-only and never shipped in a build.
    directives['script-src'] = ["'self'", "'unsafe-inline'"];
    // HMR uses a websocket. Browser-preview provider discovery may also call
    // local/LAN model endpoints, so development allows network schemes.
    directives['connect-src'] = ["'self'", 'http:', 'https:', 'ws:', 'wss:'];
  }

  return directives;
}

export function serializeCspDirectives(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

/** Policy for a real HTTP response header (supports every directive). */
export function buildContentSecurityPolicy(options: CspOptions): string {
  return serializeCspDirectives(buildCspDirectives(options));
}

/** Policy for a `<meta>` fallback, where frame-ancestors is not supported. */
export function buildMetaContentSecurityPolicy(options: CspOptions): string {
  const directives = buildCspDirectives(options);
  for (const name of META_UNSUPPORTED_DIRECTIVES) delete directives[name];
  return serializeCspDirectives(directives);
}
