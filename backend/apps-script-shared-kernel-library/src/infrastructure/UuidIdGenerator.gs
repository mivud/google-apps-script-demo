// IdGenerator port backed by Utilities.getUuid().
function UuidIdGenerator() {}

UuidIdGenerator.prototype.newId = function () {
  return Utilities.getUuid().toLowerCase();
};
