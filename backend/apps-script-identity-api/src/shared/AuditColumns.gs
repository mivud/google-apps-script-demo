// Maps the four audit columns between sheet rows / JSON (snake_case) and the domain audit object.
var AuditColumns = {
  HEADERS: ['created', 'created_by', 'last_modified', 'last_modified_by'],

  fromRow: function (row) {
    return { created: row.created, createdBy: row.created_by, lastModified: row.last_modified, lastModifiedBy: row.last_modified_by };
  },

  toRow: function (audit) {
    return { created: audit.created, created_by: audit.createdBy, last_modified: audit.lastModified, last_modified_by: audit.lastModifiedBy };
  }
};
