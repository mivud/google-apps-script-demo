// Use case: change a user's email or active flag (active=false is "deactivate").
// deps: { users, lockout, authorizer, audit }. input: { idToken, id, email, active, expectedLastModified }.
Users.Application.UpdateUser = {
  execute: function (deps, input) {
    var support = Users.Application.UserSupportService;
    var actor = deps.authorizer.requireWrite(input.idToken).email;
    var user = support.requireUser(deps, input.id);
    IdentityAuditStamper.assertUnchanged(user.audit, input.expectedLastModified);
    var updated = Users.Domain.User.edit(user, {
      email: input.email,
      active: input.active,
      audit: deps.audit.modified(user.audit, actor)
    });
    support.assertEmailFree(deps, updated.email, user.id);
    deps.lockout.assertAllowed({ before: user, after: updated, actorEmail: actor });
    deps.users.update(updated);
    return updated;
  }
};
