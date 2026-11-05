import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildContentSecurityPolicy,
  buildCspDirectives,
  buildMetaContentSecurityPolicy,
} from '../security/csp';
import {
  isAllowedExternalUrl,
  sanitizeExternalUrl,
} from '../security/url-policy';
import { isTrustedRendererUrl } from '../security/ipc-sender';
import {
  IpcArgumentError,
  assertFiniteInteger,
  assertOptionalString,
  assertPlainObject,
  assertString,
} from '../security/ipc-validation';

function parsePolicy(policy: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const segment of policy.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    result.set(name, values);
  }
  return result;
}

function sourceFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...sourceFiles(full));
    else if (/\.(ts|tsx|js|jsx|html)$/.test(entry.name)) result.push(full);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Content Security Policy
// ---------------------------------------------------------------------------

test('production CSP blocks inline/eval script and unexpected resource types', () => {
  const policy = buildContentSecurityPolicy({ isDev: false });
  const directives = parsePolicy(policy);

  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src-attr'), ["'none'"]);
  assert.deepEqual(directives.get('connect-src'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('base-uri'), ["'none'"]);
  assert.deepEqual(directives.get('form-action'), ["'none'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);

  const scriptSources = directives.get('script-src') || [];
  assert.ok(!scriptSources.includes("'unsafe-inline'"), 'production must not allow inline script');
  assert.ok(!scriptSources.includes("'unsafe-eval'"), 'production must not allow eval');
  assert.ok(!scriptSources.some((source) => /^https?:/.test(source)), 'scripts must be same-origin');
});

test('production CSP keeps support for normal app styling and attachment previews', () => {
  const directives = buildCspDirectives({ isDev: false });

  // Tailwind/React style attributes and Vite-injected styles in development.
  assert.ok(directives['style-src'].includes("'unsafe-inline'"));
  // Chat attachments use URL.createObjectURL -> blob: image previews.
  assert.ok(directives['img-src'].includes('blob:'));
  assert.ok(directives['img-src'].includes('data:'));
  assert.ok(directives['font-src'].includes('data:'));
  assert.ok(directives['media-src'].includes('blob:'));
});

test('development CSP allows only the extra sources Vite actually needs', () => {
  const directories = buildCspDirectives({ isDev: true });
  const connectSources = directories['connect-src'];

  // React Refresh injects an inline module preamble in development.
  assert.ok(directories['script-src'].includes("'unsafe-inline'"));
  // HMR needs a websocket; browser preview may call local model endpoints.
  assert.ok(connectSources.includes('ws:'));
  assert.ok(connectSources.includes('wss:'));
  assert.ok(connectSources.includes('http:'));
  // The dangerous directives stay locked down even in development.
  assert.deepEqual(directories['object-src'], ["'none'"]);
  assert.deepEqual(directories['base-uri'], ["'none'"]);

  const production = buildCspDirectives({ isDev: false });
  assert.notDeepEqual(directories['script-src'], production['script-src']);
});

test('meta CSP fallback omits header-only directives', () => {
  const metaPolicy = buildMetaContentSecurityPolicy({ isDev: false });
  const directives = parsePolicy(metaPolicy);

  assert.equal(directives.has('frame-ancestors'), false);
  assert.deepEqual(directives.get('script-src'), ["'self'"]);
});

// ---------------------------------------------------------------------------
// External URL / link policy
// ---------------------------------------------------------------------------

test('external link policy allows absolute http(s) URLs', () => {
  assert.equal(sanitizeExternalUrl('https://example.com/docs?q=1#top'), 'https://example.com/docs?q=1#top');
  assert.equal(isAllowedExternalUrl('http://127.0.0.1:11434'), true);
  assert.equal(isAllowedExternalUrl('  https://example.com/path  '), true);
});

test('external link policy rejects script, data, file and malformed URLs', () => {
  const rejected = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///C:/Windows/System32/calc.exe',
    'vbscript:msgbox(1)',
    '/relative/path',
    '//evil.example/path',
    '',
    '   ',
    'not a url',
    'https://user:pass@example.com/',
  ];

  for (const value of rejected) {
    assert.equal(sanitizeExternalUrl(value), null, `expected rejection: ${value}`);
  }

  assert.equal(isAllowedExternalUrl(null), false);
  assert.equal(isAllowedExternalUrl(42), false);
});

// ---------------------------------------------------------------------------
// IPC sender origin policy
// ---------------------------------------------------------------------------

test('IPC sender policy accepts the dev origin only in development', () => {
  const options = {
    isDev: true,
    devServerUrl: 'http://localhost:3000',
    prodRoot: path.join(os.tmpdir(), 'does-not-matter'),
  };

  assert.equal(isTrustedRendererUrl('http://localhost:3000/?x=1', options), true);
  assert.equal(isTrustedRendererUrl('http://evil.example/', options), false);
  assert.equal(isTrustedRendererUrl('https://localhost:3000/', options), false);
  assert.equal(
    isTrustedRendererUrl('http://localhost:3000/', { ...options, isDev: false }),
    false,
  );
});

test('IPC sender policy accepts only packaged files inside the renderer root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'refx-ipc-sender-'));
  const prodRoot = path.join(root, 'dist');
  fs.mkdirSync(prodRoot, { recursive: true });

  const options = { isDev: false, prodRoot };
  const inside = pathToFileURL(path.join(prodRoot, 'index.html')).href;
  const outside = pathToFileURL(path.join(root, 'elsewhere', 'index.html')).href;

  try {
    assert.equal(isTrustedRendererUrl(inside, options), true);
    assert.equal(isTrustedRendererUrl(outside, options), false);
    assert.equal(isTrustedRendererUrl('file:///C:/Windows/win.ini', options), false);
    assert.equal(isTrustedRendererUrl('javascript:alert(1)', options), false);
    assert.equal(isTrustedRendererUrl('', options), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// IPC argument validation
// ---------------------------------------------------------------------------

test('string validation enforces type, emptiness and length bounds', () => {
  assert.equal(assertString('ok', 'value'), 'ok');
  assert.throws(() => assertString(1, 'value'), IpcArgumentError);
  assert.throws(() => assertString('', 'value'), IpcArgumentError);
  assert.throws(() => assertString('abc', 'value', { maxLength: 2 }), IpcArgumentError);
  assert.equal(assertString('', 'value', { allowEmpty: true }), '');
  assert.equal(assertOptionalString(undefined, 'value'), undefined);
  assert.equal(assertOptionalString(null, 'value'), undefined);
  assert.equal(assertOptionalString('set', 'value'), 'set');
});

test('integer validation rejects floats, NaN and out-of-range values', () => {
  assert.equal(assertFiniteInteger(80, 'cols', 2, 1000), 80);
  assert.throws(() => assertFiniteInteger(2.5, 'cols', 2, 1000), IpcArgumentError);
  assert.throws(() => assertFiniteInteger(Number.NaN, 'cols', 2, 1000), IpcArgumentError);
  assert.throws(() => assertFiniteInteger(1, 'cols', 2, 1000), IpcArgumentError);
  assert.throws(() => assertFiniteInteger('80', 'cols', 2, 1000), IpcArgumentError);
});

test('plain-object validation rejects null, arrays and primitives', () => {
  assert.deepEqual(assertPlainObject({ a: 1 }, 'payload'), { a: 1 });
  assert.throws(() => assertPlainObject(null, 'payload'), IpcArgumentError);
  assert.throws(() => assertPlainObject([1], 'payload'), IpcArgumentError);
  assert.throws(() => assertPlainObject('x', 'payload'), IpcArgumentError);
});

// ---------------------------------------------------------------------------
// Renderer source audit
// ---------------------------------------------------------------------------

test('renderer source contains no raw HTML injection or eval sinks', () => {
  const srcRoot = path.resolve(process.cwd(), 'src');
  assert.ok(fs.existsSync(srcRoot), 'src directory should exist');

  const forbidden = /dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\(|\beval\(|new Function\(/;
  const offenders = sourceFiles(srcRoot).filter((file) =>
    forbidden.test(fs.readFileSync(file, 'utf8')),
  );

  assert.deepEqual(offenders, [], `unexpected raw HTML/eval sink in: ${offenders.join(', ')}`);
});

test('chat markdown links are sanitized before becoming anchors', () => {
  const file = path.resolve(process.cwd(), 'src/components/chat/ChatMessageList.tsx');
  const source = fs.readFileSync(file, 'utf8');

  assert.ok(
    source.includes('sanitizeExternalUrl(match[5])'),
    'chat links must pass through the URL policy',
  );
  assert.ok(
    !/href=\{match\[5\]\}/.test(source),
    'raw markdown targets must never be used directly as href',
  );
});
