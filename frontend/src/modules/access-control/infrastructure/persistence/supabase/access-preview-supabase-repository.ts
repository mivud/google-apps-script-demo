import type { SupabaseClient } from '@supabase/supabase-js'
import { toSupabaseIdentityError } from '../../../../../shared/api/identity-errors'
import { NotFoundError } from '../../../../../shared/errors'
import type { AccessPreviewRepository } from '../../../application/access-preview-repository'
import { parseEffectiveAccess, type EffectiveAccess } from '../../../domain/effective-access'

const PREVIEW_ACCESS_RPC = 'preview_access'

export class AccessPreviewSupabaseRepository implements AccessPreviewRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async previewAccess(userId: string): Promise<EffectiveAccess> {
    const { data, error } = await this.client.rpc(PREVIEW_ACCESS_RPC, { p_user_id: userId })
    if (error) throw toSupabaseIdentityError(error)
    if (!data) throw new NotFoundError()
    return parseEffectiveAccess(data)
  }
}
