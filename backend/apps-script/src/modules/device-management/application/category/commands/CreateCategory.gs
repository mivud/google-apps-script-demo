// deps: { repository, audit, idGenerator } (ports).
DeviceManagement.Application.CreateCategory = {
  execute: function (deps, input) {
    var Category = DeviceManagement.Domain.Category;
    var row = Category.newRow(
      { id: deps.idGenerator.newId(), parentId: input.parentId, name: input.name },
      deps.audit.forCreate()
    );
    Category.validate(row, deps.repository.readAll());
    deps.repository.append(row);
    return row;
  }
};
