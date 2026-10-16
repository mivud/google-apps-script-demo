var PatchSupport = {
  NOT_AN_OBJECT_MESSAGE: 'patch must be an object',

  assertObjectOrAbsent: function (patch) {
    if (patch !== undefined && (patch === null || typeof patch !== 'object')) {
      throw ApiError.validation(PatchSupport.NOT_AN_OBJECT_MESSAGE);
    }
  },

  // spec: { keys: whitelisted fields, nullAsEmpty: fields where null clears the value to '' }.
  apply: function (row, patch, spec) {
    if (!patch) return;
    spec.keys.forEach(function (key) {
      if (patch[key] === undefined) return;
      var clearsToEmpty = patch[key] === null && spec.nullAsEmpty.indexOf(key) !== -1;
      row[key] = clearsToEmpty ? '' : patch[key];
    });
  }
};
