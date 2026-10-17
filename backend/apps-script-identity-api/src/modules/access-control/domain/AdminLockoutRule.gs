// Domain service (pure): keeps at least one active admin and stops the caller from locking themself out.
// A snapshot is { email, active, role } (role = primary role); `after` is null when the user is deleted.
AccessControl.Domain.AdminLockoutRule = {
  isActiveAdmin: function (snapshot) {
    return !!snapshot && snapshot.active && snapshot.role === AccessControl.Domain.PrimaryRole.ADMIN;
  },

  // change: { before, after, actorEmail, activeAdminCount }. Throws last_admin or self_lockout.
  assertAllowed: function (change) {
    var rule = AccessControl.Domain.AdminLockoutRule;
    if (!rule.isActiveAdmin(change.before)) return;
    var losesAdmin = !rule.isActiveAdmin(change.after);
    if (losesAdmin && change.activeAdminCount <= 1) throw DomainError.create(DomainError.CODE.LAST_ADMIN);
    // Changing their own email would also cut off the caller: the token email would no longer match.
    var changesEmail = !!change.after && change.after.email !== change.before.email;
    if ((losesAdmin || changesEmail) && change.before.email === change.actorEmail) {
      throw DomainError.create(DomainError.CODE.SELF_LOCKOUT);
    }
  }
};
