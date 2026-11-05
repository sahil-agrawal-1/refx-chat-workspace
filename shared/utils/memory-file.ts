/**
 * Atomic, encrypted memory-file helpers shared by the Electron main process
 * and tests.
 *
 * Encoding always happens before any filesystem mutation. If encryption fails,
 * the existing primary file, temp file, and backup are left untouched.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface MemoryFileCodec {
  encode(content: string): string;
  decode(stored: string): string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Write an already-encoded payload through a temp file and refresh the `.bak`
 * recovery copy. The caller is responsible for encoding before calling this.
 */
export function atomicWriteEncodedMemoryFile(filePath: string, payload: string): void {
  ensureDir(path.dirname(filePath));
  const tmp = filePath + '.tmp';
  const bak = filePath + '.bak';
  fs.writeFileSync(tmp, payload, 'utf8');
  // Keep a latest-known-good recovery copy of exactly what we are about to
  // publish. If the primary file is later damaged, the backup still contains
  // the most recent successful write rather than an older generation.
  try {
    fs.copyFileSync(tmp, bak);
  } catch {
    // A failed backup must not block the primary write.
  }
  fs.renameSync(tmp, filePath);
}

/** Encode first, then perform the atomic write. */
export function atomicWriteMemoryFile(
  filePath: string,
  content: string,
  encode: (content: string) => string,
): void {
  const payload = encode(content);
  atomicWriteEncodedMemoryFile(filePath, payload);
}

/**
 * Reads JSON from the primary file, then the pending temp file, then the last
 * known-good backup.
 *
 * Decode errors are deliberately not swallowed: an encrypted document that
 * cannot be decrypted aborts the read instead of falling back to an empty
 * value (which a later save could persist over the user's data). JSON parse
 * errors still try the recovery copies, preserving the existing corruption
 * recovery behavior.
 */
export function readMemoryJsonFile<T>(
  filePath: string,
  fallback: T,
  codec: MemoryFileCodec,
): T {
  const candidates = [filePath, filePath + '.tmp', filePath + '.bak'];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!fs.existsSync(candidate)) continue;

    const raw = fs.readFileSync(candidate, 'utf8');
    // Fail closed on encryption/decryption problems; do not mask them as a
    // corrupt JSON document and fall back to older or empty data.
    const decrypted = codec.decode(raw);

    let parsed: T;
    try {
      parsed = JSON.parse(decrypted) as T;
    } catch {
      // Try the next recovery candidate.
      continue;
    }

    if (index > 0) {
      // The primary file was corrupt. Restore it from the recovery copy so
      // the next read is fast and the store does not stay degraded.
      try {
        atomicWriteMemoryFile(filePath, JSON.stringify(parsed, null, 2), codec.encode);
      } catch {
        // Recovery is best-effort; returning the parsed value is enough.
      }
    }
    return parsed;
  }
  return fallback;
}
