import { toIdentityError } from '../../../shared/api/identity-errors'
import type { ProviderConfig } from '../../../shared/api/provider-config'
import { SheetsCaller } from '../../../shared/api/sheets-caller'
import { ClaimService } from '../application/claim-service'
import type { ClaimRepository } from '../application/claim-repository'
import { ClaimSheetsRepository } from './persistence/googlesheet/claim-sheets-repository'
import { ClaimSupabaseRepository } from './persistence/supabase/claim-supabase-repository'

function createRepository(config: ProviderConfig): ClaimRepository {
  switch (config.provider) {
    case 'sheets':
      return new ClaimSheetsRepository(new SheetsCaller(config, toIdentityError))
    case 'supabase':
      return new ClaimSupabaseRepository(config.client)
  }
}

// The only place that maps a provider choice to its claim adapter.
export function createClaimService(config: ProviderConfig): ClaimService {
  return new ClaimService(createRepository(config))
}
