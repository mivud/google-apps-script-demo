// Audit fields the backend fills on every identity resource; clients never send them.
// Datetimes are UTC with a "+00:00" offset.
export interface Audit {
  created: string
  createdBy: string
  lastModified: string
  lastModifiedBy: string
}

// Wire/row shape (snake_case), identical in Sheets payloads and Postgres columns.
export interface AuditRow {
  created: string
  created_by: string
  last_modified: string
  last_modified_by: string
}

export function rowToAudit(row: AuditRow): Audit {
  return {
    created: row.created,
    createdBy: row.created_by,
    lastModified: row.last_modified,
    lastModifiedBy: row.last_modified_by,
  }
}
