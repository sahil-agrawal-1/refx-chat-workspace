/**
 * Small argument validators for high-risk IPC handlers.
 *
 * These run in the main process, which is the trust boundary. They reject
 * malformed renderer input early instead of letting unexpected types or
 * unbounded strings reach filesystem, terminal, or persistence code.
 */

export class IpcArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpcArgumentError';
  }
}

export interface StringValidationOptions {
  allowEmpty?: boolean;
  minLength?: number;
  maxLength?: number;
}

const DEFAULT_MAX_STRING_LENGTH = 16_384;

export function assertString(
  value: unknown,
  name: string,
  options: StringValidationOptions = {},
): string {
  if (typeof value !== 'string') {
    throw new IpcArgumentError(`${name} must be a string.`);
  }

  const maxLength = options.maxLength ?? DEFAULT_MAX_STRING_LENGTH;
  if (value.length > maxLength) {
    throw new IpcArgumentError(`${name} exceeds the maximum length of ${maxLength}.`);
  }
  if (!options.allowEmpty && value.length === 0) {
    throw new IpcArgumentError(`${name} must not be empty.`);
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new IpcArgumentError(`${name} must be at least ${options.minLength} characters.`);
  }

  return value;
}

export function assertOptionalString(
  value: unknown,
  name: string,
  options: StringValidationOptions = {},
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return assertString(value, name, options);
}

export function assertFiniteInteger(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new IpcArgumentError(`${name} must be an integer.`);
  }
  if (value < min || value > max) {
    throw new IpcArgumentError(`${name} must be between ${min} and ${max}.`);
  }
  return value;
}

export function assertPlainObject(
  value: unknown,
  name: string,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new IpcArgumentError(`${name} must be an object.`);
  }
  return value as Record<string, unknown>;
}
