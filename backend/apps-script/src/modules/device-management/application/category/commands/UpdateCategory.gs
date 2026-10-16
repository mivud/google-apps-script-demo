// deps: { repository, audit } (ports).
DeviceManagement.Application.UpdateCategory = {
  execute: function (deps, input) {
    var Category = DeviceManagement.Domain.Category;
    var found = DeviceManagement.Application.CategorySupportService.requireExisting(deps, input.id);
    PatchSupport.assertObjectOrAbsent(input.patch);
    var row = found.row;
    PatchSupport.apply(row, input.patch, {
      keys: Category.PATCHABLE_FIELDS,
      nullAsEmpty: Category.PATCHABLE_FIELDS
    });
    Category.validate(row, deps.repository.readAll());
    deps.audit.touch(row);
    deps.repository.update(found.index, row);
    return row;
  }
};
