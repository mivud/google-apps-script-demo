import type { EffectiveAccess } from '../domain/effective-access'
import type { AccessPreviewRepository } from './access-preview-repository'

// Admin-only view of what a user would get on sign-in; the backend enforces the admin check.
export class AccessPreviewService {
  private readonly repository: AccessPreviewRepository

  constructor(repository: AccessPreviewRepository) {
    this.repository = repository
  }

  preview(userId: string): Promise<EffectiveAccess> {
    return this.repository.previewAccess(userId)
  }
}
