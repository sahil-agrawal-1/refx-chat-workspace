# P5-A Electron Runtime Smoke Test (Manual)

Purpose: verify real Electron Main Process filesystem IPC (not mocked handlers).

## Prerequisites
- `pnpm install`
- `pnpm build:all`
- A dedicated temporary test folder, e.g. `C:\Temp\refx-p5a-smoke` (never the project root).

## Steps
1. Launch: `pnpm electron:dev`
2. Open the app; select the temp test folder via the folder picker.
3. Verify the file explorer shows the temp folder's real contents.
4. Create a nested folder and a text file inside the temp folder (via OS). Click refresh; verify new entries appear.
5. Click a text file; verify its real contents load in the viewer.
6. Select a large (>1 MB) file; verify "File is too large" error.
7. Select a binary file; verify "Binary files are not supported" error.
8. Search filenames for a known name; verify results.
9. Search file contents for a known string; verify results with line numbers.
10. Verify excluded entries (node_modules, .git, .env, *.pem) do NOT appear.
11. Attempt path traversal via devtools/console `window.desktop.fs.readFile('..\\..\\Windows\\System32\\drivers\\etc\\hosts')`; verify rejection.
12. Attempt absolute external path read; verify rejection.
13. Create a junction inside the workspace pointing outside; verify it is skipped/blocked.
14. Restart the app; verify the workspace is restored and file tree loads.
15. Close app; clean up temp folder.

## Status
NOT EXECUTED in this audit (no automated Electron harness). To be run manually before release.