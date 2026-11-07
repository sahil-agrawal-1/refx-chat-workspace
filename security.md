# REFX AI — Security Documentation

**Version:** 1.0  
**Date:** 11/3/2026  
**Scope:** REFX AI Workspace (Stage 1 / P1-P3 implementation)

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Credential Storage Architecture](#2-credential-storage-architecture)
3. [IPC Security Boundaries](#3-ipc-security-boundaries)
4. [XSS Prevention](#4-xss-prevention)
5. [Error Handling & Information Disclosure](#5-error-handling--information-disclosure)
6. [Browser Preview Security](#6-browser-preview-security)
7. [CI/CD Security Pipeline](#7-cicd-security-pipeline)
8. [Incident Response](#8-incident-response)
9. [Known Limitations](#9-known-limitations)
10. [Workspace Filesystem Security (P5-A / P5-B / P6)](#10-workspace-filesystem-security-p5-a--p5-b--p6)
11. [Memory Encryption (Phase 3)](#11-memory-encryption-phase-3)
12. [Renderer Defense in Depth (Phase 4)](#12-renderer-defense-in-depth-phase-4)

---

## 1. Threat Model

### Assets Protected
- **API keys** for Ollama, Google Gemini, OpenAI, Anthropic, OpenRouter, LM Studio, OpenAI-compatible, and Custom Local providers
- **Conversation history** (user messages, assistant responses)
- **Workspace folder paths** and file system references

### Threat Actors
- **Local malicious script** — any JavaScript running in the renderer process
- **Local malicious process** — any process running on the user's Windows machine with user-level access
- **Network attacker** — man-in-the-middle on provider API calls (mitigated by TLS everywhere)

### Trust Boundaries
- **Renderer ↔ Main Process** — strictly allowlisted IPC via `contextBridge`; `ipcRenderer` never exposed directly
- **Main Process ↔ Provider APIs** — TLS 1.2+ for all cloud providers; loopback-only for Ollama/LM Studio
- **Renderer ↔ localStorage** — provider metadata stored without API keys; keys never written here

---

## 2. Credential Storage Architecture

### Before P2 (Vulnerable)
API keys were stored in plaintext in `localStorage` under `refx_providers`, accessible to any script in the renderer process. A hardcoded AES-256-CBC key (`refx-ai-desktop-v1-encryption-key`) was used for reversible encryption in the main process, but the key was embedded in source code.

### After P2 (Secure)
| Property | Implementation |
|----------|----------------|
| **Encryption at rest** | Electron `safeStorage.encryptString()` / `decryptString()` (Windows DPAPI) |
| **Storage location** | `app userData/provider-credentials.json` (outside web-accessible origin) |
| **Key management** | OS-bound DPAPI key; no application-embedded secrets |
| **Renderer access** | None — credentials never returned to renderer via IPC |
| **Main process access** | `getCredentialForProvider()` internal-only; used by `verifyProviderConnection` and `startProviderChat*` |
| **Migration** | Plaintext localStorage keys detected → encrypted → confirmed stored → removed from localStorage |
| **Fail-secure** | If `safeStorage.isEncryptionAvailable()` returns false, credentials are rejected; no plaintext fallback |

### Credential Lifecycle

1. User enters API key in ProviderModal (renderer)
2. `saveProviderConfig()` strips `apiKey` from provider metadata
3. **Credential saved FIRST** — key sent via `desktop.saveCredential(providerId, apiKey)` IPC; main process encrypts via `safeStorage.encryptString()` and persists to `provider-credentials.json`
4. **Only on success** — provider metadata (without API key) is saved to localStorage via `desktopBridge.provider.saveProvider()`
5. If credential encryption or disk write fails, metadata is not saved; user sees a warning notification
6. On verification/chat: main process calls `getCredentialForProvider(providerId)` to decrypt internally
7. Decrypted key never leaves the main process

### Save-Order Guarantee

Credential persistence happens before provider metadata is written to localStorage. This prevents a restart from leaving a provider configured with no API key. If `safeStorage.isEncryptionAvailable()` returns false or `saveCredentialStore` cannot write the file, the credential save fails securely with no plaintext fallback, and provider metadata is not persisted.

---

## 3. IPC Security Boundaries

### Allowlisted Channels
All IPC channels are defined as constants in `shared/contracts/desktop-bridge.ts`:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `desktop:verifyProvider` | Renderer → Main | Provider verification (config without apiKey) |
| `desktop:startProviderChat` | Renderer → Main | Streaming chat (config without apiKey) |
| `desktop:cancelProviderChat` | Renderer → Main | Cancel active generation |
| `desktop:saveCredential` | Renderer → Main | Save encrypted credential (send-only) |
| `desktop:deleteCredential` | Renderer → Main | Delete credential |
| `desktop:hasCredential` | Renderer → Main | Check credential existence |
| `desktop:migrateCredential` | Renderer → Main | One-time plaintext→encrypted migration |
| `desktop:providerStream` | Main → Renderer | Streaming chunks/done/error events |

### Security Properties
- **No credential IPC read** — there is no `getCredential` or `readCredential` IPC method; decrypted keys never leave the main process
- **No arbitrary IPC** — channels are allowlisted constants; `ipcRenderer` is not exposed to the renderer
- **Context isolation** — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in `webPreferences`

---

## 4. XSS Prevention

### Chat Export (`ExportChatModal.tsx`)
All user-controlled content is HTML-escaped before rendering:

| Content | Sanitization |
|---------|--------------|
| Conversation title | `escapeHtml()` |
| Model name | `escapeHtml()` |
| Message role | `escapeHtml()` |
| Message content | `escapeHtml()` + newline → `<br>` |
| Download filename | Sanitized (alphanumeric + dashes, max 64 chars) |

### URL Validation
`isSafeUrl()` validates that URLs use only `http:` or `https:` schemes. `javascript:`, `data:`, `file:` and invalid URLs are rejected. Phase 4 moves the same scheme check into `shared/security/url-policy.ts` and reuses it for chat markdown links, IPC `openExternal`, and dev/prod navigation guards.

### What Was Fixed
- Conversation title interpolated directly into `<title>` and `<h2>` → now escaped
- Message role interpolated into CSS class → now escaped
- Message content interpolated into `<div>` → now escaped with newline conversion
- Filename derived from title → now sanitized

---

## 5. Error Handling & Information Disclosure

### Error Messages
- **No stack traces leaked** to the renderer
- **No API keys in error messages** — keys are never included in error strings or diagnostic URLs
- **Provider-accurate labels** — errors use `**${providerName} Error:**` instead of hardcoded "Ollama Error"
- **No fake AI responses** — errors are reported honestly as system messages

### Example Error Messages

- `**Ollama Error:** Connection refused` — Ollama daemon unreachable
- `**Google Gemini Error:** Invalid Gemini API key.` — authentication failure
- `**Google Gemini Error:** Gemini model "gemini-2.5-flash" not found (HTTP 404). Please verify the provider and select a valid model from the discovered list.` — model not found
- `**Provider Error:** Provider verification timed out.` — timeout
- `**OpenRouter Error:** OpenRouter is temporarily unavailable (HTTP 503). Please wait a moment and try again.` — provider service unavailable
- `**Error during message send:** ...` — unexpected exception

---

## 6. Browser Preview Security

### Limitations
Browser preview mode (`BrowserPreviewBridgeAdapter`) explicitly does **not**:
- Store API keys in `localStorage` (plaintext keys are stripped before save)
- Perform real cloud provider verification (no secure credential storage available)
- Accept API keys based on length or format alone

### Honest Messaging
Cloud providers in browser preview return:
> "Real provider verification for [Provider] requires the Electron desktop app. Browser preview does not support secure credential storage."

Ollama and LM Studio (local providers) can be verified via network fetch when the server is reachable on localhost.

---

## 7. CI/CD Security Pipeline

### GitHub Actions (`.github/workflows/security.yml`)
Runs on every push/PR to `main`:

1. **Lint** — `tsc --noEmit` (TypeScript type check)
2. **Build web** — `pnpm run build`
3. **Build Electron** — `pnpm run build:electron`
4. **Run all tests** — chat store (8), security (22), provider verification (18), diff (3) = 51 tests
5. **Security scans** — verifies no hardcoded encryption keys, no plaintext API keys in localStorage, `safeStorage` used, HTML escaping present

### Pre-commit Hook (`.git/hooks/pre-commit`)
Runs locally before every commit:
1. Lint (TypeScript type check)
2. Web build
3. Electron build
4. All 51 tests

If **any** check fails, the commit is **rejected** with a `REJECTED` message.

---

## 8. Incident Response

### Suspected API Key Compromise
1. User revokes the compromised key at the provider console
2. User deletes the credential via `desktop.deleteCredential(providerId)` (Providers modal → delete)
3. User saves a new key via `desktop.saveCredential(providerId, newKey)`
4. Old encrypted credential is overwritten in `provider-credentials.json`

### Encryption Unavailable

If `safeStorage.isEncryptionAvailable()` returns false or the credential file cannot be written to disk:

- Credential save fails with a warning notification
- Provider metadata is not saved (save-order: credential first, metadata second)
- No plaintext fallback is ever used
- User is instructed to use the Electron desktop app on a supported platform
- Write errors propagate from `saveCredentialStore` instead of being silently swallowed

---

## 9. Known Limitations

| Limitation | Risk | Mitigation |
|------------|------|------------|
| Provider verification tests use mocked `window.desktop` | Cannot claim providers work against real endpoints without live API keys | Documentation states this limitation; live testing required before production shipping |
| Custom local endpoint returns non-JSON → `auth-verified-model-untested` | Users must enter model ID manually | Clearly communicated in UI |
| Memory stored in `localStorage`, not SQLite | LocalStorage is accessible to renderer scripts | Memory entries do not contain credentials; planned migration to SQLite |
| `pnpm-workspace.yaml` lists `electron-winstaller` and `protobufjs` not in dependencies | Stale config, not a security risk | Harmless; can be cleaned up |
| TypeScript `^7.0.2` may not resolve | Build risk, not a security risk | Version may need adjustment |

## 10. Workspace Filesystem Security (P5-A / P5-B / P6)

### Authorization Boundary
- Selected workspace folder is the default authorization boundary.
- All filesystem operations validate canonical paths with `fs.realpathSync`.
- Symlink, junction, and reparse-point escapes are rejected.
- Path traversal (`..`) is blocked via containment checks.
- Windows paths are compared case-insensitively but traversal sequences are never weakened.

### Exclusions
- `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `.cache`, `.turbo`, `out`, `release` are excluded.
- `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.crt`, `*.cer` are excluded.
- Reading excluded or external files requires explicit permission.

### File Modification Safety (P5-B)
- All modifications require explicit user approval enforced in the Main Process.
- Models cannot approve their own changes.
- Pending operations include unique IDs, canonical paths, original content hash, timestamps, and status.
- Original file hash is revalidated before applying to prevent overwriting unexpected edits.
- Backups are created and verified before modification; restore is supported.
- Deletion prefers `shell.trashItem` (Recycle Bin).
- Failed operations trigger rollback when a backup exists.

### AI Tool Access (P6)
- Workspace tools are exposed to the model only through validated Main Process IPC.
- File contents are treated as untrusted data and never override system rules.
- Only relevant, user-authorized file context is sent to providers.

### CI Scanner
- `security.yml` scans for `localStorage.setItem(...apiKey)` patterns in source.
- No plaintext API keys are persisted to localStorage or browser preview storage.

## 11. Memory Encryption (Phase 3)

Memory encryption is opt-in through `memory_config.encryptionEnabled`. When enabled, memory JSON and Markdown files are encoded with Electron `safeStorage` (Windows DPAPI) and prefixed with `enc:v1:`.

### Fail-Secure Write Path
- Encryption runs before any temp file, primary file, or `.bak` file is touched.
- If secure storage is unavailable or `safeStorage.encryptString()` throws, the write aborts with a descriptive `MemoryEncryptionError`.
- The original plaintext is never returned from the encryptor and is never written as a fallback.
- Memory save/update IPC errors propagate to the renderer; the UI shows a warning notification and keeps forms populated for retry.
- Task memory updates pre-encrypt both `metadata.json` and `memory.md` before writing either file.

### Previously Written Plaintext
- Files without the `enc:v1:` marker are treated as legacy plaintext and remain readable.
- There is no destructive bulk migration. On the next successful write of that file, the new content (and refreshed `.bak`) is written encrypted.
- Disabling encryption affects future writes only. Existing encrypted files remain readable while OS secure storage is available.

### Undecryptable Data
- Encrypted data is never treated as plaintext.
- If the marker is present but decryption fails, or secure storage is unavailable, reads fail closed with a clear error.
- The app does not fall back to empty data or to an older backup, because a subsequent save could overwrite newer memory. The file is left unchanged.
- Recovery options are to restore the file from a user backup or re-open the app under the OS account that created the encryption key.

### Tests
`shared/utils/memory-encryption.test.ts` covers encryption success, unavailable/failed encryption, legacy plaintext reads, undecryptable ciphertext, file preservation on failure, encrypted backup writes, plaintext upgrade-on-save, and corrupt-primary recovery.

## 13. Recent UI and Theme Hardening (2026-11-06)

- Light mode now resolves `System` and applies theme tokens consistently.
- Hardcoded dark surfaces/borders/text in major components were converted to theme-aware utilities.
- Settings selected tabs and skill buttons use foreground colors instead of fixed white.
- Skill creation writes a visible Markdown file in the app skills directory.
- All enabled skills are injected into AI context for every request.

## 12. Renderer Defense in Depth (Phase 4)

### Content Security Policy
Both an HTTP response header and an equivalent HTML `<meta>` tag carry the policy. The two documents are kept in sync through `shared/security/csp.ts`; the Vite transform generates the meta tag at build/dev time.

Production policy:
| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only same-origin resources by default |
| `script-src` | `'self'` | Blocks inline scripts, `eval`, and remote script hosts |
| `script-src-attr` | `'none'` | Blocks inline event handlers |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind/React style attributes need inline CSS; script is still blocked |
| `img-src` | `'self' data: blob:` | Attachment previews use object URLs |
| `font-src` | `'self' data:` | System fonts only |
| `connect-src` | `'self'` | Renderer does not make provider calls; they run in the main process |
| `worker-src` | `'self' blob:` | Web Workers only from the app bundle |
| `object-src` | `'none'` | No Flash/plugins |
| `base-uri` | `'none'` | Prevents base-hijacking of relative URLs |
| `form-action` | `'none'` | No form posts from the renderer |
| `frame-ancestors` | `'none'` | Prevents framing of the app |
| `frame-src` | `'none'` | No nested browsing contexts |

Development keeps `script-src` on `'self' 'unsafe-inline'` (Vite's React Refresh preamble) and broadens `connect-src` to `http:`/`https:`/`ws:`/`wss:` so HMR and the browser-preview provider probe still work. The shipped build removes both concessions.

### Link Handling
- Markdown links in `ChatMessageList.renderInline` are passed through `sanitizeExternalUrl`.
- Only absolute `http:` / `https:` URLs become anchors. Scheme obfuscation (`javascript:`, `data:`, `file:`, `vbscript:`, `java\tscript:`), whitespace, control characters, embedded credentials, and relative paths are rejected or rendered as plain text.
- `ProviderModal` provider links additionally require `rel="noopener noreferrer"`.
- `shell.openExternal` in the main process is gated by the same `sanitizeExternalUrl` helper and never receives `file:`, `javascript:` etc.
- Main-process navigation is restricted to the dev origin or files under the packaged renderer directory; `will-redirect` and in-page navigations are also guarded, and `will-attach-webview` is denied.

### IPC Sender Validation
- `trustedHandle` wraps all `ipcMain.handle` registrations.
- Each invocation requires the sender to be the top-level frame of the application window, and its URL to be the Vite dev origin (development) or a file inside the packaged renderer directory (`dist/index.html` and its assets).
- `webview` attachment, new-window requests and unexpected permission requests are denied; only clipboard write is allowed.

### IPC Argument Validation
High-risk handlers validate arguments in the main process: `shared/security/ipc-validation.ts`
- terminal shell allowlist (`powershell.exe`, `pwsh.exe`, `cmd.exe`, `bash*`, `wsl.exe`)
- string length bounds, non-empty IDs, URL/cwd maxima
- terminal dimensions clamped to 2-1000
- credential, memory, skill and trash payloads are checked as plain objects with sane string fields; memory scopes are limited to `app`/`task`

### Preload Scoping
- `contextBridge.exposeInMainWorld` exposes a single allowlisted API surface (`window.desktop`).
- No `ipcRenderer`, no `require`, `nodeIntegration`, `contextIsolation false`, or `nodeIntegrationInWorker` access is exposed.
- The exported bridge is deep-frozen so renderer code cannot replace individual methods.

### Tests
`shared/utils/security-policy.test.ts` (13 tests) covers:
- production CSP blocks inline/eval script, unexpected schemes and injection
- CSP retains styles, blob, and data URLs needed for normal features
- development CSP relaxations are present but production stays strict
- meta fallback removes header-only directives
- external URL sanitization
- IPC sender-origin allow/deny
- IPC argument validation
- static scan: renderer contains no `dangerouslySetInnerHTML`, `innerHTML =`, `document.write`, `eval`, or `new Function`
- chat links invoke the shared sanitizer instead of binding raw targets

### Limitations
- Development enables `'unsafe-inline'` for scripts because of Vite's React Refresh preamble and broad dev connect schemes for browser preview.
- Electron devtools and remote debugging remain available in development; packaged builds retain the strict profile above.

## 14. Memory Backup and Recovery (2026-11-07)

- Secure local memory backup/restore is available through the Memory Manager.
- Backups are validated before restore and the previous data is preserved on failure.
- Deletion, migration, and recovery behavior is covered by the existing memory test suite.

