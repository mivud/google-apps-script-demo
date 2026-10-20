import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { buildMaintenanceLog, type StoredMaintenanceLog } from '../domain/MaintenanceLog';
import { asKnownId } from './CategoryCommands';
import type { DeviceStore } from './DeviceStore';

export class MaintenanceCommands {
  constructor(private readonly store: DeviceStore, private readonly ids: IdGenerator) {}

  // Validation first (type, date, note), then the equipment lookup, like the Apps Script order.
  add(request: RequestContext, equipmentId: string, input: Record<string, unknown>): Promise<StoredMaintenanceLog> {
    const log = buildMaintenanceLog(this.ids.next(), asKnownId(equipmentId), input, request.nowIso);
    return this.store.run(request, async (tx) => {
      if (!(await tx.equipment.get(log.equipment_id))) throw notFound();
      return tx.maintenance.save(log);
    });
  }
}
