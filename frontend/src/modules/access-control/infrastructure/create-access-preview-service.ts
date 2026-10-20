import { toIdentityError } from '../../../shared/api/identity-errors'
import type { ProviderConfig } from '../../../shared/api/provider-config'
import { SheetsCaller } from '../../../shared/api/sheets-caller'
import { FirebaseCaller } from '../../../shared/api/firebase-caller'
import { AccessPreviewService } from '../application/access-preview-service'
import type { AccessPreviewRepository } from '../application/access-preview-repository'
import { AccessPreviewSheetsRepository } from './persistence/googlesheet/access-preview-sheets-repository'
import { AccessPreviewSupabaseRepository } from './persistence/supabase/access-preview-supabase-repository'
import { AccessPreviewFirebaseRepository } from './persistence/firebase/access-preview-firebase-repository'

function createRepository(config: ProviderConfig): AccessPreviewRepository {
  switch (config.provider) {
    case 'sheets':
      return new AccessPreviewSheetsRepository(new SheetsCaller(config, toIdentityError))
    case 'supabase':
      return new AccessPreviewSupabaseRepository(config.client)
    case 'firebase':
      return new AccessPreviewFirebaseRepository(new FirebaseCaller(config.handle, toIdentityError))
  }
}

// The only place that maps a provider choice to its access preview adapter.
export function createAccessPreviewService(config: ProviderConfig): AccessPreviewService {
  return new AccessPreviewService(createRepository(config))
}
