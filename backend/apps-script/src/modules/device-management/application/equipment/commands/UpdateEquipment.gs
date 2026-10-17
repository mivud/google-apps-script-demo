// deps: { repository, audit, categoryLookup } (ports).
DeviceManagement.Application.UpdateEquipment = {
  execute: function (deps, input) {
    var Support = DeviceManagement.Application.EquipmentSupportService;
    var Equipment = DeviceManagement.Domain.Equipment;
    var found = Support.requireExisting(deps, input.id);
    PatchSupport.assertObjectOrAbsent(input.patch);
    var row = found.row;
    PatchSupport.apply(row, input.patch, {
      keys: Equipment.PATCHABLE_FIELDS,
      nullAsEmpty: Equipment.NULLABLE_PATCH_FIELDS
    });
    Support.prepare(deps, row);
    deps.audit.touch(row);
    deps.repository.update(found.index, row);
    return row;
  }
};
