// Shared steps of the equipment use cases. deps: { repository, categoryLookup } (ports).
DeviceManagement.Application.EquipmentSupportService = {
  // Validates, resolves the category last (shape errors win over the lookup), then trims.
  prepare: function (deps, row) {
    var Equipment = DeviceManagement.Domain.Equipment;
    Equipment.validate(row);
    row.category_id = DeviceManagement.Application.EquipmentSupportService.resolveCategoryId(deps, row.category_id);
    Equipment.trimText(row);
    Equipment.deriveWarrantyExpiry(row);
  },

  // Returns the normalized category id ('' when uncategorized); the lookup port throws NOT_FOUND.
  resolveCategoryId: function (deps, value) {
    DeviceManagement.Domain.Equipment.assertCategoryIdIsText(value);
    var trimmed = value.trim();
    return trimmed === '' ? '' : deps.categoryLookup.requireExistingId(trimmed);
  },

  requireExisting: function (deps, id) {
    var found = deps.repository.findById(id);
    if (!found) throw ApiError.notFound(DeviceManagement.Domain.Equipment.ENTITY_LABEL, id);
    return found;
  }
};
