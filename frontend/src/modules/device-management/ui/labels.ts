import type { EquipmentStatus } from '../domain/equipment'
import type { MaintenanceType } from '../domain/maintenance'
import { parseDateOnly } from '../domain/warranty'
import { LOCALES, type Language, type MessageKey } from '../../../shared/i18n'
import type { BadgeTone } from '../../../shared/components/badge'

// Shown for any optional value that is not set.
export const EMPTY_VALUE = '—'

// Keys instead of strings so the active language is resolved at render time via t().
export const STATUS_LABEL_KEYS: Record<EquipmentStatus, MessageKey> = {
  active: 'status.active',
  in_repair: 'status.in_repair',
  retired: 'status.retired',
}

export const STATUS_TONES: Record<EquipmentStatus, BadgeTone> = {
  active: 'success',
  in_repair: 'warning',
  retired: 'neutral',
}

export const MAINTENANCE_LABEL_KEYS: Record<MaintenanceType, MessageKey> = {
  new: 'maintenanceType.new',
  repair: 'maintenanceType.repair',
  replacement: 'maintenanceType.replacement',
  maintenance: 'maintenanceType.maintenance',
}

export function formatDate(iso: string, language: Language): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(LOCALES[language])
}

// Date-only values (YYYY-MM-DD) are formatted as a UTC calendar day so the viewer's timezone cannot shift them.
export function formatDateOnly(value: string | null, language: Language): string {
  if (value === null) return EMPTY_VALUE
  const parts = parseDateOnly(value)
  if (!parts) return value
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).toLocaleDateString(LOCALES[language], { timeZone: 'UTC' })
}

export const EXPIRING_SOON_DAYS = 30
const MS_PER_DAY = 86_400_000

export type WarrantyStatus = 'active' | 'expiring' | 'expired'

export const WARRANTY_LABEL_KEYS: Record<WarrantyStatus, MessageKey> = {
  active: 'warranty.active',
  expiring: 'warranty.expiring',
  expired: 'warranty.expired',
}

export const WARRANTY_TONES: Record<WarrantyStatus, BadgeTone> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
}

// `today` is a local YYYY-MM-DD so the caller reads the clock once per render.
export function getWarrantyStatus(expiryDate: string | null, today: string): WarrantyStatus | null {
  const expiry = expiryDate === null ? null : parseDateOnly(expiryDate)
  const now = parseDateOnly(today)
  if (!expiry || !now) return null
  const days = (Date.UTC(expiry.year, expiry.month - 1, expiry.day) - Date.UTC(now.year, now.month - 1, now.day)) / MS_PER_DAY
  if (days < 0) return 'expired'
  return days <= EXPIRING_SOON_DAYS ? 'expiring' : 'active'
}

export function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatDateTime(iso: string, language: Language): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(LOCALES[language])
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language]).format(value)
}
