// Use case: give a catalog claim directly to a user. Adding a claim the user already has is a no-op.
// deps: { users, claimCatalog, authorizer, audit }. input: { idToken, userId, key, value }.
Users.Application.AddUserClaim = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireAdmin(input.idToken).email;
    var user = Users.Application.UserSupportService.requireUser(deps, input.userId);
    var claim = { key: input.key, value: input.value };
    if (!deps.claimCatalog.exists(claim)) throw DomainError.create(DomainError.CODE.CLAIM_UNKNOWN);
    if (Users.Domain.User.hasClaim(user, claim)) return user;
    Users.Domain.User.assertCanAddClaim(user);
    var updated = Users.Domain.User.withAudit(Users.Domain.User.withClaim(user, claim), deps.audit.modified(user.audit, actor));
    deps.users.addClaim(user.id, claim, deps.audit.created(actor));
    deps.users.update(updated);
    return updated;
  }
};
