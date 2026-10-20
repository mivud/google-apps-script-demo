// Shared steps of the category use cases. deps: { repository } (port).
DeviceManagement.Application.CategorySupportService = {
  requireExisting: function (deps, id) {
    var found = deps.repository.findById(id);
    if (!found) throw ApiError.notFound(DeviceManagement.Domain.Category.ENTITY_LABEL, id);
    return found;
  }
};
