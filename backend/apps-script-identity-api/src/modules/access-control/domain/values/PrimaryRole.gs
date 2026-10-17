// Value object: the primary role shown to clients: `super` when held (exact, case-sensitive), else the first role
// name in sorted order, else '' (no roles).
AccessControl.Domain.PrimaryRole = {
  SUPER: 'super',
  NONE: '',

  fromRoleNames: function (roleNames) {
    var role = AccessControl.Domain.PrimaryRole;
    if (roleNames.indexOf(role.SUPER) !== -1) return role.SUPER;
    var sorted = roleNames.slice().sort(ClaimOrder.compareText);
    return sorted.length > 0 ? sorted[0] : role.NONE;
  }
};
