import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { NotFoundError } from '../../../../../shared/errors'
import type { AccessPreviewRepository } from '../../../application/access-preview-repository'
import { parseEffectiveAccess, type EffectiveAccess } from '../../../domain/effective-access'

const ACCESS_PREVIEW_ACTION = 'access-control.access.preview'

export class AccessPreviewFirebaseRepository implements AccessPreviewRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  async previewAccess(userId: string): Promise<EffectiveAccess> {
    const data = await this.caller.call<Record<string, unknown> | null>(ACCESS_PREVIEW_ACTION, { p_user_id: userId, user_id: userId })
    if (!data) throw new NotFoundError()
    return parseEffectiveAccess(data)
  }
}
