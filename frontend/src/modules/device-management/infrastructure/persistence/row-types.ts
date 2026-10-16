// Both backends expose snake_case rows (Postgres columns == Sheet headers).
export interface EquipmentRow {
  id: string
  category_id: string | null
  name: string
  description: string
  status: string
  quantity: number
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
