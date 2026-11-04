import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function trashFile(): string {
  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'trash.json');
}

function loadTrash(): any[] {
  try {
    const f = trashFile();
    if (!fs.existsSync(f)) return [];
    const raw = fs.readFileSync(f, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTrash(items: any[]): void {
  try {
    fs.writeFileSync(trashFile(), JSON.stringify(items, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

export function purgeExpired(): number {
  const now = Date.now();
  const items = loadTrash();
  const kept = items.filter((i) => now - (i.deletedAt || 0) <= SEVEN_DAYS);
  const removed = items.length - kept.length;
  saveTrash(kept);
  return removed;
}

export function listTrash(): any[] {
  purgeExpired();
  return loadTrash();
}

export function addToTrash(type: string, data: any): any {
  const items = loadTrash();
  const item = {
    id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    data,
    deletedAt: Date.now(),
  };
  items.unshift(item);
  saveTrash(items);
  return item;
}

export function restoreTrash(id: string): any | null {
  const items = loadTrash();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const item = items[idx];
  items.splice(idx, 1);
  saveTrash(items);
  return item;
}

export function purgeTrash(id: string): boolean {
  const items = loadTrash();
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  saveTrash(next);
  return true;
}