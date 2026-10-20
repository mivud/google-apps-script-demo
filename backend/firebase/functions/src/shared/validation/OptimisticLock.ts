import { conflict } from '../errors/DomainError';

// Optional optimistic concurrency: when the client sends the last_modified it saw, a mismatch is a conflict.
export function assertNotStale(stored: string, expected: unknown): void {
  if (typeof expected !== 'string') return;
  if (expected !== stored) throw conflict();
}
