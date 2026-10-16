// Pure maintenance-log rules: no Google API, no ports.
DeviceManagement.Domain.MaintenanceLog = {
  TYPES: ['new', 'repair', 'replacement', 'maintenance'],
  MESSAGE: {
    INVALID_TYPE: 'invalid maintenance type',
    INVALID_DATE: 'invalid date',
    NOTE_MUST_BE_STRING: 'note must be a string'
  },

  newRow: function (attrs, auditFields) {
    var row = {
      id: attrs.id,
      equipment_id: attrs.equipmentId,
      type: attrs.type,
      performed_at: attrs.performedAt,
      note: attrs.note === undefined ? '' : attrs.note
    };
    return Object.assign(row, auditFields);
  },

  assertType: function (type) {
    if (DeviceManagement.Domain.MaintenanceLog.TYPES.indexOf(type) === -1) throw ApiError.validation(DeviceManagement.Domain.MaintenanceLog.MESSAGE.INVALID_TYPE);
  },

  assertNote: function (note) {
    if (note !== undefined && typeof note !== 'string') throw ApiError.validation(DeviceManagement.Domain.MaintenanceLog.MESSAGE.NOTE_MUST_BE_STRING);
  },

  // A blank value falls back to the caller-supplied timestamp ("now" comes from the Clock port).
  normalizePerformedAt: function (value, fallbackTimestamp) {
    if (value === undefined || value === null || value === '') return fallbackTimestamp;
    if (typeof value !== 'string' && typeof value !== 'number') throw ApiError.validation(DeviceManagement.Domain.MaintenanceLog.MESSAGE.INVALID_DATE);
    var date = new Date(value);
    if (isNaN(date.getTime())) throw ApiError.validation(DeviceManagement.Domain.MaintenanceLog.MESSAGE.INVALID_DATE);
    return AuditRules.formatUtc(date);
  },

  // performed_at DESC, then id ASC as a stable tie-breaker.
  compare: function (a, b) {
    if (a.performed_at !== b.performed_at) return a.performed_at < b.performed_at ? 1 : -1;
    return a.id < b.id ? -1 : 1;
  }
};
