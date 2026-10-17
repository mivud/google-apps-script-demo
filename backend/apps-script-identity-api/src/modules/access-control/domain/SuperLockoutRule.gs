// Domain service (pure): keeps at least one active super and stops the caller from locking themself out.
// A snapshot is { email, active, isSuper }; `after` is null when the user is deleted.
AccessControl.Domain.SuperLockoutRule = {
  isActiveSuper: function (snapshot) {
    return !!snapshot && snapshot.active && snapshot.isSuper;
  },

  // change: { before, after, actorEmail, activeSuperCount }. Throws last_super or self_lockout.
  assertAllowed: function (change) {
    var rule = AccessControl.Domain.SuperLockoutRule;
    if (!rule.isActiveSuper(change.before)) return;
    var losesSuper = !rule.isActiveSuper(change.after);
    if (losesSuper && change.activeSuperCount <= 1) throw DomainError.create(DomainError.CODE.LAST_SUPER);
    // Changing their own email would also cut off the caller: the token email would no longer match.
    var changesEmail = !!change.after && change.after.email !== change.before.email;
    if ((losesSuper || changesEmail) && change.before.email === change.actorEmail) {
      throw DomainError.create(DomainError.CODE.SELF_LOCKOUT);
    }
  }
};
