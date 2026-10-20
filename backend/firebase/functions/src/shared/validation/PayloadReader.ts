import { validation } from '../errors/DomainError';

export type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Read-only view over the untrusted payload. Type rules live in the domain value parsers.
export class PayloadReader {
  private constructor(readonly data: JsonRecord) {}

  static of(value: unknown): PayloadReader {
    if (value === undefined || value === null) return new PayloadReader({});
    if (!isRecord(value)) throw validation('invalid_request');
    return new PayloadReader(value);
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  raw(key: string): unknown {
    return this.has(key) ? this.data[key] : undefined;
  }

  requiredString(key: string): string {
    const value = this.raw(key);
    if (typeof value !== 'string' || value.trim() === '') throw validation('invalid_request');
    return value.trim();
  }

  object(key: string): PayloadReader {
    const value = this.raw(key);
    if (!isRecord(value)) throw validation('invalid_request');
    return new PayloadReader(value);
  }

  optionalBoolean(key: string): boolean | undefined {
    const value = this.raw(key);
    if (value === undefined) return undefined;
    if (typeof value !== 'boolean') throw validation('invalid_request');
    return value;
  }

  stringArray(key: string): string[] {
    const value = this.raw(key);
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw validation('invalid_request');
    return value as string[];
  }
}
