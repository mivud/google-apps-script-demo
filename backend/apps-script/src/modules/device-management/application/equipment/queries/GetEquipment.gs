// deps: { repository } (port).
DeviceManagement.Application.GetEquipment = {
  execute: function (deps, input) {
    var found = deps.repository.findById(input.id);
    return found ? DeviceManagement.Domain.Equipment.fromStored(found.row) : null;
  }
};
