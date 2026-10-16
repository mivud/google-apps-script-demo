// Audit fields are server-owned: use cases copy only whitelisted client fields, so clients can never set them.
var AuditRules = {
  // UTC, millisecond precision, "+00:00" instead of "Z", so strings sort chronologically.
  formatUtc: function (date) {
    return date.toISOString().replace('Z', '+00:00');
  },

  creationFields: function (timestamp, user) {
    return { created_at: timestamp, modified_at: timestamp, created_by: user, last_modified_by: user };
  },

  applyModification: function (row, timestamp, user) {
    row.modified_at = timestamp;
    row.last_modified_by = user;
  }
};
