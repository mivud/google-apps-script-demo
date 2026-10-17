import { useHasPermission } from '../../modules/access-control'
import { IDENTITY_WRITE } from './permissions'

export function useCanWriteIdentity(): boolean {
  return useHasPermission(IDENTITY_WRITE)
}
