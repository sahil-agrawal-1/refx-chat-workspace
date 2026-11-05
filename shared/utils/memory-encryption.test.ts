import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  MEMORY_ENCRYPTION_MARKER,
  MemoryEncryptionError,
  decryptMemoryText,
  encryptMemoryText,
  type TextEncryptor,
} from './memory-encryption';
import {
  atomicWriteMemoryFile,
  readMemoryJsonFile,
  type MemoryFileCodec,
} from './memory-file';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'refx-memory-encryption-'));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function makeEncryptor(
  options: { available?: boolean; failEncrypt?: boolean; failDecrypt?: boolean } = {},
): TextEncryptor {
  const available = options.available ?? true;
  const store = new Map<string, string>();
  return {
    isAvailable: () => available,
    encryptString: (plaintext: string) => {
      if (!available) throw new Error('secure storage unavailable');
      if (options.failEncrypt) throw new Error('encrypt failed');
      const encoded = Buffer.from(`ENC:${plaintext}`).toString('base64');
      store.set(encoded, plaintext);
      return Buffer.from(encoded);
    },
    decryptString: (encrypted: Buffer) => {
      if (!available) throw new Error('secure storage unavailable');
      if (options.failDecrypt) throw new Error('decrypt failed');
      const plaintext = store.get(encrypted.toString());
      if (plaintext === undefined) throw new Error('unknown encryption key');
      return plaintext;
    },
  };
}

function makeCodec(encryptor: TextEncryptor, enabled = true): MemoryFileCodec {
  return {
    encode: (content) => encryptMemoryText(content, { enabled, encryptor }),
    decode: (stored) => decryptMemoryText(stored, { encryptor }),
  };
}

test('memory encryption round-trips when secure storage is available', () => {
  const encryptor = makeEncryptor();
  const encrypted = encryptMemoryText('private memory', { enabled: true, encryptor });

  assert.ok(encrypted.startsWith(MEMORY_ENCRYPTION_MARKER));
  assert.equal(encrypted.includes('private memory'), false);
  assert.equal(decryptMemoryText(encrypted, { encryptor }), 'private memory');
});

test('disabled encryption deliberately keeps plaintext behavior', () => {
  const encryptor = makeEncryptor();
  const value = encryptMemoryText('plain when disabled', { enabled: false, encryptor });

  assert.equal(value, 'plain when disabled');
  assert.equal(decryptMemoryText(value, { encryptor }), 'plain when disabled');
});

test('enabled encryption fails clearly when secure storage is unavailable', () => {
  const encryptor = makeEncryptor({ available: false });

  assert.throws(
    () => encryptMemoryText('must not leak', { enabled: true, encryptor }),
    (err: unknown) =>
      err instanceof MemoryEncryptionError &&
      err.code === 'unavailable' &&
      /secure storage is unavailable/.test(err.message),
  );
});

test('encryptor failure is surfaced and never falls back to plaintext', () => {
  const encryptor = makeEncryptor({ failEncrypt: true });

  assert.throws(
    () => encryptMemoryText('must not leak', { enabled: true, encryptor }),
    (err: unknown) =>
      err instanceof MemoryEncryptionError &&
      err.code === 'encrypt-failed' &&
      /Nothing was saved/.test(err.message),
  );
});

test('previously written plaintext remains readable', () => {
  const encryptor = makeEncryptor();
  const legacy = '{"legacy":true}';

  assert.equal(decryptMemoryText(legacy, { encryptor }), legacy);
});

test('encrypted data that cannot be decrypted fails closed', () => {
  const writer = makeEncryptor();
  const encrypted = encryptMemoryText('secret', { enabled: true, encryptor: writer });
  const reader = makeEncryptor();

  assert.throws(
    () => decryptMemoryText(encrypted, { encryptor: reader }),
    (err: unknown) =>
      err instanceof MemoryEncryptionError &&
      err.code === 'decrypt-failed' &&
      /could not be decrypted/.test(err.message),
  );
});

test('an encryption failure leaves the existing memory file intact', () => {
  const filePath = path.join(tmpRoot, 'app-memory', 'entries.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '{"existing":true}', 'utf8');

  const codec = makeCodec(makeEncryptor({ available: false }));

  assert.throws(
    () => atomicWriteMemoryFile(filePath, '{"replacement":true}', codec.encode),
    MemoryEncryptionError,
  );
  assert.equal(fs.readFileSync(filePath, 'utf8'), '{"existing":true}');
  assert.equal(fs.existsSync(filePath + '.tmp'), false);
});

test('a successful write encrypts both the primary file and its backup', () => {
  const filePath = path.join(tmpRoot, 'app-memory', 'entries.json');
  const codec = makeCodec(makeEncryptor());

  atomicWriteMemoryFile(filePath, '{"saved":true}', codec.encode);

  for (const candidate of [filePath, filePath + '.bak']) {
    const raw = fs.readFileSync(candidate, 'utf8');
    assert.ok(raw.startsWith(MEMORY_ENCRYPTION_MARKER));
    assert.equal(raw.includes('"saved"'), false);
    assert.equal(codec.decode(raw), '{"saved":true}');
  }
});

test('legacy plaintext is read and upgraded on the next save', () => {
  const filePath = path.join(tmpRoot, 'app-memory', 'entries.json');
  const codec = makeCodec(makeEncryptor());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '{"legacy":true}', 'utf8');

  const parsed = readMemoryJsonFile(filePath, {}, codec);
  assert.deepEqual(parsed, { legacy: true });

  atomicWriteMemoryFile(filePath, JSON.stringify(parsed), codec.encode);
  assert.ok(fs.readFileSync(filePath, 'utf8').startsWith(MEMORY_ENCRYPTION_MARKER));
});

test('a corrupt primary file is recovered from backup and restored encrypted', () => {
  const filePath = path.join(tmpRoot, 'app-memory', 'entries.json');
  const codec = makeCodec(makeEncryptor());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'not-json', 'utf8');
  fs.writeFileSync(filePath + '.bak', '{"recovered":true}', 'utf8');

  const parsed = readMemoryJsonFile(filePath, {}, codec);

  assert.deepEqual(parsed, { recovered: true });
  const restored = fs.readFileSync(filePath, 'utf8');
  assert.ok(restored.startsWith(MEMORY_ENCRYPTION_MARKER));
  assert.equal(codec.decode(restored), JSON.stringify({ recovered: true }, null, 2));
});

test('undecryptable primary data is preserved and does not fall back to a readable backup', () => {
  const filePath = path.join(tmpRoot, 'app-memory', 'entries.json');
  const writer = makeEncryptor();
  const writerCodec = makeCodec(writer);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  atomicWriteMemoryFile(filePath, '{"secret":true}', writerCodec.encode);

  // Make the backup look recoverable. The primary must still fail closed
  // because falling back could replace newer encrypted data with stale data.
  fs.writeFileSync(filePath + '.bak', '{"stale":true}', 'utf8');
  const before = fs.readFileSync(filePath, 'utf8');

  const readerCodec = makeCodec(makeEncryptor());
  assert.throws(() => readMemoryJsonFile(filePath, {}, readerCodec), MemoryEncryptionError);
  assert.equal(fs.readFileSync(filePath, 'utf8'), before);
  assert.equal(fs.readFileSync(filePath + '.bak', 'utf8'), '{"stale":true}');
});
