// Sheet-backed implementations of the category ports.
DeviceManagement.Persistence.GoogleSheet.CategoryService = {
  SCHEMA: {
    sheetName: 'categories',
    headers: ['id', 'parent_id', 'name', 'created_at', 'modified_at', 'created_by', 'last_modified_by'],
    numericColumns: []
  },

  createRepository: function (source, cache) {
    return new SpreadsheetTable(source, DeviceManagement.Persistence.GoogleSheet.CategoryService.SCHEMA, cache);
  },

  // CategoryLookup port, provided to the equipment module.
  createLookup: function (repository) {
    return {
      requireExistingId: function (id) {
        var found = repository.findById(id);
        if (!found) throw ApiError.notFound(DeviceManagement.Domain.Category.ENTITY_LABEL, id);
        return found.row.id;
      }
    };
  },

  // RootCategoryResolver port: reuses root categories by name and creates the missing ones.
  // deps: { repository, audit, idGenerator }
  createRootResolver: function (deps) {
    var idByName = {};
    deps.repository.readAll().forEach(function (category) {
      if (category.parent_id === '') idByName[category.name.trim().toLowerCase()] = category.id;
    });
    return {
      idForName: function (rawName) {
        var name = String(rawName).trim();
        if (name === '') return '';
        var key = name.toLowerCase();
        if (!idByName[key]) idByName[key] = DeviceManagement.Persistence.GoogleSheet.CategoryService.appendRoot(deps, name);
        return idByName[key];
      }
    };
  },

  appendRoot: function (deps, name) {
    var row = DeviceManagement.Domain.Category.newRow(
      { id: deps.idGenerator.newId(), parentId: '', name: name },
      deps.audit.forCreate()
    );
    deps.repository.append(row);
    return row.id;
  }
};
