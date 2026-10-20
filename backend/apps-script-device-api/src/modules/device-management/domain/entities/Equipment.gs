// Pure equipment row rules: no Google API, no ports.
DeviceManagement.Domain.Equipment = {
  ENTITY_LABEL: 'Equipment',
  STATUSES: ['active', 'in_repair', 'retired'],
  DEFAULT_STATUS: 'active',
  DEFAULT_QUANTITY: 1,
  TEXT_FIELDS: ['name', 'description'],
  PURCHASE_DATE_LIMIT: { max: 10, code: 'purchase_date_invalid' },
  NOTE_LIMIT: { max: 2000, code: 'note_too_long' },
  VENDOR_LIMIT: { max: 200, code: 'vendor_too_long' },
  // warranty_expiry_date is derived and server-owned, so it is deliberately not patchable.
  PATCHABLE_FIELDS: ['category_id', 'name', 'description', 'status', 'quantity',
    'purchase_date', 'warranty_months', 'note', 'vendor'],
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
      quantity: attrs.quantity === undefined ? DeviceManagement.Domain.Equipment.DEFAULT_QUANTITY : attrs.quantity,
      purchase_date: Values.isNil(attrs.purchaseDate) ? null : attrs.purchaseDate,
      warranty_months: Values.isNil(attrs.warrantyMonths) ? null : attrs.warrantyMonths,
      warranty_expiry_date: null,
      note: Values.isNil(attrs.note) ? null : attrs.note,
      vendor: Values.isNil(attrs.vendor) ? null : attrs.vendor
    };
    return Object.assign(row, auditFields);
  },

  // Sheet rows read empty optional cells as '' and months as text; give the API real nulls and numbers.
  fromStored: function (row) {
    var OptionalText = DeviceManagement.Domain.OptionalText;
    var copy = Object.assign({}, row);
    ['purchase_date', 'warranty_expiry_date', 'note', 'vendor'].forEach(function (key) {
      copy[key] = OptionalText.fromStored(row[key]);
    });
    var months = OptionalText.fromStored(row.warranty_months);
    copy.warranty_months = months === null ? null : Number(months);
    return copy;
  },

  // Shape rules only; the category lookup is an application concern.
  validate: function (row) {
    DeviceManagement.Domain.Equipment.TEXT_FIELDS.forEach(function (key) {
      if (typeof row[key] !== 'string') throw ApiError.validation(key + DeviceManagement.Domain.Equipment.MESSAGE.MUST_BE_STRING_SUFFIX);
    });
    if (row.name.trim() === '') throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.NAME_REQUIRED);
    if (DeviceManagement.Domain.Equipment.STATUSES.indexOf(row.status) === -1) throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.INVALID_STATUS);
    if (!DeviceManagement.Domain.Equipment.isValidQuantity(row.quantity)) throw ApiError.validation(DeviceManagement.Domain.Equipment.MESSAGE.INVALID_QUANTITY);
    DeviceManagement.Domain.Equipment.normalizeOptionalFields(row);
    DeviceManagement.Domain.WarrantyPeriod.validate(row.purchase_date, row.warranty_months);
  },

  // Blank optional values become null; months '' is treated as absent, other types fail in the warranty rules.
  normalizeOptionalFields: function (row) {
    var Equipment = DeviceManagement.Domain.Equipment;
    var OptionalText = DeviceManagement.Domain.OptionalText;
    var WarrantyPeriod = DeviceManagement.Domain.WarrantyPeriod;
    if (!Values.isNil(row.purchase_date) && typeof row.purchase_date !== 'string') {
      throw ApiError.validation(WarrantyPeriod.MESSAGE.INVALID_DATE);
    }
    row.purchase_date = OptionalText.normalize(row.purchase_date, 'purchase_date', Equipment.PURCHASE_DATE_LIMIT);
    row.note = OptionalText.normalize(row.note, 'note', Equipment.NOTE_LIMIT);
    row.vendor = OptionalText.normalize(row.vendor, 'vendor', Equipment.VENDOR_LIMIT);
    row.warranty_months = Values.isNil(row.warranty_months) || row.warranty_months === '' ? null : row.warranty_months;
  },

  // Server-owned: always recomputed from the validated purchase date and months.
  deriveWarrantyExpiry: function (row) {
    row.warranty_expiry_date = DeviceManagement.Domain.WarrantyPeriod.expiryDate(row.purchase_date, row.warranty_months);
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
