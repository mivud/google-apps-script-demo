// Hash routes live here so components never touch window.location directly.
// All device routes sit under one prefix because the SPA shell hosts several apps.
export const DEVICES_PATH = '/devices'
export const CATEGORIES_PATH = `${DEVICES_PATH}/categories`
const EQUIPMENT_PREFIX = `${DEVICES_PATH}/equipment`

export function navigate(path: string): void {
  window.location.hash = `#${path}`
}

export function equipmentPath(id: string): string {
  return `${EQUIPMENT_PREFIX}/${encodeURIComponent(id)}`
}

// Returns null for non-detail paths or malformed escapes.
export function parseEquipmentId(path: string): string | null {
  if (!path.startsWith(`${EQUIPMENT_PREFIX}/`)) return null
  const segment = path.slice(EQUIPMENT_PREFIX.length + 1)
  if (!segment || segment.includes('/')) return null
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}
