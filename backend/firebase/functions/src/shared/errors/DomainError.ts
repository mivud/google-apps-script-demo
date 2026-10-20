// Typed domain failure with a stable code. Only the endpoint layer turns it into an HTTPS error.
export type ErrorKind = 'validation' | 'rule' | 'not_found' | 'forbidden' | 'unauthenticated' | 'conflict';

export class DomainError extends Error {
  constructor(readonly code: string, readonly kind: ErrorKind) {
    super(code);
    this.name = 'DomainError';
  }
}

export const validation = (code: string): DomainError => new DomainError(code, 'validation');
export const rule = (code: string): DomainError => new DomainError(code, 'rule');
export const notFound = (code = 'not_found'): DomainError => new DomainError(code, 'not_found');
export const forbidden = (): DomainError => new DomainError('forbidden', 'forbidden');
export const unauthenticated = (): DomainError => new DomainError('unauthenticated', 'unauthenticated');
export const conflict = (): DomainError => new DomainError('conflict', 'conflict');
