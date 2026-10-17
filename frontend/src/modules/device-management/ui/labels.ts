import type { EquipmentStatus } from '../domain/equipment'
import type { MaintenanceType } from '../domain/maintenance'
import { LOCALES, type Language, type MessageKey } from '../../../shared/i18n'
import type { BadgeTone } from '../../../shared/components/badge'

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

export function formatDateTime(iso: string, language: Language): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(LOCALES[language])
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(LOCALES[language]).format(value)
}
