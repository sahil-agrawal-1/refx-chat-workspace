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
API keys were stored in plaintext in `localStorage` under `antigravity_providers`, accessible to any script in the renderer process. A hardcoded AES-256-CBC key (`refx-ai-desktop-v1-encryption-key`) was used for reversible encryption in the main process, but the key was embedded in source code.

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
2. `saveProviderConfig()` strips `apiKey` from provider metadata before `localStorage` save
3. Key sent via `desktop.saveCredential(providerId, apiKey)` IPC (send-only)
4. Main process encrypts via `safeStorage.encryptString()` and persists to `provider-credentials.json`
5. On verification/chat: main process calls `getCredentialForProvider(providerId)` to decrypt internally
6. Decrypted key never leaves the main process

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
`isSafeUrl()` validates that URLs use only `http:` or `https:` schemes. `javascript:`, `data:`, `file:` and invalid URLs are rejected.

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
- `**Provider Error:** Provider verification timed out.` — timeout
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
If `safeStorage.isEncryptionAvailable()` returns false:
- Credential save fails with a warning notification
- No plaintext fallback is ever used
- User is instructed to use the Electron desktop app on a supported platform

---

## 9. Known Limitations

| Limitation | Risk | Mitigation |
|------------|------|------------|
| Provider verification tests use mocked `window.desktop` | Cannot claim providers work against real endpoints without live API keys | Documentation states this limitation; live testing required before production shipping |
| Custom local endpoint returns non-JSON → `auth-verified-model-untested` | Users must enter model ID manually | Clearly communicated in UI |
| Memory stored in `localStorage`, not SQLite | LocalStorage is accessible to renderer scripts | Memory entries do not contain credentials; planned migration to SQLite |
| `pnpm-workspace.yaml` lists `electron-winstaller` and `protobufjs` not in dependencies | Stale config, not a security risk | Harmless; can be cleaned up |
| TypeScript `^7.0.2` may not resolve | Build risk, not a security risk | Version may need adjustment |
