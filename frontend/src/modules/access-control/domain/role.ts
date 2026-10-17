export const ROLES = ['admin', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

// UI hint only; the backend (Apps Script check or Supabase RLS) enforces the real rule.
export function canWrite(role: Role): boolean {
  return role === 'admin'
}
