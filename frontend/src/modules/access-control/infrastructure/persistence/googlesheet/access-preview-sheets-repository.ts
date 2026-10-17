import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import type { AccessPreviewRepository } from '../../../application/access-preview-repository'
import { parseEffectiveAccess, type EffectiveAccess } from '../../../domain/effective-access'

export const ACCESS_PREVIEW_ACTION = 'access-control.access.preview'

export class AccessPreviewSheetsRepository implements AccessPreviewRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async previewAccess(userId: string): Promise<EffectiveAccess> {
    return parseEffectiveAccess(await this.caller.call<Record<string, unknown>>(ACCESS_PREVIEW_ACTION, { user_id: userId }))
  }
}
