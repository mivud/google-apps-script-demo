// deps: { repository, audit, idGenerator, equipmentLookup } (ports).
DeviceManagement.Application.AddMaintenanceLog = {
  // Validation order is part of the contract: type, date, note, then the equipment lookup.
  execute: function (deps, input) {
    var MaintenanceLog = DeviceManagement.Domain.MaintenanceLog;
    MaintenanceLog.assertType(input.type);
    var performedAt = MaintenanceLog.normalizePerformedAt(input.performedAt, deps.audit.nowUtc());
    MaintenanceLog.assertNote(input.note);
    var equipmentId = deps.equipmentLookup.requireExistingId(input.equipmentId);
    var row = MaintenanceLog.newRow({
      id: deps.idGenerator.newId(),
      equipmentId: equipmentId,
      type: input.type,
      performedAt: performedAt,
      note: input.note
    }, deps.audit.forCreate());
    deps.repository.append(row);
    return row;
  }
};
