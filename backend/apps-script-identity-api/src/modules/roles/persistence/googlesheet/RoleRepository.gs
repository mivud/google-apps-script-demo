// Sheet-backed role repository over `roles` and `role_claims`. It loads and saves whole Role aggregates.
// Reads use the shared row cache; every write goes through SpreadsheetTable, which clears the cache entry.
Roles.Persistence.GoogleSheet.RoleRepository = {
  SCHEMA: {
    sheetName: 'roles',
    headers: ['id', 'name', 'description'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  CLAIMS_SCHEMA: {
    sheetName: 'role_claims',
    headers: ['role_id', 'key', 'value'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  create: function (source, cache) {
    var repository = Roles.Persistence.GoogleSheet.RoleRepository;
    var mapper = Roles.Persistence.GoogleSheet.RoleRowMapper;
    var rolesTable = new SpreadsheetTable(source, repository.SCHEMA, cache);
    var claimsTable = new SpreadsheetTable(source, repository.CLAIMS_SCHEMA, cache);

    var hasId = function (id) { return function (row) { return String(row.id).toLowerCase() === id; }; };
    var ownedBy = function (id) { return function (row) { return String(row.role_id).toLowerCase() === id; }; };
    var sameClaim = function (id, claim) {
      return function (row) { return ownedBy(id)(row) && row.key === claim.key && row.value === claim.value; };
    };
    var list = function () {
      var claimRows = claimsTable.readAll();
      return rolesTable.readAll().map(function (row) {
        var id = String(row.id).toLowerCase();
        return mapper.toRole(row, ClaimOrder.distinctSorted(claimRows.filter(ownedBy(id))));
      }).sort(function (a, b) { return ClaimOrder.compareText(a.name, b.name); });
    };

    return {
      list: list,
      findById: function (id) {
        return list().filter(function (role) { return role.id === id; })[0] || null;
      },
      findByName: function (name) {
        return list().filter(function (role) { return Roles.Domain.RoleName.same(role.name, name); })[0] || null;
      },
      exists: function (id) {
        return rolesTable.readAll().some(hasId(id));
      },
      isEmpty: function () {
        return rolesTable.loadRows().length === 0;
      },
      insert: function (role) {
        rolesTable.append(mapper.toRow(role));
      },
      update: function (role) {
        var found = TableRows.locate(rolesTable, hasId(role.id));
        if (found) rolesTable.update(found.index, mapper.toRow(role));
      },
      // Children first, so a failure midway never leaves claim rows pointing at a missing role.
      delete: function (id) {
        claimsTable.deleteWhere(ownedBy(id));
        var found = TableRows.locate(rolesTable, hasId(id));
        if (found) rolesTable.deleteAt(found.index);
      },
      addClaim: function (roleId, claim, audit) {
        claimsTable.append(mapper.toClaimRow(roleId, claim, audit));
      },
      removeClaim: function (roleId, claim) {
        var found = TableRows.locate(claimsTable, sameClaim(roleId, claim));
        if (found) claimsTable.deleteAt(found.index);
      },
      isClaimInUse: function (claim) {
        return claimsTable.readAll().some(function (row) { return row.key === claim.key && row.value === claim.value; });
      }
    };
  }
};
