import type { Access } from './Access';

// Port: finds the access of an active, allowlisted user by verified email (null when unknown or inactive).
export interface AccessResolver {
  resolve(email: string): Promise<Access | null>;
}
