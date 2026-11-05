import { safeStorage } from 'electron';
import * as db from './database';

const MARKER = 'enc:v1:';

export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export function isEncryptionEnabled(): boolean {
  const config = (db.getMemoryConfig() as any) || {};
  return config.encryptionEnabled === true && isEncryptionAvailable();
}

export function encryptText(plain: string): string {
  if (!isEncryptionEnabled()) return plain;
  try {
    const buffer = safeStorage.encryptString(String(plain || ''));
    return `${MARKER}${buffer.toString('base64')}`;
  } catch {
    return plain;
  }
}

export function decryptText(stored: string): string {
  const value = String(stored || '');
  if (!value.startsWith(MARKER)) return value;
  if (!isEncryptionAvailable()) return value;
  try {
    const buffer = Buffer.from(value.slice(MARKER.length), 'base64');
    return safeStorage.decryptString(buffer);
  } catch {
    return value;
  }
}
