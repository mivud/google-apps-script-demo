// deps: { repository } (port).
DeviceManagement.Application.ListCategories = {
  execute: function (deps) {
    var rows = deps.repository.readAll();
    rows.sort(DeviceManagement.Domain.Category.compareByName);
    return rows;
  }
};
