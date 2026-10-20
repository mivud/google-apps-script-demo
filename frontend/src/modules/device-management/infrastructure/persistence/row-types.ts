// Both backends expose snake_case rows (Postgres columns == Sheet headers).
export interface EquipmentRow {
  id: string
  category_id: string | null
  name: string
  description: string
  status: string
  quantity: number
  // Sheets may return '' for an empty cell; mappers normalize it to null.
  purchase_date?: string | null
  warranty_months?: number | string | null
  // Derived server-side; read-only for clients.
  warranty_expiry_date?: string | null
  note?: string | null
  vendor?: string | null
  created_at: string
  modified_at: string
  created_by: string
  last_modified_by: string
}

export interface MaintenanceLogRow {
  id: string
  equipment_id: string
  type: string
  performed_at: string
  note: string
  vendor?: string | null
  created_at: string
  modified_at: string
  created_by: string
  last_modified_by: string
}

export interface CategoryRow {
  id: string
  parent_id: string | null
  name: string
  created_at: string
  modified_at: string
  created_by: string
  last_modified_by: string
}
