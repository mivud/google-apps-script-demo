import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { DomainError, type ErrorKind } from './DomainError';

const CODE_BY_KIND: Record<ErrorKind, FunctionsErrorCode> = {
  validation: 'invalid-argument',
  rule: 'failed-precondition',
  not_found: 'not-found',
  forbidden: 'permission-denied',
  unauthenticated: 'unauthenticated',
  conflict: 'aborted',
};

// The client reads the stable code from error.details.code. Unknown failures stay generic (no internals leak).
export function toHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) return error;
  if (error instanceof DomainError) {
    return new HttpsError(CODE_BY_KIND[error.kind], error.code, { code: error.code });
  }
  logger.error('unhandled error', { name: error instanceof Error ? error.name : typeof error });
  return new HttpsError('internal', 'internal', { code: 'internal' });
}
