import type { Page } from '../../../shared/page'
import type { Equipment, EquipmentStatus, NewEquipment } from '../domain/equipment'

export interface EquipmentQuery {
  search?: string
  // Exact ids to match; EquipmentService expands a parent category into its descendants.
  categoryIds?: string[]
  status?: EquipmentStatus
  page: number
  pageSize: number
}

// Default ordering for list(): modifiedAt DESC, identical in every adapter.
export interface EquipmentRepository {
  list(query: EquipmentQuery): Promise<Page<Equipment>>
  get(id: string): Promise<Equipment | null>
  create(input: NewEquipment): Promise<Equipment>
  update(id: string, patch: Partial<NewEquipment>): Promise<Equipment>
  remove(id: string): Promise<void>
}
