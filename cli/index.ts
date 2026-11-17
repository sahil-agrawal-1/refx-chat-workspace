#!/usr/bin/env node
/**
 * Refx CLI
 *
 * A terminal companion to the Refx desktop app. It reuses the same workspace
 * containment and authorization rules as the Electron main process, so files
 * are only ever touched inside an explicitly authorized workspace root.
 *
 * Usage:
 *   refx workspace [path]            authorize + activate a workspace
 *   refx ls [dir]                   list a directory
 *   refx read <file>                print a file
 *   refx search <query>             search file names and text
 *   refx create <file> [--content]  create a file
 *   refx edit <file> [--content]    modify a file
 *   refx delete <file>              delete a file
 *   refx rename <src> <dst>         rename/move a file
 *   refx chat                       interactive agent (Ollama by default)
 *   refx help                       show this help
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { WorkspaceAuthorizationStore } from '../shared/utils/workspace-authorization';
import { WorkspaceGuard } from '../shared/utils/workspace-guard';

const args = process.argv.slice(2);

function userDataDir(): string {
  if (process.env.REFX_USER_DATA) return process.env.REFX_USER_DATA;
  if (process.platform === 'win32') return path.join(os.homedir(), 'AppData', 'Roaming', 'refx');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'refx');
  return path.join(os.homedir(), '.config', 'refx');
}

function guardFromArgs(argv: string[]): { guard: WorkspaceGuard; rest: string[] } {
  let workspace: string | undefined;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--workspace' || a === '-w') {
      workspace = argv[++i];
    } else if (a.startsWith('--workspace=')) {
      workspace = a.slice('--workspace='.length);
    } else {
      rest.push(a);
    }
  }
  if (!workspace && process.env.REFX_WORKSPACE) workspace = process.env.REFX_WORKSPACE;

  const store = new WorkspaceAuthorizationStore(path.join(userDataDir(), 'authorized-workspaces.json'));
  const guard = new WorkspaceGuard(store);
  if (workspace) {
    const canonical = guard.authorizeAndActivate(workspace);
    if (!canonical) {
      console.error(`Workspace not authorized: ${workspace}`);
      process.exit(1);
    }
  } else {
    // Reuse a previously authorized root when one exists.
    const roots = store.list();
    if (roots.length > 0) guard.activate(roots[roots.length - 1]);
  }
  return { guard, rest };
}

function requireGuard(guard: WorkspaceGuard): string {
  try {
    return guard.requireRoot();
  } catch {
    console.error('No authorized workspace. Run: refx workspace <path>');
    process.exit(1);
    return '';
  }
}

function readFlag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function cmdWorkspace(argv: string[]): Promise<void> {
  const { guard } = guardFromArgs(argv);
  const target = argv.find((a) => !a.startsWith('-'));
  if (target) {
    const canonical = guard.authorizeAndActivate(target);
    if (!canonical) {
      console.error(`Not a directory: ${target}`);
      process.exit(1);
    }
    console.log(`Authorized workspace: ${canonical}`);
  } else {
    const root = guard.getActiveRoot();
    if (!root) {
      console.log('No active workspace. Usage: refx workspace <path>');
    } else {
      console.log(`Active workspace: ${root}`);
      const roots = new WorkspaceAuthorizationStore(path.join(userDataDir(), 'authorized-workspaces.json')).list();
      if (roots.length > 1) {
        console.log('Authorized roots:');
        for (const r of roots) console.log(`  ${r}`);
      }
    }
  }
}

async function cmdLs(argv: string[]): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  const root = requireGuard(guard);
  const dirArg = rest[0] || root;
  const resolved = guard.resolve(dirArg, false);
  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(resolved, e.name);
    try {
      if (!guard.isWithin(full)) continue;
    } catch {
      continue;
    }
    console.log(`${e.isDirectory() ? 'd' : 'f'}  ${e.name}`);
  }
}

async function cmdRead(argv: string[]): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  requireGuard(guard);
  const file = rest[0];
  if (!file) { console.error('Usage: refx read <file>'); process.exit(1); }
  const resolved = guard.resolve(file, false);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) { console.error('Cannot read a directory.'); process.exit(1); }
  if (stat.size > 1024 * 1024) { console.error('File too large.'); process.exit(1); }
  const buf = fs.readFileSync(resolved);
  if (buf.includes(0)) { console.error('Binary files are not supported.'); process.exit(1); }
  process.stdout.write(buf.toString('utf8'));
  if (!buf.toString('utf8').endsWith('\n')) process.stdout.write('\n');
}

async function cmdSearch(argv: string[]): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  const root = requireGuard(guard);
  const query = rest.join(' ').trim().toLowerCase();
  if (!query) { console.error('Usage: refx search <query>'); process.exit(1); }
  const filesMode = hasFlag(argv, '--files');
  const textMode = hasFlag(argv, '--text') || !filesMode;
  const results: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 8 || results.length >= 200) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (!guard.isWithin(full)) continue;
      const rel = path.relative(root, full);
      // skip common excluded dirs
      if (/(^|[\\/])(node_modules|\.git|dist|build)([\\/]|$)/.test(rel)) continue;
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (filesMode && e.name.toLowerCase().includes(query)) {
        results.push(full);
        if (results.length >= 200) return;
      }
      if (textMode) {
        try {
          const st = fs.statSync(full);
          if (st.size > 1024 * 1024) return;
          const buf = fs.readFileSync(full);
          if (buf.includes(0)) return;
          const content = buf.toString('utf8');
          const lines = content.split(/\r?\n/);
          lines.forEach((line, idx) => {
            if (results.length >= 200) return;
            if (line.toLowerCase().includes(query)) {
              results.push(`${full}:${idx + 1}: ${line.trim().slice(0, 200)}`);
            }
          });
        } catch { /* skip */ }
      }
    }
  };
  walk(root, 0);
  for (const r of results) console.log(r);
  if (results.length === 0) console.log('No matches.');
}

async function cmdCreate(argv: string[]): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  requireGuard(guard);
  const file = rest[0];
  if (!file) { console.error('Usage: refx create <file> [--content <text>]'); process.exit(1); }
  const resolved = guard.resolve(file, true);
  if (fs.existsSync(resolved)) { console.error('File already exists. Use `refx edit`.'); process.exit(1); }
  let content = readFlag(argv, '--content');
  if (content === undefined && hasFlag(argv, '--stdin')) content = await readStdin();
  if (content === undefined) content = '';
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, 'utf8');
  console.log(`Created: ${resolved}`);
}

async function cmdEdit(argv: string[]): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  requireGuard(guard);
  const file = rest[0];
  if (!file) { console.error('Usage: refx edit <file> [--content <text>]'); process.exit(1); }
  const resolved = guard.resolve(file, true);
  let content = readFlag(argv, '--content');
  if (content === undefined && hasFlag(argv, '--stdin')) content = await readStdin();
  if (content === undefined) {
    if (!fs.existsSync(resolved)) { console.error('File does not exist. Use `refx create`.'); process.exit(1); }
    // Open in $EDITOR
    const editor = process.env.EDITOR || process.env.VISUAL;
    if (!editor) { console.error('Set --content or $EDITOR.'); process.exit(1); }
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(editor, [resolved], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
    console.log(`Edited: ${resolved}`);
    return;
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, 'utf8');
  console.log(`Wrote: ${resolved}`);
}

async function cmdDelete(argv: string[]): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  requireGuard(guard);
  const file = rest[0];
  if (!file) { console.error('Usage: refx delete <file>'); process.exit(1); }
  const resolved = guard.resolve(file, false);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) { console.error('Refusing to delete a directory.'); process.exit(1); }
  if (!hasFlag(argv, '--yes')) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ok = await new Promise<boolean>((resolve) => rl.question(`Delete ${resolved}? [y/N] `, (a) => { rl.close(); resolve(/^y(es)?$/i.test(a.trim())); }));
    if (!ok) { console.log('Cancelled.'); return; }
  }
  fs.unlinkSync(resolved);
  console.log(`Deleted: ${resolved}`);
}

async function cmdRename(argv: string[], move = false): Promise<void> {
  const { guard, rest } = guardFromArgs(argv);
  requireGuard(guard);
  const src = rest[0];
  const dst = rest[1];
  if (!src || !dst) { console.error(`Usage: refx ${move ? 'move' : 'rename'} <src> <dst>`); process.exit(1); }
  const r1 = guard.resolve(src, false);
  const r2 = guard.resolve(dst, true);
  if (fs.existsSync(r2)) { console.error('Target already exists.'); process.exit(1); }
  fs.renameSync(r1, r2);
  console.log(`${move ? 'Moved' : 'Renamed'}: ${r1} -> ${r2}`);
}

async function cmdChat(argv: string[]): Promise<void> {
  const { guard } = guardFromArgs(argv);
  const root = guard.getActiveRoot();
  const provider = (process.env.REFX_PROVIDER || 'ollama').toLowerCase();
  const baseUrl = process.env.REFX_BASE_URL || (provider === 'ollama' ? 'http://127.0.0.1:11434' : '');
  const model = process.env.REFX_MODEL || (provider === 'ollama' ? 'llama3.1' : '');
  const apiKey = process.env.REFX_API_KEY || '';

  if (!model) {
    console.error('Set REFX_MODEL (and REFX_PROVIDER/REFX_BASE_URL/REFX_API_KEY).');
    process.exit(1);
  }

  const tools = [
    { type: 'function', function: { name: 'list_directory', description: 'List files/folders in a workspace directory.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: [] } } },
    { type: 'function', function: { name: 'read_file', description: 'Read a file.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
    { type: 'function', function: { name: 'search_files', description: 'Search file names.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'search_text', description: 'Search file contents.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'create_file', description: 'Create a file.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path'] } } },
    { type: 'function', function: { name: 'edit_file', description: 'Overwrite a file.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
    { type: 'function', function: { name: 'delete_file', description: 'Delete a file.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
    { type: 'function', function: { name: 'rename_file', description: 'Rename/move a file.', parameters: { type: 'object', properties: { path: { type: 'string' }, newPath: { type: 'string' } }, required: ['path', 'newPath'] } } },
  ];

  async function runTool(name: string, args: any): Promise<string> {
    try {
      switch (name) {
        case 'list_directory': {
          const dir = guard.resolve(args?.path || root || '.');
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          return JSON.stringify(entries.map((e) => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file' })));
        }
        case 'read_file': {
          const resolved = guard.resolve(args.path, false);
          const stat = fs.statSync(resolved);
          if (stat.size > 1024 * 1024) return JSON.stringify({ error: 'File too large.' });
          const buf = fs.readFileSync(resolved);
          if (buf.includes(0)) return JSON.stringify({ error: 'Binary file not supported.' });
          return buf.toString('utf8').slice(0, 20000);
        }
        case 'search_files': {
          const q = String(args.query || '').toLowerCase();
          const results: string[] = [];
          const walk = (dir: string, depth: number) => {
            if (depth > 6 || results.length >= 50) return;
            let entries: fs.Dirent[];
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
            for (const e of entries) {
              const full = path.join(dir, e.name);
              if (!guard.isWithin(full)) continue;
              if (e.isDirectory()) walk(full, depth + 1);
              else if (e.name.toLowerCase().includes(q)) { results.push(full); if (results.length >= 50) return; }
            }
          };
          walk(root || '.', 0);
          return JSON.stringify(results);
        }
        case 'search_text': {
          const q = String(args.query || '').toLowerCase();
          const results: Array<{ path: string; line: number; preview: string }> = [];
          const walk = (dir: string, depth: number) => {
            if (depth > 6 || results.length >= 100) return;
            let entries: fs.Dirent[];
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
            for (const e of entries) {
              const full = path.join(dir, e.name);
              if (!guard.isWithin(full)) continue;
              if (e.isDirectory()) { walk(full, depth + 1); continue; }
              try {
                const st = fs.statSync(full);
                if (st.size > 1024 * 1024) continue;
                const buf = fs.readFileSync(full);
                if (buf.includes(0)) continue;
                const lines = buf.toString('utf8').split(/\r?\n/);
                lines.forEach((line, idx) => {
                  if (results.length >= 100) return;
                  if (line.toLowerCase().includes(q)) results.push({ path: full, line: idx + 1, preview: line.trim().slice(0, 200) });
                });
              } catch { /* skip */ }
            }
          };
          walk(root || '.', 0);
          return JSON.stringify(results);
        }
        case 'create_file':
        case 'edit_file': {
          const resolved = guard.resolve(args.path, true);
          if (name === 'create_file' && fs.existsSync(resolved)) return JSON.stringify({ error: 'File already exists. Use edit_file.' });
          const content = String(args.content ?? '');
          const ok = await confirm(`Write ${resolved}? [y/N] `);
          if (!ok) return JSON.stringify({ cancelled: true });
          fs.mkdirSync(path.dirname(resolved), { recursive: true });
          fs.writeFileSync(resolved, content, 'utf8');
          return JSON.stringify({ success: true, path: resolved });
        }
        case 'delete_file': {
          const resolved = guard.resolve(args.path, false);
          const ok = await confirm(`Delete ${resolved}? [y/N] `);
          if (!ok) return JSON.stringify({ cancelled: true });
          fs.unlinkSync(resolved);
          return JSON.stringify({ success: true, path: resolved });
        }
        case 'rename_file': {
          const r1 = guard.resolve(args.path, false);
          const r2 = guard.resolve(args.newPath, true);
          if (fs.existsSync(r2)) return JSON.stringify({ error: 'Target already exists.' });
          const ok = await confirm(`Rename ${r1} -> ${r2}? [y/N] `);
          if (!ok) return JSON.stringify({ cancelled: true });
          fs.renameSync(r1, r2);
          return JSON.stringify({ success: true });
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (err: any) {
      return JSON.stringify({ error: err?.message || String(err) });
    }
  }

  function confirm(question: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(/^y(es)?$/i.test(a.trim())); }));
  }

  const systemPrompt = `You are Refx, a coding assistant in the terminal. Workspace root: ${root || '(none)'}. Use tools to inspect and modify files. Confirm before destructive writes.`;

  const messages: any[] = [{ role: 'system', content: systemPrompt }];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  console.log('Refx chat. Type "exit" to quit.');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const input = (await ask('> ')).trim();
    if (!input) continue;
    if (input === 'exit' || input === 'quit') break;
    messages.push({ role: 'user', content: input });

    // agent loop
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let res: any;
      if (provider === 'ollama') {
        const r = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, tools, stream: false }),
        });
        if (!r.ok) { console.error(`Ollama error: ${r.status}`); break; }
        res = await r.json();
      } else {
        const r = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
          body: JSON.stringify({ model, messages, tools, stream: false }),
        });
        if (!r.ok) { console.error(`Provider error: ${r.status}`); break; }
        const j = await r.json();
        res = { message: j.choices?.[0]?.message };
      }
      const msg = res?.message;
      if (!msg) { console.error('No response.'); break; }
      messages.push(msg);
      if (msg.content) console.log(msg.content);
      const toolCalls = msg.tool_calls || msg.toolCalls;
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) break;
      for (const tc of toolCalls) {
        const fn = tc.function || tc;
        const name = fn.name;
        let fnArgs: any = fn.arguments;
        if (typeof fnArgs === 'string') { try { fnArgs = JSON.parse(fnArgs); } catch { fnArgs = {}; } }
        const result = await runTool(name, fnArgs || {});
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
    }
  }
  rl.close();
}

async function main(): Promise<void> {
  // Pull global options out of anywhere in argv.
  const cleaned: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--workspace' || a === '-w') {
      process.env.REFX_WORKSPACE = args[++i];
    } else if (a.startsWith('--workspace=')) {
      process.env.REFX_WORKSPACE = a.slice('--workspace='.length);
    } else {
      cleaned.push(a);
    }
  }
  const cmd = cleaned[0];
  const rest = cleaned.slice(1);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(`Refx CLI

Commands:
  workspace [path]          authorize + activate a workspace
  ls [dir]                  list directory
  read <file>               print file
  search <query>            search files and text (--files for names only)
  create <file> [--content] [--stdin]
  edit <file> [--content] [--stdin]
  delete <file> [--yes]
  rename <src> <dst>
  move <src> <dst>
  chat                      interactive agent (Ollama by default)

Global options:
  --workspace, -w <path>    use/authorize a workspace for this invocation
  REFX_WORKSPACE            env var for workspace
  REFX_USER_DATA            override app data dir
  REFX_PROVIDER             ollama | openai (default ollama)
  REFX_MODEL                model name
  REFX_BASE_URL             provider base URL
  REFX_API_KEY              API key
`);
    return;
  }

  switch (cmd) {
    case 'workspace': await cmdWorkspace(rest); break;
    case 'ls': await cmdLs(rest); break;
    case 'read': await cmdRead(rest); break;
    case 'search': await cmdSearch(rest); break;
    case 'create': await cmdCreate(rest); break;
    case 'edit': await cmdEdit(rest); break;
    case 'delete': await cmdDelete(rest); break;
    case 'rename': await cmdRename(rest, false); break;
    case 'move': await cmdRename(rest, true); break;
    case 'chat': await cmdChat(rest); break;
    default:
      console.error(`Unknown command: ${cmd}. Run "refx help".`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
