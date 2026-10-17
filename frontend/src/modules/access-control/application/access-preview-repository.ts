import type { EffectiveAccess } from '../domain/effective-access'

export interface AccessPreviewRepository {
  previewAccess(userId: string): Promise<EffectiveAccess>
}
