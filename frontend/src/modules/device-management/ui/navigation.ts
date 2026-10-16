// Hash routes live here so components never touch window.location directly.
export function navigate(path: string): void {
  window.location.hash = `#${path}`
}

export function equipmentPath(id: string): string {
  return `/equipment/${encodeURIComponent(id)}`
}

// Returns null for non-detail paths or malformed escapes.
export function parseEquipmentId(path: string): string | null {
  const match = /^\/equipment\/([^/]+)$/.exec(path)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export const CATEGORIES_PATH = '/categories'
