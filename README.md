# Antigravity AI Desktop — Stage 1 Frontend & Desktop Architecture

A local-first Windows AI desktop application inspired by Google Antigravity.

This repository represents **Stage 1** of a four-stage development workflow:
1. **Stage 1 (Current)**: React/TypeScript UI, application state, and Desktop Bridge contracts.
2. **Stage 2**: Export to Antigravity or VS Code — Electron integration and native Windows functionality.
3. **Stage 3**: Implement real model providers, SQLite memory, filesystem operations, and ConPTY terminal access.
4. **Stage 4**: Package and test the Windows installer (`.exe`) and portable application.

---

## Architecture & Project Structure

```
├── shared/
│   └── contracts/
│       └── desktop-bridge.ts       # Central typed interface for Electron IPC & preview adapters
├── src/
│   ├── components/
│   │   ├── chat/                  # Antigravity prompt box, model selector, message timeline
│   │   ├── sidebar/               # Navigation, history, scheduled tasks, projects tree
│   │   ├── workspace/             # Project folder picker, file explorer tree
│   │   ├── terminal/              # Integrated terminal with tabs, shells (PowerShell, CMD, Bash)
│   │   ├── diff/                  # Side-by-side & unified diff viewer with Accept/Reject
│   │   ├── memory/                # Dual-memory manager (Task memory + SQLite App memory)
│   │   ├── providers/             # 8 AI provider configs (Ollama, LM Studio, Gemini, etc.)
│   │   ├── dialogs/               # Permission approvals, chat export (MD, JSON, HTML)
│   │   ├── settings/              # Application settings & security policies
│   │   └── onboarding/            # First-launch welcome wizard
│   ├── desktop/
│   │   └── browser-preview-bridge.ts # Stage 1 browser adapter implementing IDesktopBridge
│   ├── layouts/
│   │   └── AppLayout.tsx          # Main desktop window layout & dockable panels
│   ├── stores/
│   │   └── app-store.tsx          # Centralized React state store
│   ├── types/                     # Application TypeScript definitions
│   └── utils/
│       ├── diff.ts                # Myers line diff calculation & memory filtering
│       └── diff.test.ts           # Unit tests
```

---

## Desktop Bridge Contract (`IDesktopBridge`)

The application decouples the React frontend from the operating system via `shared/contracts/desktop-bridge.ts`:

- `fs`: Safe filesystem operations, directory traversal, file read/write, native folder dialogs.
- `terminal`: ConPTY pseudo-console sessions, output streaming, command submission, process kill.
- `memory`: Local SQLite and flat-file persistent storage for global and task memory.
- `provider`: Model discovery, API key management, and connection verification.
- `system`: Windows platform detection, architecture, and application versioning.

In Stage 1, `BrowserPreviewBridgeAdapter` implements this contract with simulated workspace data, mock terminal responses, and `localStorage` persistence. In Stage 2, Electron's `contextBridge` replaces this adapter without modifying UI components.

---

## Running and Verifying

- **Dev Server**: `npm run dev`
- **Lint**: `npm run lint`
- **Unit Tests**: `npx tsx --test src/utils/diff.test.ts`
- **Build**: `npm run build`
