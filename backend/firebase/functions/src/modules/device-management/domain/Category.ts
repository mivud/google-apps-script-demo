import type { DeviceAudit } from '../../../shared/audit/AuditStyle';
import { rule, validation } from '../../../shared/errors/DomainError';

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
}
export type StoredCategory = Category & DeviceAudit;

export function parseCategoryName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw validation('category_name_required');
  return value.trim();
}

// Sibling names are unique case-insensitively (same key as the Supabase unique index).
export const categoryNameKey = (name: string): string => name.trim().toLowerCase();

// A category cannot be its own parent or sit under its own descendant. parentOf walks one step up.
export async function assertNoCategoryCycle(
  categoryId: string,
  newParentId: string | null,
  parentOf: (id: string) => Promise<string | null>,
): Promise<void> {
  const visited = new Set<string>();
  let cursor = newParentId;
  while (cursor !== null) {
    if (cursor === categoryId || visited.has(cursor)) throw rule('category_cycle');
    visited.add(cursor);
    cursor = await parentOf(cursor);
  }
}
