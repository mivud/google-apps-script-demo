import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound, rule, validation } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { parseUuid } from '../../../shared/validation/Values';
import { assertNoCategoryCycle, categoryNameKey, parseCategoryName, type StoredCategory } from '../domain/Category';
import type { DeviceStore, DeviceTx } from './DeviceStore';

type Input = Record<string, unknown>;
const has = (input: Input, key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);

// '' and null both mean "root"; anything else must be an existing category.
export async function resolveCategoryId(tx: DeviceTx, value: unknown): Promise<string | null> {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw validation('invalid_request');
  const id = asKnownId(value);
  if (!(await tx.categories.get(id))) throw notFound();
  return id;
}

export function asKnownId(value: string): string {
  try {
    return parseUuid(value, 'not_found');
  } catch {
    throw notFound();
  }
}

async function assertSiblingNameFree(tx: DeviceTx, parentId: string | null, name: string, exceptId: string) {
  const siblings = await tx.categories.childrenOf(parentId);
  const taken = siblings.some((c) => c.id !== exceptId && categoryNameKey(c.name) === categoryNameKey(name));
  if (taken) throw validation('category_name_duplicate');
}

export class CategoryCommands {
  constructor(private readonly store: DeviceStore, private readonly ids: IdGenerator) {}

  create(request: RequestContext, input: Input): Promise<StoredCategory> {
    const name = parseCategoryName(input.name);
    return this.store.run(request, async (tx) => {
      const parentId = await resolveCategoryId(tx, input.parent_id);
      await assertSiblingNameFree(tx, parentId, name, '');
      return tx.categories.save({ id: this.ids.next(), parent_id: parentId, name });
    });
  }

  update(request: RequestContext, id: string, patch: Input): Promise<StoredCategory> {
    return this.store.run(request, async (tx) => {
      const current = await tx.categories.get(asKnownId(id));
      if (!current) throw notFound();
      const name = has(patch, 'name') ? parseCategoryName(patch.name) : current.name;
      const parentId = has(patch, 'parent_id') ? await resolveCategoryId(tx, patch.parent_id) : current.parent_id;
      await assertNoCategoryCycle(current.id, parentId, async (cursor) => (await tx.categories.get(cursor))?.parent_id ?? null);
      await assertSiblingNameFree(tx, parentId, name, current.id);
      return tx.categories.save({ id: current.id, parent_id: parentId, name });
    });
  }

  // Mirrors ON DELETE RESTRICT: children are reported first, then equipment that uses the category.
  remove(request: RequestContext, id: string): Promise<Record<string, never>> {
    return this.store.run(request, async (tx) => {
      const current = await tx.categories.get(asKnownId(id));
      if (!current) throw notFound();
      if ((await tx.categories.childrenOf(current.id)).length > 0) throw rule('category_has_children');
      if (await tx.equipment.isCategoryUsed(current.id)) throw rule('category_in_use');
      tx.categories.remove(current.id);
      return {};
    });
  }
}
