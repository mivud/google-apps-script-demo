// Apps Script action names, namespaced as <module>.<entity>.<action>.
export const ROLE_ACTIONS = {
  list: 'roles.role.list',
  get: 'roles.role.get',
  create: 'roles.role.create',
  update: 'roles.role.update',
  remove: 'roles.role.delete',
  addClaim: 'roles.roleClaim.add',
  removeClaim: 'roles.roleClaim.remove',
} as const
