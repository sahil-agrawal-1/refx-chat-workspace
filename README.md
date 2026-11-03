# REFX AI Workspace

Local-first Windows AI desktop application for chat with local and cloud model providers (Ollama, LM Studio, Google Gemini, Anthropic, OpenAI, OpenRouter, and OpenAI-compatible endpoints).

## Project Status

The chat layer (conversation management, message streaming, provider integration, error handling, and generation state) has been repaired and tested. See **Chat-State Repair** below.

## Features

- **Multi-provider chat**: Ollama, LM Studio, Google Gemini, Anthropic, OpenAI, OpenRouter, OpenAI-compatible, and Custom Local endpoints.
- **Conversations**: Create, select, and delete conversations with persistent history (localStorage).
- **Streaming inference**: Real-time streaming responses via Electron desktop bridge (`desktop:startProviderChat` / `desktop:providerStream`).
- **Model selection**: Connected provider models shown in a dropdown selector.
- **Workspace & file explorer**: Select a project workspace folder and browse files.
- **Terminal panel**: Integrated terminal session (PowerShell/CMD/Bash) with output streaming.
- **Diff review**: Side-by-side file modification review with Accept/Reject actions.
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

## Desktop Bridge Contract (`IDesktopBridge`)

The frontend is decoupled from the OS via `shared/contracts/desktop-bridge.ts`:
- `fs` — filesystem operations and native folder dialogs
- `terminal` — pseudo-console sessions, output streaming, command submission
- `memory` — SQLite / flat-file persistent task & app memory
- `provider` — model discovery, API key management, connection verification
- `system` — Windows platform detection, architecture, app versioning

`BrowserPreviewBridgeAdapter` implements this contract in Stage 1 (browser preview). Electron's `contextBridge` replaces it in Stage 2 without modifying UI components.

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
pnpm tsx src/stores/app-store.test.tsx
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
| `pnpm build:all` | Web build + Electron build |
| `pnpm lint` | TypeScript type check (`tsc --noEmit`) |
| `pnpm electron:dev` | Dev server + Electron |
| `pnpm electron:start` | Production Electron |
| `pnpm electron:build` | Package Windows installer & portable |

## App Name & Icon

- **Product name**: `Refx workspace` (configured in `package.json` → `build.productName`)
- **Window icon & app logo**: `public/assets/app_logo.svg`, rendered inline via `src/components/ui/Logo.tsx` (no external image loading).
- **Windows app icon**: `build/icon.ico` (multi-size: 16, 32, 48, 256), generated from the logo SVG and wired into electron-builder (`win.icon`).

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Electron 45 (main + preload with contextBridge)
- pnpm (package manager)

## License

MIT
