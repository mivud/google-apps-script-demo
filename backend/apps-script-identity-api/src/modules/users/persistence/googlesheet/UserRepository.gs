// Sheet-backed user repository over `users`, `user_roles` and `user_claims`. It loads and saves whole User aggregates.
// Reads use the shared row cache; every write goes through SpreadsheetTable, which clears the cache entry.
Users.Persistence.GoogleSheet.UserRepository = {
  SCHEMA: {
    sheetName: 'users',
    headers: ['id', 'email', 'role', 'active'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  ROLES_SCHEMA: {
    sheetName: 'user_roles',
    headers: ['user_id', 'role_id'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  CLAIMS_SCHEMA: {
    sheetName: 'user_claims',
    headers: ['user_id', 'key', 'value'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  create: function (source, cache) {
    var repository = Users.Persistence.GoogleSheet.UserRepository;
    var mapper = Users.Persistence.GoogleSheet.UserRowMapper;
    var usersTable = new SpreadsheetTable(source, repository.SCHEMA, cache);
    var rolesTable = new SpreadsheetTable(source, repository.ROLES_SCHEMA, cache);
    var claimsTable = new SpreadsheetTable(source, repository.CLAIMS_SCHEMA, cache);

    var hasId = function (id) { return function (row) { return String(row.id).toLowerCase() === id; }; };
    var ownedBy = function (id) { return function (row) { return String(row.user_id).toLowerCase() === id; }; };
    var sameRole = function (userId, roleId) {
      return function (row) { return ownedBy(userId)(row) && String(row.role_id).toLowerCase() === roleId; };
    };
    var hasClaim = function (claim) {
      return function (row) { return row.key === claim.key && row.value === claim.value; };
    };
    var sameClaim = function (userId, claim) {
      return function (row) { return ownedBy(userId)(row) && hasClaim(claim)(row); };
    };
    var list = function () {
      var roleRows = rolesTable.readAll();
      var claimRows = claimsTable.readAll();
      return usersTable.readAll().map(function (row) {
        var id = String(row.id).toLowerCase();
        var roleIds = roleRows.filter(ownedBy(id)).map(function (own) { return String(own.role_id).toLowerCase(); });
        return mapper.toUser(row, roleIds, ClaimOrder.distinctSorted(claimRows.filter(ownedBy(id))));
      });
    };

    return {
      list: list,
      findById: function (id) {
        return list().filter(function (user) { return user.id === id; })[0] || null;
      },
      // Takes raw text; an unreadable email simply matches nobody.
      findByEmail: function (raw) {
        var email = Users.Domain.Email.normalize(raw);
        return email ? (list().filter(function (user) { return user.email === email; })[0] || null) : null;
      },
      insert: function (user) {
        usersTable.append(mapper.toRow(user));
        user.roleIds.forEach(function (roleId) { rolesTable.append(mapper.toRoleRow(user.id, roleId, user.audit)); });
      },
      update: function (user) {
        var found = TableRows.locate(usersTable, hasId(user.id));
        if (found) usersTable.update(found.index, mapper.toRow(user));
      },
      // Children first, so a failure midway never leaves assignments pointing at a missing user.
      delete: function (id) {
        rolesTable.deleteWhere(ownedBy(id));
        claimsTable.deleteWhere(ownedBy(id));
        var found = TableRows.locate(usersTable, hasId(id));
        if (found) usersTable.deleteAt(found.index);
      },
      addRole: function (userId, roleId, audit) {
        rolesTable.append(mapper.toRoleRow(userId, roleId, audit));
      },
      removeRole: function (userId, roleId) {
        var found = TableRows.locate(rolesTable, sameRole(userId, roleId));
        if (found) rolesTable.deleteAt(found.index);
      },
      addClaim: function (userId, claim, audit) {
        claimsTable.append(mapper.toClaimRow(userId, claim, audit));
      },
      removeClaim: function (userId, claim) {
        var found = TableRows.locate(claimsTable, sameClaim(userId, claim));
        if (found) claimsTable.deleteAt(found.index);
      },
      isRoleAssigned: function (roleId) {
        return rolesTable.readAll().some(function (row) { return String(row.role_id).toLowerCase() === roleId; });
      },
      isClaimInUse: function (claim) {
        return claimsTable.readAll().some(hasClaim(claim));
      }
    };
  }
};
