import { toIdentityError } from '../../../shared/api/identity-errors'
import type { ProviderConfig } from '../../../shared/api/provider-config'
import { SheetsCaller } from '../../../shared/api/sheets-caller'
import type { RoleRepository } from '../application/role-repository'
import { RoleService } from '../application/role-service'
import { RoleSheetsRepository } from './persistence/googlesheet/role-sheets-repository'
import { RoleSupabaseRepository } from './persistence/supabase/role-supabase-repository'

function createRepository(config: ProviderConfig): RoleRepository {
  switch (config.provider) {
    case 'sheets':
      return new RoleSheetsRepository(new SheetsCaller(config, toIdentityError))
    case 'supabase':
      return new RoleSupabaseRepository(config.client)
  }
}

// The only place that maps a provider choice to its role adapter.
export function createRoleService(config: ProviderConfig): RoleService {
  return new RoleService(createRepository(config))
}
