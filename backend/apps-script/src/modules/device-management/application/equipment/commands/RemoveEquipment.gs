// deps: { repository, logCascade } (ports).
DeviceManagement.Application.RemoveEquipment = {
  // Logs go first so a failure never leaves orphans behind a missing parent.
  execute: function (deps, input) {
    var found = DeviceManagement.Application.EquipmentSupportService.requireExisting(deps, input.id);
    deps.logCascade.removeAllFor(found.row.id);
    deps.repository.deleteAt(found.index);
    return null;
  }
};
