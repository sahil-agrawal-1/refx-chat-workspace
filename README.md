# REFX AI Workspace

Local-first Windows AI desktop application for chat with local and cloud model providers (Ollama, LM Studio, Google Gemini, Anthropic, OpenAI, OpenRouter, and OpenAI-compatible endpoints).

## Project Status

P1–P3: chat-state repair, security hardening, and provider verification are complete and tested.

P4: Local SQLite persistence (better-sqlite3) with migrations, conversation/message storage, settings, legacy localStorage migration, backups, and recovery.

P5-A: Real read-only workspace filesystem integration (secure path validation, nested explorer, search).

P5-B: Real file modification engine (create/edit/rename/move/delete with approval, backups, undo/restore).

P6: Workspace tool integration for AI chat (read and propose file changes via tool loop).

See **Chat-State Repair (P1)**, **Security Hardening (P2)**, and **Provider Verification (P3)** below.

## Features

- **Multi-provider chat**: Ollama, LM Studio, Google Gemini, Anthropic, OpenAI, OpenRouter, OpenAI-compatible, and Custom Local endpoints.
- **Conversations**: Create, select, and delete conversations with persistent history (localStorage).
- **Streaming inference**: Real-time streaming responses via Electron desktop bridge (`desktop:startProviderChat` / `desktop:providerStream`).
- **Model selection**: Connected provider models shown in a dropdown selector with real discovery and status indicators.
- **Workspace & file explorer**: Select a project workspace folder and browse files.
- **Terminal panel**: Integrated terminal session (PowerShell/CMD/Bash) with output streaming.
- **Diff review**: Side-by-side file modification review with Accept/Reject actions.
- **File modification engine**: Secure create/edit/rename/move/delete with approval, backups, and restore.
- **AI workspace tools**: Model can list/read/search/propose changes to project files.
- **Memory system**: Task and application memory with configurable storage backend.
- **Providers modal**: Configure, verify, and connect AI model providers.
- **Onboarding wizard**: First-launch setup flow.

## Project Structure

```
├── electron/
│   ├── main.ts              # Electron main process & IPC handlers
│   └── preload.ts           # ContextBridge API exposed to renderer
├── shared/
│   └── contracts/
│       └── desktop-bridge.ts   # Typed IPC contracts (IDesktopBridge, IModelProviderAdapter)
├── src/
│   ├── App.tsx              # Root app component
│   ├── components/
│   │   ├── chat/            # ChatMessageList, ChatPromptInput, ModelSelectorDropdown
│   │   ├── ui/              # Logo (inline SVG component)
│   │   ├── sidebar/         # Navigation, history, workspace, providers
│   │   ├── workspace/       # File explorer drawer
│   │   ├── terminal/        # Terminal panel
│   │   ├── diff/            # Diff review panel
│   │   ├── memory/          # Memory manager modal
│   │   ├── providers/       # Provider configuration modal
│   │   ├── settings/        # Settings modal
│   │   ├── dialogs/         # Export, permission, onboarding modals
│   │   └── common/          # Modal, Toggle primitives
│   ├── desktop/
│   │   └── browser-preview-bridge.ts  # Stage 1 browser adapter (IDesktopBridge)
│   ├── layouts/
│   │   └── AppLayout.tsx    # Main window layout & dockable panels
│   ├── stores/
│   │   ├── app-store.tsx    # Centralized React state store (chat, providers, memory, terminal)
│   │   ├── app-store.test.tsx   # Chat store behavior tests
│   │   ├── security.test.ts   # Security behavior tests
│   │   ├── provider-verification.test.ts  # Provider verification tests
│   │   └── test-shim.ts     # DOM shims for Node.js test environment
│   ├── types/               # TypeScript type definitions
│   └── utils/
│       ├── diff.ts          # Myers line diff & memory filtering
│       └── diff.test.ts     # Diff unit tests
├── public/
│   └── assets/
│       └── app_logo.svg     # REFX logo (inline SVG source)
├── build/
│   └── icon.ico             # Generated multi-size Windows app icon
├── security.md              # Security documentation
├── electron-builder config  # in package.json "build" field
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Chat-State Repair (P1)

The `src/stores/app-store.tsx` chat flow was fixed across five categories:

1. **Conversation creation** — Sending a message with no active conversation creates a new conversation; user messages are never silently dropped.
2. **Stale history** — The provider receives the latest conversation state plus the current user message, correctly ordered with no duplicates.
3. **Generation state** — `isGenerating` always resets after success, stream errors, IPC start failures, thrown exceptions, early returns (no-connected-provider), and stop.
4. **Error handling** — Provider-accurate error labels (e.g. `**Ollama Error:**`, `**Google Gemini Error:**`) instead of hardcoded "Ollama Error"; no fake AI responses are generated.
5. **Stop generation** — Cancels the provider stream, unsubscribes, clears refs, and resets `isGenerating` consistently; stop-and-retry works.

### Tests (`src/stores/app-store.test.tsx`)

8 behavioral tests cover:
- New conversation creation with no existing conversation
- Appending to an existing conversation
- Multiple consecutive messages with correct ordered history
- New conversation isolation from other conversations
- No-connected-provider honest notice, `isGenerating` reset, no fake response
- Provider-accurate error labels (Ollama vs Google Gemini)
- Thrown provider error resets `isGenerating`
- Stop generation cancels and resets; stop-and-retry works

## Security Hardening (P2)

API key storage has been completely rearchitected:

- **Electron `safeStorage` (Windows DPAPI)** replaces the hardcoded AES-256-CBC encryption key — credentials are encrypted at rest in `app userData/provider-credentials.json`.
- **API keys never cross IPC to the renderer** — `saveCredential` is send-only; `getCredentialForProvider()` is main-process-internal only.
- **Credential saved before metadata** — the encrypted API key is persisted to `provider-credentials.json` via Electron `safeStorage` BEFORE provider metadata is written to localStorage. If credential encryption or disk write fails, provider metadata is not saved, preventing a restart from leaving a provider configured with no key.
- **Write errors propagate** — `saveCredentialStore` throws if the credential file cannot be written; errors are surfaced to the user instead of being silently swallowed.
- **Migration path** — existing plaintext keys in localStorage are detected, encrypted via `safeStorage`, confirmed stored, then removed from localStorage. Never silently discarded.
- **Fail securely** — if `safeStorage.isEncryptionAvailable()` returns false, credentials are not saved; no plaintext fallback.
- **XSS prevention in chat exports** — `escapeHtml()` sanitizes all user-controlled content (title, model, role, message content); `isSafeUrl()` validates URLs (`javascript:`, `data:`, `file:` rejected).

### Security Tests (`src/stores/security.test.ts`)

22 tests cover:
- HTML escaping (`&`, `<`, `>`, quotes, `/`, script tags, event handlers, SVG XSS)
- URL scheme validation (https/http accepted; javascript/data/file rejected)
- Credential encryption/decryption round-trip
- Fail-secure behavior when encryption is unavailable
- Credential migration flow

## Provider Verification (P3)

Real API verification and model discovery implemented for all 8 providers:

| Provider | Endpoint | Auth Method |
|----------|----------|-------------|
| Ollama | `GET /api/tags` | None (local) |
| Google Gemini | `GET /v1beta/models` | `x-goog-api-key` header |
| OpenAI | `GET /v1/models` | `Bearer` header |
| Anthropic | `GET /v1/models` | `x-api-key` + `anthropic-version` headers |
| OpenRouter | `GET /api/v1/key` + `GET /api/v1/models` | `Bearer` header |
| LM Studio | `GET /v1/models` | None (local) |
| OpenAI-compatible | `GET /v1/models` | `Bearer` header (optional) |
| Custom local | `GET /v1/models` | `Bearer` header (optional) |

### Connection status states (9 distinct states)
`not-configured`, `connecting`, `connected`, `auth-failed`, `rate-limited`, `provider-unavailable`, `model-unavailable`, `model-discovery-unsupported`, `auth-verified-model-untested`

A successful authentication check does **not** imply every model supports inference — model discovery is separate from model capability testing.

### Provider Verification Tests (`src/stores/provider-verification.test.ts`)

18 tests cover all providers with valid credentials, invalid credentials, missing credentials, unavailable endpoints, rate limits, model discovery, manual model selection, provider switching, and secure credential retrieval.

### Model Validation & Error Messages

- **Model validation before API call** — `sendMessage()` validates that the selected model exists in the provider's discovered model list for cloud providers (Gemini, OpenAI, Anthropic, OpenRouter, OpenAI-compatible, Custom Local) before making an API call. Local providers (Ollama, LM Studio) may allow manually entered models.
- **Specific 404 handling** — Gemini API returns a model-specific 404 message naming the missing model and directing the user to verify the provider and select from the discovered list.
- **Specific 503 handling** — OpenRouter returns a "temporarily unavailable" message with retry guidance when the provider returns HTTP 503.

## Desktop Bridge Contract (`IDesktopBridge`)

The frontend is decoupled from the OS via `shared/contracts/desktop-bridge.ts`:
- `fs` — filesystem operations and native folder dialogs
- `terminal` — pseudo-console sessions, output streaming, command submission
- `memory` — SQLite / flat-file persistent task & app memory
- `provider` — model discovery, API key management, connection verification
- `system` — Windows platform detection, architecture, app versioning

`BrowserPreviewBridgeAdapter` implements this contract in Stage 1 (browser preview). Electron's `contextBridge` replaces it in Stage 2 without modifying UI components. Cloud provider verification requires the Electron runtime (secure credential storage).

## Running and Verifying

Prerequisites: [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
# Install dependencies
pnpm install

# Start Vite dev server (port 3000)
pnpm dev

# Lint (TypeScript type check)
pnpm lint

# Run unit tests (Node.js via tsx)
pnpm test

# Or run individual suites:
pnpm tsx src/stores/app-store.test.tsx
pnpm tsx src/stores/security.test.ts
pnpm tsx src/stores/provider-verification.test.ts
pnpm tsx src/utils/diff.test.ts

# Production web build
pnpm build

# Build Electron main + preload
pnpm build:electron

# Package for Windows (NSIS installer + portable)
pnpm electron:build
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Vite production web build |
| `pnpm build:electron` | Bundle Electron main & preload |
| `pnpm build:icon` | Generate Windows app icon (16/32/48/256) |
| `pnpm build:all` | Web build + Electron build + icon |
| `pnpm test` | Run every tracked test file |
| `pnpm lint` | TypeScript type check (`tsc --noEmit`) |
| `pnpm electron:dev` | Dev server + Electron |
| `pnpm electron:start` | Production Electron |
| `pnpm electron:build` | Package Windows installer & portable |

## Security Pipeline

- **GitHub Actions** (`.github/workflows/security.yml`) — runs lint, builds, icon generation, all tracked tests, and security-specific scans on every push/PR.
- A separate `clean-checkout-package` job fresh-installs dependencies and produces Windows installers/portable artifacts to catch missing release assets.
- **Pre-commit hook** (`.git/hooks/pre-commit`) — rejects commits locally if any check fails (lint, builds, tests).
- See `security.md` for full security documentation.

## App Name & Icon

- **Product name**: `Refx workspace` (configured in `package.json` → `build.productName`)
- **Window icon & app logo**: `public/assets/app_logo.svg`, rendered inline via `src/components/ui/Logo.tsx` (no external image loading).
- **Windows app icon**: generated by `pnpm build:icon` from `public/assets/app_logo.svg` via `tools/gen-icon.cjs` and written to `build/icon.ico` (multi-size: 16, 32, 48, 256), then wired into electron-builder (`win.icon`). Generation is part of `pnpm build:all` and `pnpm electron:build`; the generated icon is intentionally not required to be committed.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Electron 45 (main + preload with contextBridge)
- pnpm (package manager)

## License

MIT

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 11/2/2026 | Initial technical audit report created | Refx (AI coding agent) |
| 11/2/2026 | Stage 3A: Ollama + Local Model Integration | Refx (AI coding agent) |
| 11/2/2026 | Stage 3B: Multi-Provider Chat Inference | Refx (AI coding agent) |
| 11/3/2026 | P1: Chat-state repair (conversation creation, stale history, generation state, error handling, stop generation) | Refx (AI coding agent) |
| 11/3/2026 | P2: Security hardening (safeStorage DPAPI, XSS prevention, credential migration, audit pipeline) | Refx (AI coding agent) |
| 11/3/2026 | P3: Real provider verification (all 8 providers, 9 connection states, browser preview fixes) | Refx (AI coding agent) |
| 11/3/2026 | Documentation update (README, report.md, security.md) | Refx (AI coding agent) |
| 11/3/2026 | Bug fixes: API key cross-provider leak, credential persistence across restarts, model validation, improved Gemini 404 / OpenRouter 503 error messages | Refx (AI coding agent) |
| 11/4/2026 | P4: SQLite database & persistent storage | Refx (AI coding agent) |
| 11/4/2026 | P5-A: Real workspace filesystem integration (read-only) | Refx (AI coding agent) |
| 11/4/2026 | P5-B: Real file modification engine (approval, backups, undo) | Refx (AI coding agent) |
| 11/4/2026 | P6: Workspace tool integration for AI chat | Refx (AI coding agent) |
| 11/4/2026 | Phase 1-3: Gemini/Anthropic resilience, chat history sanitization, provider parity | Refx (AI coding agent) |
| 11/4/2026 | Phase 4: Diff IDs, SQLite memory store, file viewer | Refx (AI coding agent) |
| 11/4/2026 | Phase 5-7: Tool argument fix, OpenRouter tools, Gemini/Anthropic tools, directory listing, system prompt, feedback | Refx (AI coding agent) |
| 11/4/2026 | Security CI scanner hardening | Refx (AI coding agent) |
| 11/4/2026 | Splash screen with fade transition | Refx (AI coding agent) |
| 11/4/2026 | Terminal xterm.js integration and header refactor | Refx (AI coding agent) |
| 11/4/2026 | Slash commands, attach files, and auto-scroll | Refx (AI coding agent) |
| 11/4/2026 | Phases 1-3: Gemini resilience, chat history sanitization, provider parity | Refx (AI coding agent) |
| 11/4/2026 | Phase 4: Diff IDs, SQLite memory, file viewer, CI scanner | Refx (AI coding agent) |
| 11/4/2026 | P5-P6: Tool calling, path fixes, feedback, P6-A/P6-B terminal, effort/approval controls | Refx (AI coding agent) |