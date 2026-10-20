import { toIdentityError } from '../../../shared/api/identity-errors'
import type { ProviderConfig } from '../../../shared/api/provider-config'
import { SheetsCaller } from '../../../shared/api/sheets-caller'
import { FirebaseCaller } from '../../../shared/api/firebase-caller'
import { ClaimService } from '../application/claim-service'
import type { ClaimRepository } from '../application/claim-repository'
import { ClaimSheetsRepository } from './persistence/googlesheet/claim-sheets-repository'
import { ClaimSupabaseRepository } from './persistence/supabase/claim-supabase-repository'
import { ClaimFirebaseRepository } from './persistence/firebase/claim-firebase-repository'

function createRepository(config: ProviderConfig): ClaimRepository {
  switch (config.provider) {
    case 'sheets':
      return new ClaimSheetsRepository(new SheetsCaller(config, toIdentityError))
    case 'supabase':
      return new ClaimSupabaseRepository(config.client)
    case 'firebase':
      return new ClaimFirebaseRepository(new FirebaseCaller(config.handle, toIdentityError))
  }
}

// The only place that maps a provider choice to its claim adapter.
export function createClaimService(config: ProviderConfig): ClaimService {
  return new ClaimService(createRepository(config))
}
