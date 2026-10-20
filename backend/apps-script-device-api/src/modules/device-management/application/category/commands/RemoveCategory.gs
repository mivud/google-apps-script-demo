// deps: { repository, equipmentUsage } (ports).
DeviceManagement.Application.RemoveCategory = {
  // Mirrors ON DELETE RESTRICT from Postgres.
  execute: function (deps, input) {
    var Category = DeviceManagement.Domain.Category;
    var found = DeviceManagement.Application.CategorySupportService.requireExisting(deps, input.id);
    if (Category.hasChildren(deps.repository.readAll(), found.row.id)) {
      throw ApiError.validation(Category.MESSAGE.HAS_CHILDREN);
    }
    if (deps.equipmentUsage.isCategoryInUse(found.row.id)) {
      throw ApiError.validation(Category.MESSAGE.IN_USE);
    }
    deps.repository.deleteAt(found.index);
    return null;
  }
};
