// Entity (aggregate root): a named set of claims. Owns its claim list; built-in roles are protected.
// Functions are pure and return new objects; audit values are supplied by the caller.
Roles.Domain.Role = {
  BUILT_IN_NAMES: ['admin', 'viewer'],
  MAX_CLAIMS: 100,
  MAX_ROLES: 1000,

  assertCanCreate: function (existingCount) {
    if (existingCount >= Roles.Domain.Role.MAX_ROLES) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
  },

  withAudit: function (role, audit) {
    return Object.assign({}, role, { audit: audit });
  },

  isBuiltIn: function (role) {
    return Roles.Domain.Role.BUILT_IN_NAMES.indexOf(String(role.name).toLowerCase()) !== -1;
  },

  create: function (fields) {
    return {
      id: fields.id,
      name: Roles.Domain.RoleName.of(fields.name),
      description: Roles.Domain.RoleDescription.of(fields.description),
      claims: [],
      audit: fields.audit
    };
  },

  // A built-in role keeps its name (other code relies on it); its description may change.
  edit: function (role, fields) {
    var name = Roles.Domain.RoleName.of(fields.name);
    if (Roles.Domain.Role.isBuiltIn(role) && !Roles.Domain.RoleName.same(role.name, name)) {
      throw DomainError.create(DomainError.CODE.ROLE_PROTECTED);
    }
    return Object.assign({}, role, {
      name: name,
      description: Roles.Domain.RoleDescription.of(fields.description),
      audit: fields.audit
    });
  },

  assertCanDelete: function (role) {
    if (Roles.Domain.Role.isBuiltIn(role)) throw DomainError.create(DomainError.CODE.ROLE_PROTECTED);
  },

  hasClaim: function (role, claim) {
    return role.claims.some(function (own) { return ClaimOrder.same(own, claim); });
  },

  assertCanAddClaim: function (role) {
    if (role.claims.length >= Roles.Domain.Role.MAX_CLAIMS) throw DomainError.create(DomainError.CODE.LIMIT_EXCEEDED);
  },

  withClaim: function (role, claim) {
    return Object.assign({}, role, { claims: ClaimOrder.distinctSorted(role.claims.concat([claim])) });
  },

  withoutClaim: function (role, claim) {
    return Object.assign({}, role, {
      claims: role.claims.filter(function (own) { return !ClaimOrder.same(own, claim); })
    });
  }
};
