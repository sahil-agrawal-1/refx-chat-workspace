import { safeStorage } from 'electron';
import * as db from './database';
import {
  decryptMemoryText,
  encryptMemoryText,
  type MemoryEncryptionOptions,
  type TextEncryptor,
} from '../shared/utils/memory-encryption';

export {
  MEMORY_ENCRYPTION_MARKER,
  MemoryEncryptionError,
  isEncryptedMemoryPayload,
} from '../shared/utils/memory-encryption';

const safeStorageAdapter: TextEncryptor = {
  isAvailable: () => {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  },
  encryptString: (plaintext: string) => safeStorage.encryptString(plaintext),
  decryptString: (encrypted: Buffer) => safeStorage.decryptString(encrypted),
};

export function isEncryptionAvailable(): boolean {
  return safeStorageAdapter.isAvailable();
}

/** True when the user has enabled memory encryption in configuration. */
export function isEncryptionConfigured(): boolean {
  const config = (db.getMemoryConfig() as any) || {};
  return config.encryptionEnabled === true;
}

/** True when encryption is requested and the platform can actually do it. */
export function isEncryptionEnabled(): boolean {
  return isEncryptionConfigured() && isEncryptionAvailable();
}

function encryptionOptions(): MemoryEncryptionOptions {
  return {
    enabled: isEncryptionConfigured(),
    encryptor: safeStorageAdapter,
  };
}

/**
 * Encrypt memory content. Never returns plaintext when encryption is enabled:
 * unavailable secure storage or an encryption failure throws instead.
 */
export function encryptText(plain: string): string {
  return encryptMemoryText(plain, encryptionOptions());
}

/**
 * Decrypt memory content. Legacy plaintext is accepted; encrypted data that
 * cannot be decrypted throws instead of being treated as plaintext.
 */
export function decryptText(stored: string): string {
  return decryptMemoryText(stored, { encryptor: safeStorageAdapter });
}

/** Codec used by the atomic memory-file helpers. */
export function memoryFileCodec(): {
  encode: (content: string) => string;
  decode: (stored: string) => string;
} {
  return {
    encode: encryptText,
    decode: decryptText,
  };
}
