// Audit values for the expense tables. An audit is { created, createdBy, lastModified, lastModifiedBy };
// the actor is always the verified token email, never a client value.
var ExpenseAuditStamper = {
  create: function (clock) {
    return {
      created: function (actor) {
        var now = AuditRules.formatUtc(clock.now());
        return { created: now, createdBy: actor, lastModified: now, lastModifiedBy: actor };
      },
      modified: function (audit, actor) {
        return {
          created: audit.created,
          createdBy: audit.createdBy,
          lastModified: AuditRules.formatUtc(clock.now()),
          lastModifiedBy: actor
        };
      }
    };
  },

  // Optimistic concurrency: the client must have seen the current last_modified value.
  assertUnchanged: function (audit, expectedLastModified) {
    if (audit.lastModified !== expectedLastModified) throw DomainError.create(DomainError.CODE.CONFLICT);
  }
};
