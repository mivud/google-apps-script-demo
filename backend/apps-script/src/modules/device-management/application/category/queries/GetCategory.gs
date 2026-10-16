// deps: { repository } (port).
DeviceManagement.Application.GetCategory = {
  execute: function (deps, input) {
    var found = deps.repository.findById(input.id);
    return found ? found.row : null;
  }
};
