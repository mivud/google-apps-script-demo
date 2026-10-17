import { toIdentityError } from '../../../shared/api/identity-errors'
import type { ProviderConfig } from '../../../shared/api/provider-config'
import { SheetsCaller } from '../../../shared/api/sheets-caller'
import type { UserRepository } from '../application/user-repository'
import { UserService } from '../application/user-service'
import { UserSheetsRepository } from './persistence/googlesheet/user-sheets-repository'
import { UserSupabaseRepository } from './persistence/supabase/user-supabase-repository'

function createRepository(config: ProviderConfig): UserRepository {
  switch (config.provider) {
    case 'sheets':
      return new UserSheetsRepository(new SheetsCaller(config, toIdentityError))
    case 'supabase':
      return new UserSupabaseRepository(config.client)
  }
}

// The only place that maps a provider choice to its user adapter.
export function createUserService(config: ProviderConfig): UserService {
  return new UserService(createRepository(config))
}
