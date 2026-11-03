# REFX Chat App — Technical Audit Report

**Status:** Inspection-Only Audit  
**Scope:** Source files only. `node_modules/`, `dist/`, `dist-electron/`, and `release/` build outputs excluded.  
**Constraint:** No existing project files were modified. UI preserved as-is.  
**Report generated:** 11/2/2026  

---

## Table of Contents
1. [Project Structure & Dependencies](#1-project-structure--dependencies)
2. [Remaining Dummy Data & Fake Functionality](#2-remaining-dummy-data--fake-functionality)
3. [Chat & Model Provider Architecture](#3-chat--model-provider-architecture)
4. [Ollama & LM Studio Integration Readiness](#4-ollama--lm-studio-integration-readiness)
5. [API Key Storage & Security](#5-api-key-storage--security)
6. [Conversation Persistence & Memory Architecture](#6-conversation-persistence--memory-architecture)
7. [Workspace & Filesystem Integration](#7-workspace--filesystem-integration)
8. [Terminal Integration & Permissions](#8-terminal-integration--permissions)
9. [Electron Main Process, Preload & IPC Readiness](#9-electron-main-process-preload--ipc-readiness)
10. [Build Errors & Missing Dependencies](#10-build-errors--missing-dependencies)
11. [Summary: Existing vs Missing Functionality](#summary-existing-vs-missing-functionality)
12. [Security Problems](#security-problems)
13. [Files Requiring Changes](#files-requiring-changes)
14. [Recommended Implementation Order](#recommended-implementation-order)
15. [Change Log](#change-log)

---

## 1. Project Structure & Dependencies

### Root layout (source only)

```
electron/
  main.ts          # Electron main process (IPC handlers, window mgmt)
  preload.ts       # Preload script (contextBridge → window.desktop)
shared/
  contracts/
    desktop-bridge.ts   # Typed IDesktopBridge + sub-interfaces
src/
  main.tsx, App.tsx, index.css
  layouts/AppLayout.tsx
  stores/app-store.tsx  # Central React context/state store
  types/index.ts
  utils/diff.ts, diff.test.ts
  desktop/browser-preview-bridge.ts   # Stage 1 browser adapter (localStorage)
  components/
    chat/             ChatMessageList, ChatPromptInput, ModelSelectorDropdown
    common/           Modal, Toggle
    dialogs/          ExportChatModal, PermissionModal
    diff/             DiffReviewPanel
    memory/           MemoryModal
    onboarding/       OnboardingModal
    providers/        ProviderModal
    settings/         SettingsModal
    sidebar/          Sidebar
    terminal/         TerminalPanel
    workspace/        FileExplorerDrawer
```

### Key config files
`package.json`, `vite.config.ts`, `tsconfig.json`, `pnpm-workspace.yaml`, `.env.example`, `.gitignore`, `index.html`, `metadata.json`

### Dependencies (from package.json)

**Runtime:**
- `@google/genai` ^2.4.0
- `@tailwindcss/vite`
- `@vitejs/plugin-react` ^6.1.1
- `lucide-react` ^0.546.0
- `react` ^19.0.1
- `react-dom` ^19.0.1
- `vite` ^8.3.0
- `express` ^4.21.2
- `dotenv` ^17.2.3
- `motion` ^12.23.24

**Dev:**
- `electron` ^45.2.1
- `electron-builder` ^26.18.0
- `esbuild` ^0.28.0
- `tailwindcss` ^4.3.3
- `tsx` ^4.21.0
- `typescript` ^7.0.2
- `wait-on` ^9.5.1
- `concurrently` ^10.0.6
- `@types/*`

### Observations
- `pnpm-lock.yaml` present; no `package-lock.json`.
- `express`, `dotenv`, `@google/genai` are installed but **not imported anywhere in source** — staged for later stages.
- `electron-builder` config lives inline in `package.json` `build` field (NSIS + portable, x64 only).
- Build pipeline: `vite build` → `esbuild` bundles `electron/main.ts` (ESM) and `electron/preload.ts` (CJS) into `dist-electron/`.

## 2. Remaining Dummy Data & Fake Functionality

### No hardcoded fake conversations
`conversations` state starts empty (`[]`) and persists via `localStorage` key `antigravity_conversations`. Code comments explicitly state "Clean start with no fake conversations" and "No hardcoded fake projects."

### Fake / simulated functionality (Stage 1 browser adapter only)

`src/desktop/browser-preview-bridge.ts` `BrowserPreviewBridgeAdapter`:
- `fs.readDirectory` / `readFile` / `writeFile` — backed by an in-memory `Map`, not real disk.
- `terminal.sendInput` — **simulates fake terminal output** (canned "Welcome to Windows PowerShell" response echoed after 50ms), not a real PTY.
- `terminal.createSession` — returns a session that is never actually started (`isRunning: false`).
- `provider.saveProvider` / `verifyConnection` — persists to `localStorage`; `verifyConnection` for local providers does a real `fetch` ping; for cloud providers it fakes success if `apiKey.length > 8`.
- All memory (task/app/config) persisted to `localStorage`, not SQLite.

### UI-level
No dummy chat messages or dummy model data in the UI itself. Empty states are shown honestly ("No provider connected yet," "No files detected").

## 3. Chat & Model Provider Architecture

### Provider contract (`shared/contracts/desktop-bridge.ts`)
- `ProviderType`: `openai | gemini | anthropic | openai_compatible | openrouter | ollama | lm_studio | custom_local`
- `IProviderBridge`: `getProviders`, `saveProvider`, `deleteProvider`, `verifyConnection`

### Pre-configured providers (`browser-preview-bridge.ts` `INITIAL_PROVIDERS`)
Ollama (11434), LM Studio (1234/v1), Google Gemini, OpenAI, Anthropic, OpenRouter, OpenAI Compatible, Custom Local. All start `disconnected` with empty API keys.

### Provider UI
`ProviderModal` lets users edit base URL, API key (with show/hide), select discovered models, and run "Verify Connection."

### Chat flow (`app-store.tsx` `sendMessage`)
1. Creates/uses a conversation; appends user message.
2. If no provider is `connected` with a `selectedModel`, posts a **genuine system message** telling the user to connect a provider (no fake response).
3. If `saveMemoryActive`, saves task memory.
4. If running in Electron with `window.desktop.startOllamaChat`, streams Ollama response via `onOllamaStream` callback, incrementally updating the assistant message placeholder.
5. Browser fallback: shows a system message requiring Electron + Ollama.

### Gap
Only **Ollama** has a real inference path. LM Studio and all cloud providers are configurable but produce no inference output — `sendMessage` hardcodes the Ollama IPC channel.

## 4. Ollama & LM Studio Integration Readiness

### Ollama — READY (fully implemented in Electron main)
- `electron/main.ts` hardcodes `OLLAMA_HOST = 'http://127.0.0.1:11434'` (loopback only).
- IPC handlers:
  - `desktop:checkOllama` — `GET /api/tags` with 3.5s timeout.
  - `desktop:listOllamaModels` — `GET /api/tags`, parses model names with 4s timeout.
  - `desktop:startOllamaChat` — `POST /api/chat` with `stream: true`, NDJSON line parsing, `AbortController` support, per-request abort map, streams `chunk`/`done`/`error` events back via `ipcRenderer.send`.
  - `desktop:cancelOllamaChat` — aborts the request by `requestId`.
- Preload exposes all four Ollama methods via `window.desktop`.

### LM Studio — NOT READY for inference
- Configured as a provider with `baseUrl: 'http://localhost:1234/v1'`.
- `verifyConnection` can ping it (local `fetch` in browser adapter).
- **No IPC handler** for LM Studio chat/completion in `electron/main.ts`.
- `sendMessage` in `app-store.tsx` only calls `window.desktop.startOllamaChat` — LM Studio models can be selected but will never generate.

## 5. API Key Storage & Security

### Storage
API keys (`provider.apiKey`) are stored in **plain text in `localStorage`** under `antigravity_providers`. No encryption, no OS credential vault, no `electron-store` with encryption.

### `.env.example`
Contains placeholder `GEMINI_API_KEY="MY_GEMINI_API_KEY"`. `.gitignore` ignores `.env*` except `.env.example`. `dotenv` is installed but unused in source.

### Electron security (good)
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in `webPreferences`.
- Preload uses `contextBridge.exposeInMainWorld('desktop', ...)` — `ipcRenderer` is never exposed directly.
- IPC channels are allowlisted constants in both main and preload.
- `shell.openExternal` only for `http:`/`https:`; `will-navigate` restricts navigation; `setWindowOpenHandler` denies non-web windows.
- Single-instance lock prevents multiple app instances.

### Security concerns
1. **Plain-text API keys in localStorage** — accessible to any script running in the renderer; no at-rest encryption.
2. Terminal permission regex (`/rm |del |format |npm install|curl |wget /i`) is trivially bypassable (encoding, aliases, paths with spaces, `Invoke-WebRequest` instead of `curl`).
3. `startOllamaChat` validates `model` and `messages` presence but does not sanitize or bound message content/size before forwarding to Ollama.
4. `.env.example` pattern suggests API keys may be expected in env; no secure default mechanism documented.

## 6. Conversation Persistence & Memory Architecture

### Conversation persistence
- `localStorage` key `antigravity_conversations` — full conversation arrays (messages, model, providerId, timestamps).
- `currentConversationId` rehydrated from `localStorage` on init (picks first conversation).
- `antigravity_active_workspace` and `antigravity_recent_workspaces` also in `localStorage`.

### Memory architecture
- `TaskMemoryEntry` / `AppMemoryEntry` / `MemoryConfig` contracts defined in `desktop-bridge.ts`.
- `MemoryConfig.storageBackend` allows `'sqlite' | 'json_file'` — **Stage 1 implements neither; only `localStorage`** (`antigravity_task_memories`, `antigravity_app_memories`, `antigravity_memory_config`).
- `autoMemoryEnabled` toggle; `saveMemoryDefault` per conversation.
- MemoryModal UI supports task + app memory tabs, search/filter, enable toggle, delete, clear all.

### Gap
No SQLite, no file-based JSON persistence, no migration path from `localStorage` to a backend store.

## 7. Workspace & Filesystem Integration

### UI
`FileExplorerDrawer` renders a folder tree (`FileItem` recursive), shows workspace path breadcrumb, marks modified files via `pendingChanges`, allows "Select Folder."

### IPC / Contract
- `IFileSystemBridge`: `readDirectory`, `readFile`, `writeFile`, `selectFolderDialog`, `selectFileDialog`, `watchDirectory` — all typed but **not implemented in Electron main**.
- `desktop:selectWorkspace` IPC exists (native folder picker via `dialog.showOpenDialog` with `openDirectory | createDirectory`).
- `selectFile` / `selectedFile` state exists but no file-read action is wired to the chat context.
- `pendingChanges` / `FileChange` / `DiffReviewPanel` support approve/reject/approve-all with diff rendering (`computeLineDiff` LCS utility).

### Gap
No `readFile`/`writeFile`/`watchDirectory` IPC handlers. File tree stays empty until a native backend populates it. File modifications (`pendingChanges`) can be staged in UI but never actually written to disk.

## 8. Terminal Integration & Permissions

### UI
`TerminalPanel` — session tabs, PowerShell/CMD/Bash shell select, input form, Run/Stop, clear, expand, logs. "ConPTY Bridge (Stage 1 Preview)" label displayed.

### Permission gate
Commands matching `rm | del | format | npm install | curl | wget` trigger `PermissionModal` (Allow/Deny, "remember for session" checkbox). `resolvePermission` backs a Promise used by `executeTerminalCommand`.

### Backend
`ITerminalBridge` contract exists (`createSession`, `sendInput`, `killSession`, `onOutput`). Browser adapter returns a session that is never running and echoes fake output. **No Electron main-process terminal IPC handlers exist.** No `node:pty` / `conpty` dependency installed.

### Gap
Terminal is UI-only with simulated output. No real shell process, no PTY, no output streaming from a live process.

## 9. Electron Main Process, Preload & IPC Readiness

### `electron/main.ts`
- Window creation with `preload: preload.cjs`, security flags set correctly.
- `app.requestSingleInstanceLock()` + `second-instance` handler.
- Dev/prod load logic (Vite dev server on :3000, fallback to `dist/index.html`).
- IPC channels implemented: `GET_APP_INFO`, `SELECT_WORKSPACE`, `CHECK_OLLAMA`, `LIST_OLLAMA_MODELS`, `START_OLLAMA_CHAT`, `CANCEL_OLLAMA_CHAT`, `OLLAMA_STREAM` (outbound event).
- `activeChatAborts` map for per-request cancellation.

### `electron/preload.ts`
- Exposes `window.desktop` with all 7 methods matching `IDesktopAPI` interface.
- Global `Window.desktop` augmentation declared in `desktop-bridge.ts`.

### Gap
The `IDesktopBridge` contract defines `fs`, `terminal`, `memory`, `provider` sub-APIs, but **only Ollama methods are wired in main/preload**. `desktopBridge.fs`, `.terminal`, `.memory`, `.provider` calls in `app-store.tsx` go to the `BrowserPreviewBridgeAdapter` (localStorage stubs), not to Electron IPC. When running packaged, those operations would still hit the localStorage adapter, not native OS functions.

## 10. Build Errors & Missing Dependencies

### Potential issues
1. `typescript: ^7.0.2` — TypeScript's latest stable is 5.x; ^7.0.2 may not resolve or may be a typo. `tsc --noEmit` (`lint` script) could fail.
2. `@google/genai`, `express`, `dotenv` installed but unused — dead weight, but no build error unless tree-shaking flags them.
3. `preload.ts` is compiled to CJS (`dist-electron/preload.cjs`) and referenced in `main.ts` as `path.join(__dirname, 'preload.cjs')` — consistent.
4. `vite.config.ts` `server.hmr` is disabled when `DISABLE_HMR=true` — fine for AI Studio, dev HMR off by default if env set.
5. `tsconfig.json` `allowImportingTsExtensions: true` — source imports use `.ts` extensions (`./App.tsx`, `./stores/app-store`), consistent with Vite + esbuild.
6. `pnpm-workspace.yaml` lists `electron-winstaller` and `protobufjs` which are not in `package.json` dependencies — harmless but stale.
7. No test runner configured besides `tsx --test` for `diff.test.ts` (mentioned in README).

### Build output
Build output exists in `dist/` and `dist-electron/` (already built previously), and a packaged `release/win-unpacked/Antigravity AI Desktop.exe` exists — these are build outputs and were not inspected per scope.

## Summary: Existing vs Missing Functionality

| Area | Existing | Missing / Stubbed |
|------|----------|-------------------|
| UI / Layout | Complete (all components, modals, panels) | None (UI finalized, do not touch) |
| Ollama chat | Full streaming IPC in Electron main | None |
| LM Studio chat | Provider config UI only | No inference IPC handler |
| Cloud providers (Gemini/OpenAI/Anthropic/etc.) | Config + verify UI only | No inference implementation |
| `@google/genai` usage | Installed, unused | Not wired |
| Conversations | CRUD + localStorage persistence | No cloud sync/export beyond local modal |
| Memory | Task + App memory UI + localStorage | No SQLite / file backend despite contract |
| Workspace folder pick | Native dialog IPC | No `readFile`/`writeFile`/`watchDirectory` IPC |
| File tree / diff | UI + approve/reject logic | Changes never written to disk |
| Terminal | UI + permission modal + fake echo | No real PTY/ConPTY process |
| API keys | localStorage plaintext | No encryption |
| Electron IPC | Ollama only | fs, terminal, memory, provider bridges unwired |

## Security Problems

1. **Plaintext API keys in `localStorage`** (`antigravity_providers`) — no encryption or OS credential-store integration.
2. **Weak terminal command allowlist** — regex-based detection easily bypassed.
3. **No payload sanitization** on messages forwarded to Ollama (`startOllamaChat`).
4. **`.env.example`** advertises a real-looking API key placeholder pattern.

## Files Requiring Changes

| File | Why |
|------|-----|
| `electron/main.ts` | Add LM Studio + cloud provider chat IPC; add `fs`/`terminal`/`memory`/`provider` IPC handlers |
| `electron/preload.ts` | Expose new `desktopAPI` methods for added IPC channels |
| `shared/contracts/desktop-bridge.ts` | Extend contracts if new IPC shapes are needed (currently complete) |
| `src/desktop/browser-preview-bridge.ts` | Replace stubs with real implementations or delegate to Electron |
| `src/stores/app-store.tsx` | Extend `sendMessage` for non-Ollama providers; wire fs/terminal/memory to IPC |
| `.env.example` / docs | Add guidance on encrypted key storage |

## Recommended Implementation Order

1. **Encrypt API-key storage** — wrap `localStorage` provider persistence with encryption (e.g., `crypto.subtle` keyed to a user passphrase or OS credential vault) before shipping any keys.
2. **LM Studio inference** — add `desktop:startLmStudioChat` IPC (OpenAI-compatible `POST /v1/chat/completions` to `localhost:1234`) and route `sendMessage` to it when provider type is `lm_studio` or `openai_compatible`.
3. **Filesystem IPC** — implement `readFile`/`writeFile`/`readDirectory`/`watchDirectory` in Electron main using `node:fs`/`node:fs/promises`, expose via preload.
4. **Terminal PTY** — add `node-pty` or native ConPTY bindings, implement `createSession`/`sendInput`/`killSession`/`onOutput` IPC.
5. **SQLite persistence** — migrate conversations/memory from `localStorage` to SQLite (better contract fit: `storageBackend: 'sqlite'`).
6. **Cloud providers** — implement Gemini via `@google/genai` and OpenAI/Anthropic/OpenRouter chat completion routes.
7. **Wire file context into chat** — `readFile` for `@file` attachments, stream file edits into `pendingChanges`/diff panel.

## Stage 3A Implementation Results

### Modified files
- `src/stores/app-store.tsx` — Added provider-type guard (`selectedProvider?.type === 'ollama'`) to the Ollama inference condition in `sendMessage()`. Added else-if branch for non-Ollama providers that displays a clear error message instead of silently failing.

### Dependencies
- All 450 packages installed via `pnpm install` (from existing `pnpm-lock.yaml`)
- No new dependencies added — Ollama integration uses built-in `fetch` in Electron main process

### Ollama connection result
- **Ollama v0.40.13** is installed and running at `http://127.0.0.1:11434`
- Model **`qwen2.5-coder:7b`** is installed (~4.7 GB)
- `GET /api/tags` returns 200 OK with model list
- `POST /api/chat` (non-streaming) test: prompt "Say hello in exactly 5 words." → response "Hello, world!" (5 words, ~5.3s generation)

### Chat test result
- Direct Ollama API chat inference confirmed working with `qwen2.5-coder:7b`
- Streaming NDJSON chunk parsing implemented in `electron/main.ts` `START_OLLAMA_CHAT` handler
- Request cancellation via `AbortController` implemented
- Incremental message display via `onOllamaStream` callback implemented

### Build results
- `npx tsc --noEmit` — **PASS** (no TypeScript errors)
- `pnpm run build` (Vite) — **PASS** (`dist/` output generated)
- `pnpm run build:electron` (esbuild) — **PASS** (`dist-electron/main.js` and `dist-electron/preload.cjs` regenerated)

### Remaining issues
- LM Studio and cloud providers (Gemini, OpenAI, Anthropic, OpenRouter) are configurable but produce no inference output — no IPC handlers for them
- API keys stored in plaintext `localStorage` (`antigravity_providers`) — no encryption
- Terminal is UI-only with simulated output — no real PTY/ConPTY process
- No SQLite persistence — conversations/memory stored in `localStorage` only
- Filesystem `readFile`/`writeFile`/`watchDirectory` IPC handlers not implemented

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 11/2/2026 | Initial technical audit report created | Cline (AI coding agent) |
| 11/2/2026 | Stage 3A: Ollama + Local Model Integration implemented — added provider-type guard in app-store.tsx sendMessage() to only route inference to Ollama IPC, added else-if branch for non-Ollama providers with clear error message | Cline (AI coding agent) |
| 11/2/2026 | Application started successfully — Vite dev server on port 3000, Electron window launched, Ollama integration active | Cline (AI coding agent) |
| 11/2/2026 | Fixed "Verify Connection" button doing nothing — added try/catch to handleVerify() in ProviderModal.tsx so errors surface as verifyResult instead of being silently swallowed; wrapped window.desktop.listOllamaModels() in try/catch in browser-preview-bridge.ts to prevent unhandled IPC failures | Cline (AI coding agent) |
| 11/2/2026 | Fixed missing app logo — updated all 5 references from /assets/aistudio/app_logo_2fbc7f46.svg (nonexistent) to /assets/app_logo.svg in index.html favicon, ChatMessageList.tsx, SettingsModal.tsx, Sidebar.tsx, AppLayout.tsx; added Electron window icon via BrowserWindow icon property pointing to public/assets/app_logo.svg | Cline (AI coding agent) |
| 11/2/2026 | Stage 3B: Multi-Provider Chat Inference — implemented unified provider adapter architecture in Electron main.ts with real inference for Ollama, Google Gemini (REST API), OpenAI, OpenAI-compatible/LM Studio/Custom Local, Anthropic (REST API), and OpenRouter; added encrypted API key storage via AES-256-CBC; replaced Ollama-only restriction in app-store.tsx with unified provider routing via startProviderChat IPC; updated preload.ts with verifyProvider/startProviderChat/cancelProviderChat/onProviderStream methods; added MODEL_IPC_CHANNELS allowlist and IModelProviderAdapter contract in desktop-bridge.ts | Cline (AI coding agent) |