// Pure list rules: filtering, ordering and paging of equipment rows.
DeviceManagement.Domain.EquipmentCriteria = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  FIRST_PAGE: 1,
  MIN_PAGE_SIZE: 1,
  // These characters are filter syntax in the Postgres adapter; neutralized for parity.
  SEARCH_SYNTAX: /[,()%_\\]/g,
  CATEGORY_IDS_MESSAGE: 'categoryIds must be an array',

  parse: function (input) {
    if (!Values.isNil(input.categoryIds) && !Array.isArray(input.categoryIds)) {
      throw ApiError.validation(DeviceManagement.Domain.EquipmentCriteria.CATEGORY_IDS_MESSAGE);
    }
    return {
      page: Math.max(DeviceManagement.Domain.EquipmentCriteria.FIRST_PAGE, Math.floor(Number(input.page)) || DeviceManagement.Domain.EquipmentCriteria.FIRST_PAGE),
      pageSize: DeviceManagement.Domain.EquipmentCriteria.clampPageSize(input.pageSize),
      search: DeviceManagement.Domain.EquipmentCriteria.normalizeSearch(input.search),
      status: input.status,
      categoryIds: DeviceManagement.Domain.EquipmentCriteria.categoryFilter(input.categoryIds)
    };
  },

  clampPageSize: function (raw) {
    var requested = Math.floor(Number(raw)) || DeviceManagement.Domain.EquipmentCriteria.DEFAULT_PAGE_SIZE;
    return Math.min(DeviceManagement.Domain.EquipmentCriteria.MAX_PAGE_SIZE, Math.max(DeviceManagement.Domain.EquipmentCriteria.MIN_PAGE_SIZE, requested));
  },

  normalizeSearch: function (raw) {
    if (Values.isNil(raw)) return '';
    return String(raw).replace(DeviceManagement.Domain.EquipmentCriteria.SEARCH_SYNTAX, ' ').trim().toLowerCase();
  },

  // null means "no category filter"; malformed ids become '' so they match nothing.
  categoryFilter: function (rawIds) {
    if (Values.isNil(rawIds) || rawIds.length === 0) return null;
    return rawIds.map(function (id) { return IdRules.normalize(id) || ''; });
  },

  matches: function (row, query) {
    if (query.categoryIds && query.categoryIds.indexOf(row.category_id) === -1) return false;
    if (query.status && row.status !== query.status) return false;
    return !query.search || DeviceManagement.Domain.EquipmentCriteria.textContains(row, query.search);
  },

  textContains: function (row, search) {
    return row.name.toLowerCase().indexOf(search) !== -1 || row.description.toLowerCase().indexOf(search) !== -1;
  },

  // Same ordering as the Postgres adapter: modified_at DESC, then id ASC as a stable tie-breaker.
  compare: function (a, b) {
    if (a.modified_at !== b.modified_at) return a.modified_at < b.modified_at ? 1 : -1;
    return a.id < b.id ? -1 : 1;
  },

  // An out-of-range page yields an empty slice while total stays correct.
  paginate: function (rows, query) {
    var start = (query.page - 1) * query.pageSize;
    return {
      items: rows.slice(start, start + query.pageSize),
      total: rows.length,
      page: query.page,
      pageSize: query.pageSize
    };
  }
};
