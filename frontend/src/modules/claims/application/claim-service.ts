import { sortClaims, validateClaim, type Claim } from '../domain/claim'
import type { ClaimRepository } from './claim-repository'

export class ClaimService {
  private readonly repository: ClaimRepository

  constructor(repository: ClaimRepository) {
    this.repository = repository
  }

  async list(): Promise<Claim[]> {
    return sortClaims(await this.repository.listClaims())
  }

  // async so validation errors surface as rejected promises, not sync throws.
  async create(claim: Claim): Promise<Claim> {
    return this.repository.createClaim(validateClaim(claim))
  }

  async remove(claim: Claim): Promise<void> {
    await this.repository.removeClaim(validateClaim(claim))
  }
}
