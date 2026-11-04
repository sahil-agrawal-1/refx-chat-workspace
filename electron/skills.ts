import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

function skillsRoot(): string {
  const root = path.join(app.getPath('appData'), 'Refx AI', 'skills');
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

function safeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, '');
}

function entryDir(id: string): string {
  return path.join(skillsRoot(), safeId(id));
}

function readSkill(id: string): any | null {
  const dir = entryDir(id);
  const metaPath = path.join(dir, 'metadata.json');
  const skillPath = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(metaPath)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const instructions = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
    return { ...meta, instructions, id: meta.id || id };
  } catch {
    return null;
  }
}

export function listSkills(): any[] {
  const root = skillsRoot();
  const result: any[] = [];
  if (!fs.existsSync(root)) return result;
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const skill = readSkill(dir.name);
    if (skill) result.push(skill);
  }
  return result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getSkill(id: string): any | null {
  return readSkill(safeId(id));
}

export function saveSkill(skill: any): any {
  const id = skill.id && skill.id.trim() ? safeId(skill.id) : `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dir = entryDir(id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const now = Date.now();
  const meta = {
    id,
    name: skill.name || 'Untitled Skill',
    description: skill.description || '',
    enabled: skill.enabled ?? true,
    applyByDefault: skill.applyByDefault ?? false,
    createdAt: skill.createdAt || now,
    updatedAt: now,
  };
  const tmpMeta = path.join(dir, 'metadata.json.tmp');
  fs.writeFileSync(tmpMeta, JSON.stringify(meta, null, 2), 'utf8');
  fs.renameSync(tmpMeta, path.join(dir, 'metadata.json'));
  const tmpSkill = path.join(dir, 'SKILL.md.tmp');
  fs.writeFileSync(tmpSkill, skill.instructions || '', 'utf8');
  fs.renameSync(tmpSkill, path.join(dir, 'SKILL.md'));
  return { ...meta, instructions: skill.instructions || '' };
}

export function deleteSkill(id: string): boolean {
  const dir = entryDir(id);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function duplicateSkill(id: string): any | null {
  const skill = readSkill(id);
  if (!skill) return null;
  return saveSkill({ ...skill, id: '', name: `${skill.name} (Copy)` });
}

export function getSkillsDir(): string {
  return skillsRoot();
}