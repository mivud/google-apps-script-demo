// Public API of the roles module; other code imports only from here.
export type { Role, RoleInput } from './domain/role'
export { BUILT_IN_ROLE_NAMES, isBuiltInRoleName, validateRoleInput } from './domain/role'
export type { RoleRepository } from './application/role-repository'
export { RoleService } from './application/role-service'
export { createRoleService } from './infrastructure/create-role-service'
