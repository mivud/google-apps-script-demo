import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { buildEquipment, hasCategoryInput, type StoredEquipment } from '../domain/Equipment';
import { asKnownId, resolveCategoryId } from './CategoryCommands';
import type { DeviceStore } from './DeviceStore';

type Input = Record<string, unknown>;

export class EquipmentCommands {
  constructor(private readonly store: DeviceStore, private readonly ids: IdGenerator) {}

  create(request: RequestContext, input: Input): Promise<StoredEquipment> {
    const draft = buildEquipment(this.ids.next(), null, input);
    return this.store.run(request, async (tx) => {
      const categoryId = await resolveCategoryId(tx, input.category_id);
      return tx.equipment.save({ ...draft, category_id: categoryId });
    });
  }

  update(request: RequestContext, id: string, patch: Input): Promise<StoredEquipment> {
    return this.store.run(request, async (tx) => {
      const current = await tx.equipment.get(asKnownId(id));
      if (!current) throw notFound();
      const draft = buildEquipment(current.id, current, patch);
      const categoryId = hasCategoryInput(patch) ? await resolveCategoryId(tx, patch.category_id) : current.category_id;
      return tx.equipment.save({ ...draft, category_id: categoryId });
    });
  }

  // Equipment owns its logs: they are removed in the same transaction (mirrors ON DELETE CASCADE).
  remove(request: RequestContext, id: string): Promise<Record<string, never>> {
    return this.store.run(request, async (tx) => {
      const current = await tx.equipment.get(asKnownId(id));
      if (!current) throw notFound();
      for (const log of await tx.maintenance.ofEquipment(current.id)) tx.maintenance.remove(log.id);
      tx.equipment.remove(current.id);
      return {};
    });
  }
}
