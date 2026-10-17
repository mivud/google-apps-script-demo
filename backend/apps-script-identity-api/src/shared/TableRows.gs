// Locates a sheet row by predicate on fresh (uncached) data, because writes address rows by position.
var TableRows = {
  FIRST_DATA_ROW: 2,

  locate: function (table, predicate) {
    var rows = table.loadRows();
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) return { index: i + TableRows.FIRST_DATA_ROW, row: rows[i] };
    }
    return null;
  }
};
