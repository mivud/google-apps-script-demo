// deps: { repository, audit, idGenerator, categoryLookup } (ports).
DeviceManagement.Application.CreateEquipment = {
  execute: function (deps, input) {
    var row = DeviceManagement.Domain.Equipment.newRow(
      Object.assign({ id: deps.idGenerator.newId() }, input),
      deps.audit.forCreate()
    );
    DeviceManagement.Application.EquipmentSupportService.prepare(deps, row);
    deps.repository.append(row);
    return row;
  }
};
