// Sheet-backed claim catalog: { list, exists, add, remove }. Rows are keyed by (key, value).
Claims.Persistence.GoogleSheet.ClaimRepository = {
  SCHEMA: {
    sheetName: 'claims',
    headers: ['key', 'value'].concat(AuditColumns.HEADERS),
    numericColumns: []
  },

  create: function (source, cache) {
    var repository = Claims.Persistence.GoogleSheet.ClaimRepository;
    var table = new SpreadsheetTable(source, repository.SCHEMA, cache);
    var matches = function (claim) {
      return function (row) { return row.key === claim.key && row.value === claim.value; };
    };
    return {
      list: function () {
        return ClaimOrder.distinctSorted(table.readAll());
      },
      exists: function (claim) {
        return table.readAll().some(matches(claim));
      },
      add: function (claim, audit) {
        table.append(Object.assign({ key: claim.key, value: claim.value }, AuditColumns.toRow(audit)));
      },
      remove: function (claim) {
        var found = TableRows.locate(table, matches(claim));
        if (found) table.deleteAt(found.index);
      }
    };
  }
};
