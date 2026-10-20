import { rule } from '../../../shared/errors/DomainError';

export interface SuperTarget {
  readonly email: string;
  readonly isActiveSuper: boolean;
}

export interface LockoutFacts {
  readonly target: SuperTarget;
  readonly activeSuperCount: number;
  readonly callerEmail: string;
}

const isCaller = (facts: LockoutFacts): boolean =>
  facts.callerEmail !== '' && facts.callerEmail === facts.target.email.toLowerCase();

// Removing (deactivate, delete, drop the super role) an active super: never the last one, never yourself.
export function assertSuperRemovable(facts: LockoutFacts): void {
  if (!facts.target.isActiveSuper) return;
  if (facts.activeSuperCount <= 1) throw rule('last_super');
  if (isCaller(facts)) throw rule('self_lockout');
}

// Changing the email of the caller's own super row would cut them off (the token email no longer matches).
export function assertSuperEmailChangeAllowed(facts: LockoutFacts): void {
  if (facts.target.isActiveSuper && isCaller(facts)) throw rule('self_lockout');
}
