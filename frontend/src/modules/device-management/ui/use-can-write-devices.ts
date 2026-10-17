import { useHasPermission } from '../../access-control'
import { DEVICE_MGT_WRITE } from '../permissions'

export function useCanWriteDevices(): boolean {
  return useHasPermission(DEVICE_MGT_WRITE)
}
