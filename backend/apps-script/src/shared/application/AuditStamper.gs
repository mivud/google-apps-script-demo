// Binds the Clock and CurrentUser ports to the pure audit rules.
var AuditStamper = {
  create: function (deps) {
    function nowUtc() {
      return AuditRules.formatUtc(deps.clock.now());
    }
    return {
      nowUtc: nowUtc,
      forCreate: function () {
        return AuditRules.creationFields(nowUtc(), deps.currentUser.id());
      },
      touch: function (row) {
        AuditRules.applyModification(row, nowUtc(), deps.currentUser.id());
      }
    };
  }
};
