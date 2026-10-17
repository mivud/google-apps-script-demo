import type { SupabaseClient } from '@supabase/supabase-js'
import { toSupabaseIdentityError } from '../../../../../shared/api/identity-errors'
import type { ClaimRepository } from '../../../application/claim-repository'
import type { Claim } from '../../../domain/claim'
import { claimToRow, rowsToClaims, rowToClaim, type ClaimRow } from '../claim-rows'

// Admin writes go through RLS; no service key is ever used in the browser.
export class ClaimSupabaseRepository implements ClaimRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listClaims(): Promise<Claim[]> {
    const { data, error } = await this.client.from('claims').select('key,value').order('key').order('value')
    if (error) throw toSupabaseIdentityError(error)
    return rowsToClaims(data)
  }

  async createClaim(claim: Claim): Promise<Claim> {
    const { data, error } = await this.client.from('claims').insert(claimToRow(claim)).select('key,value').single()
    if (error) throw toSupabaseIdentityError(error, 'claim_duplicate')
    return rowToClaim(data as ClaimRow)
  }

  async removeClaim(claim: Claim): Promise<void> {
    const { error } = await this.client.from('claims').delete().eq('key', claim.key).eq('value', claim.value)
    if (error) throw toSupabaseIdentityError(error)
  }
}
