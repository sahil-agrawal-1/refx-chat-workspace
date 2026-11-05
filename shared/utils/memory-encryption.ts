/**
 * Pure memory-encryption policy shared by the Electron main process and tests.
 *
 * Encryption is opt-in. When it is enabled, every failure is fatal: callers
 * must never receive (and therefore never persist) the original plaintext as a
 * fallback. Encrypted values carry a marker so legacy plaintext can still be
 * read and the next successful write can upgrade it.
 */

export const MEMORY_ENCRYPTION_MARKER = 'enc:v1:';

export interface TextEncryptor {
  isAvailable(): boolean;
  encryptString(plaintext: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

export type MemoryEncryptionErrorCode = 'unavailable' | 'encrypt-failed' | 'decrypt-failed';

export class MemoryEncryptionError extends Error {
  readonly code: MemoryEncryptionErrorCode;

  constructor(code: MemoryEncryptionErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'MemoryEncryptionError';
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export interface MemoryEncryptionOptions {
  enabled: boolean;
  encryptor: TextEncryptor;
}

export function isEncryptedMemoryPayload(stored: string): boolean {
  return String(stored ?? '').startsWith(MEMORY_ENCRYPTION_MARKER);
}

/**
 * Encrypt memory content when encryption is enabled.
 *
 * - Disabled: return the content unchanged (the feature is explicitly off).
 * - Enabled but unavailable: throw instead of writing plaintext.
 * - Encryptor throws: throw instead of writing plaintext.
 */
export function encryptMemoryText(plain: string, options: MemoryEncryptionOptions): string {
  const value = String(plain ?? '');
  if (!options.enabled) return value;

  if (!options.encryptor.isAvailable()) {
    throw new MemoryEncryptionError(
      'unavailable',
      'Memory encryption is enabled, but OS secure storage is unavailable. Nothing was saved.',
    );
  }

  try {
    const encrypted = options.encryptor.encryptString(value);
    return `${MEMORY_ENCRYPTION_MARKER}${encrypted.toString('base64')}`;
  } catch (err) {
    if (err instanceof MemoryEncryptionError) throw err;
    throw new MemoryEncryptionError(
      'encrypt-failed',
      'Memory encryption failed. Nothing was saved and the existing memory file was left unchanged.',
      err,
    );
  }
}

/**
 * Decrypt stored memory content.
 *
 * Legacy plaintext (no marker) is returned as-is. Encrypted data that cannot be
 * decrypted throws: returning the ciphertext or an empty value would either
 * corrupt the document or silently replace the user's data.
 */
export function decryptMemoryText(
  stored: string,
  options: { encryptor: TextEncryptor },
): string {
  const value = String(stored ?? '');
  if (!isEncryptedMemoryPayload(value)) return value;

  if (!options.encryptor.isAvailable()) {
    throw new MemoryEncryptionError(
      'unavailable',
      'Encrypted memory data cannot be read because OS secure storage is unavailable. No data was modified.',
    );
  }

  try {
    const buffer = Buffer.from(value.slice(MEMORY_ENCRYPTION_MARKER.length), 'base64');
    return options.encryptor.decryptString(buffer);
  } catch (err) {
    throw new MemoryEncryptionError(
      'decrypt-failed',
      'Encrypted memory data could not be decrypted. The file was left unchanged; restore it from a backup or use the OS account that created it.',
      err,
    );
  }
}
