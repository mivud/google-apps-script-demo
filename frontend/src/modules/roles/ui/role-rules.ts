// Mirrors the backend rule (role_protected); used only to hide actions that would be refused.
const BUILT_IN_ROLE_NAMES: readonly string[] = ['super']

export function isBuiltInRole(name: string): boolean {
  return BUILT_IN_ROLE_NAMES.includes(name)
}
