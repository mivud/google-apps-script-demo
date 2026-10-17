// Pure equipment row rules: no Google API, no ports.
DeviceManagement.Domain.Equipment = {
  ENTITY_LABEL: 'Equipment',
  STATUSES: ['active', 'in_repair', 'retired'],
  DEFAULT_STATUS: 'active',
  DEFAULT_QUANTITY: 1,
  TEXT_FIELDS: ['name', 'description'],
  PATCHABLE_FIELDS: ['category_id', 'name', 'description', 'status', 'quantity'],
  NULLABLE_PATCH_FIELDS: ['category_id'],
  MESSAGE: {
    MUST_BE_STRING_SUFFIX: ' must be a string',
    NAME_REQUIRED: 'name is required',
    INVALID_STATUS: 'invalid status',
    INVALID_QUANTITY: 'quantity must be an integer >= 0',
    CATEGORY_ID_MUST_BE_STRING: 'category_id must be a string'
  },

  newRow: function (attrs, auditFields) {
    var row = {
      id: attrs.id,
      category_id: Values.isNil(attrs.categoryId) ? '' : attrs.categoryId,
      name: attrs.name === undefined ? '' : attrs.name,
      description: attrs.description === undefined ? '' : attrs.description,
      status: attrs.status === undefined ? DeviceManagement.Domain.Equipment.DEFAULT_STATUS : attrs.status,
      quantity: attrs.quantity === undefined ? DeviceManagement.Domain.Equipment.DEFAULT_QUANTITY : attrs.quantity
    };
    return Object.assign(row, auditFields);
  },

  // Shape rules only; the category lookup is an application concern.
  validate: function (row) {
    DeviceManagement.Domain.Equipment.TEXT_FIELDS.forEach(function (key) {
      if (typeof row[key] !== 'string') throw ApiError.validation(key + DeviceManagement.Domain.Equipment.MESSAGE.MUST_BE_STRING_SUFFIX);
    });
    if (row.name.trim() === '') throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.NAME_REQUIRED);
    if (DeviceManagement.Domain.Equipment.STATUSES.indexOf(row.status) === -1) throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.INVALID_STATUS);
    if (!DeviceManagement.Domain.Equipment.isValidQuantity(row.quantity)) throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.INVALID_QUANTITY);
  },

  isValidQuantity: function (quantity) {
    return typeof quantity === 'number' && quantity % 1 === 0 && quantity >= 0;
  },

  assertCategoryIdIsText: function (value) {
    if (typeof value !== 'string') throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.CATEGORY_ID_MUST_BE_STRING);
  },

  trimText: function (row) {
    DeviceManagement.Domain.Equipment.TEXT_FIELDS.forEach(function (key) { row[key] = row[key].trim(); });
  }
};
