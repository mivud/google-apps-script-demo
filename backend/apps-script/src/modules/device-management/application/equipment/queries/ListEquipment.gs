// deps: { repository } (port).
DeviceManagement.Application.ListEquipment = {
  execute: function (deps, input) {
    var Criteria = DeviceManagement.Domain.EquipmentCriteria;
    var query = Criteria.parse(input);
    var rows = deps.repository.readAll().filter(function (row) { return Criteria.matches(row, query); });
    rows.sort(Criteria.compare);
    return Criteria.paginate(rows, query);
  }
};
