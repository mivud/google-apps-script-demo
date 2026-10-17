// Generic sheet-backed store for one entity type. mapper: { toEntity(row), toRow(entity) }.
// toEntity may return null for invalid data (a hand-edited bad row); such rows are skipped, never crash a list.
// Reads use the shared row cache; writes locate the row on fresh data and go through SpreadsheetTable.
var EntityTable = {
  create: function (source, cache, schema, mapper) {
    var table = new SpreadsheetTable(source, schema, cache);
    var hasId = function (id) { return function (row) { return String(row.id).toLowerCase() === id; }; };
    var present = function (entity) { return entity !== null; };
    return {
      list: function () {
        return table.readAll().map(mapper.toEntity).filter(present);
      },
      findById: function (id) {
        var row = table.readAll().filter(hasId(id))[0];
        return row ? mapper.toEntity(row) : null;
      },
      anyRow: function (predicate) {
        return table.readAll().some(predicate);
      },
      insert: function (entity) {
        table.append(mapper.toRow(entity));
      },
      update: function (entity) {
        var found = TableRows.locate(table, hasId(entity.id));
        if (found) table.update(found.index, mapper.toRow(entity));
      },
      delete: function (id) {
        var found = TableRows.locate(table, hasId(id));
        if (found) table.deleteAt(found.index);
      }
    };
  }
};
