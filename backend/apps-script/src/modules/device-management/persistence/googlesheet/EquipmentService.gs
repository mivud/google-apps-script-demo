// Sheet-backed implementations of the equipment ports.
DeviceManagement.Persistence.GoogleSheet.EquipmentService = {
  SCHEMA: {
    sheetName: 'equipment',
    // Optional columns are read as text ('' when empty) and mapped by Equipment.fromStored; SheetUpgrade adds
    // them to existing sheets by header name, and row writes keep the plain-text format so dates stay strings.
    headers: ['id', 'category_id', 'name', 'description', 'status', 'quantity',
      'purchase_date', 'warranty_months', 'warranty_expiry_date', 'note', 'vendor',
      'created_at', 'modified_at', 'created_by', 'last_modified_by'],
    numericColumns: ['quantity']
  },

  createRepository: function (source, cache) {
    return new SpreadsheetTable(source, DeviceManagement.Persistence.GoogleSheet.EquipmentService.SCHEMA, cache);
  },

  // EquipmentCategoryUsage port, provided to the category module.
  createCategoryUsage: function (repository) {
    return {
      isCategoryInUse: function (categoryId) {
        return repository.readAll().some(function (row) { return row.category_id === categoryId; });
      }
    };
  },

  // EquipmentLookup port, provided to the maintenance module.
  createLookup: function (repository) {
    return {
      requireExistingId: function (id) {
        var found = repository.findById(id);
        if (!found) throw ApiError.notFound(DeviceManagement.Domain.Equipment.ENTITY_LABEL, id);
        return found.row.id;
      }
    };
  }
};
