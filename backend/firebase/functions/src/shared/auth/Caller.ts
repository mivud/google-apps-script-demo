import type { CallableRequest } from 'firebase-functions/v2/https';

type AuthData = CallableRequest['auth'];
import { unauthenticated } from '../errors/DomainError';

export interface Caller {
  readonly email: string;
}

const GOOGLE_PROVIDER = 'google.com';

// Only a Google login with a verified email counts (another provider could claim an allowlisted email).
export function callerFromAuth(auth: AuthData): Caller {
  const token = auth?.token;
  const email = typeof token?.email === 'string' ? token.email.trim().toLowerCase() : '';
  if (!token || !email || token.email_verified !== true || token.firebase?.sign_in_provider !== GOOGLE_PROVIDER) {
    throw unauthenticated();
  }
  return { email };
}
