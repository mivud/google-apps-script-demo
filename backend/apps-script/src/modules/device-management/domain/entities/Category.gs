// Pure category rules: no Google API, no ports.
DeviceManagement.Domain.Category = {
  ENTITY_LABEL: 'Category',
  PATCHABLE_FIELDS: ['parent_id', 'name'],
  MESSAGE: {
    NAME_MUST_BE_STRING: 'name must be a string',
    PARENT_MUST_BE_STRING: 'parent_id must be a string',
    NAME_REQUIRED: 'category_name_required',
    NAME_DUPLICATE: 'category_name_duplicate',
    CYCLE: 'category_cycle',
    IN_USE: 'category_in_use',
    HAS_CHILDREN: 'category_has_children'
  },

  newRow: function (attrs, auditFields) {
    var row = {
      id: attrs.id,
      parent_id: Values.isNil(attrs.parentId) ? '' : attrs.parentId,
      name: attrs.name === undefined ? '' : attrs.name
    };
    return Object.assign(row, auditFields);
  },

  // Case-insensitive name, then id, so the order is deterministic and matches the Postgres adapter.
  compareByName: function (a, b) {
    var an = a.name.toLowerCase();
    var bn = b.name.toLowerCase();
    if (an !== bn) return an < bn ? -1 : 1;
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  },

  hasChildren: function (all, categoryId) {
    return all.some(function (category) { return category.parent_id === categoryId; });
  },

  // Normalizes the row in place (trimmed name, lowercase parent id) after checking every category rule.
  validate: function (row, all) {
    DeviceManagement.Domain.Category.assertTextFields(row);
    row.name = row.name.trim();
    if (row.name === '') throw ApiError.validation(DeviceManagement.Domain.Category.MESSAGE.NAME_REQUIRED);
    row.parent_id = DeviceManagement.Domain.Category.resolveParentId(row, all);
    DeviceManagement.Domain.Category.assertUniqueAmongSiblings(row, all);
  },

  assertTextFields: function (row) {
    if (typeof row.name !== 'string') throw ApiError.validation(DeviceManagement.Domain.Category.MESSAGE.NAME_MUST_BE_STRING);
    if (typeof row.parent_id !== 'string') throw ApiError.validation(DeviceManagement.Domain.Category.MESSAGE.PARENT_MUST_BE_STRING);
  },

  resolveParentId: function (row, all) {
    var parentId = row.parent_id.trim();
    if (parentId === '') return '';
    var normalized = IdRules.normalize(parentId);
    var byId = DeviceManagement.Domain.Category.indexById(all);
    if (!normalized || !byId[normalized]) throw ApiError.notFound(DeviceManagement.Domain.Category.ENTITY_LABEL, parentId);
    DeviceManagement.Domain.Category.assertNoCycle(row.id, normalized, byId);
    return normalized;
  },

  indexById: function (all) {
    var byId = {};
    all.forEach(function (category) { byId[category.id] = category; });
    return byId;
  },

  // Walk up from the new parent; reaching the row itself means a self-parent or descendant-parent.
  assertNoCycle: function (rowId, parentId, byId) {
    var seen = {};
    for (var cursor = parentId; cursor && byId[cursor] && !seen[cursor]; cursor = byId[cursor].parent_id) {
      if (cursor === rowId) throw ApiError.validation(DeviceManagement.Domain.Category.MESSAGE.CYCLE);
      seen[cursor] = true;
    }
  },

  assertUniqueAmongSiblings: function (row, all) {
    var key = row.name.toLowerCase();
    var duplicate = all.some(function (c) {
      return c.id !== row.id && c.parent_id === row.parent_id && c.name.trim().toLowerCase() === key;
    });
    if (duplicate) throw ApiError.validation(DeviceManagement.Domain.Category.MESSAGE.NAME_DUPLICATE);
  }
};
