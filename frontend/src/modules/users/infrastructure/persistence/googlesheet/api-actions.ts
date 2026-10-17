// Apps Script action names, namespaced as <module>.<entity>.<action>.
export const USER_ACTIONS = {
  list: 'users.user.list',
  get: 'users.user.get',
  create: 'users.user.create',
  update: 'users.user.update',
  remove: 'users.user.delete',
  assignRole: 'users.userRole.assign',
  unassignRole: 'users.userRole.unassign',
  addClaim: 'users.userClaim.add',
  removeClaim: 'users.userClaim.remove',
} as const
