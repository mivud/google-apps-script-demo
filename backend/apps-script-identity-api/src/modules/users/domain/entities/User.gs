// Entity (aggregate root): a person allowed (or no longer allowed) to use the apps. Owns its role assignments and
// own claims. Pure functions returning new objects; `legacyRole` is the phase 1 column, kept as read, never set here.
Users.Domain.User = {
  MAX_ROLES: 20,
  MAX_OWN_CLAIMS: 100,
  MAX_USERS: 1000,

  assertCanCreate: function (existingCount) {
    if (existingCount >= Users.Domain.User.MAX_USERS) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
  },

  withAudit: function (user, audit) {
    return Object.assign({}, user, { audit: audit });
  },

  create: function (fields) {
    var User = Users.Domain.User;
    if (fields.roleIds.length > User.MAX_ROLES) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
    return {
      id: fields.id,
      email: Users.Domain.Email.of(fields.email),
      legacyRole: '',
      active: fields.active,
      roleIds: fields.roleIds.slice(),
      claims: [],
      audit: fields.audit
    };
  },

  edit: function (user, fields) {
    return Object.assign({}, user, { email: Users.Domain.Email.of(fields.email), active: fields.active, audit: fields.audit });
  },

  hasRole: function (user, roleId) {
    return user.roleIds.indexOf(roleId) !== -1;
  },

  assertCanAssignRole: function (user) {
    if (user.roleIds.length >= Users.Domain.User.MAX_ROLES) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
  },

  withRole: function (user, roleId) {
    return Object.assign({}, user, { roleIds: user.roleIds.concat([roleId]) });
  },

  withoutRole: function (user, roleId) {
    return Object.assign({}, user, { roleIds: user.roleIds.filter(function (id) { return id !== roleId; }) });
  },

  hasClaim: function (user, claim) {
    return user.claims.some(function (own) { return ClaimOrder.same(own, claim); });
  },

  assertCanAddClaim: function (user) {
    if (user.claims.length >= Users.Domain.User.MAX_OWN_CLAIMS) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
  },

  withClaim: function (user, claim) {
    return Object.assign({}, user, { claims: ClaimOrder.distinctSorted(user.claims.concat([claim])) });
  },

  withoutClaim: function (user, claim) {
    return Object.assign({}, user, {
      claims: user.claims.filter(function (own) { return !ClaimOrder.same(own, claim); })
    });
  }
};
