import { createContext, useContext } from 'react'
import type { AccessPreviewService } from '../../modules/access-control'
import type { ClaimService } from '../../modules/claims'
import type { RoleService } from '../../modules/roles'
import type { UserService } from '../../modules/users'

export interface IdentityServices {
  claims: ClaimService
  roles: RoleService
  users: UserService
  access: AccessPreviewService
}

export const IdentityServicesContext = createContext<IdentityServices | undefined>(undefined)

export function useIdentityServices(): IdentityServices {
  const services = useContext(IdentityServicesContext)
  if (!services) throw new Error('useIdentityServices must be used inside IdentityServicesProvider')
  return services
}
