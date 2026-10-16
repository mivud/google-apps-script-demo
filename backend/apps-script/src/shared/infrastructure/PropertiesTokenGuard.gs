function PropertiesTokenGuard() {}

PropertiesTokenGuard.prototype.assertValid = function (token) {
  var expected = ScriptSettings.read(ScriptSettings.API_TOKEN_KEY);
  if (!expected || token !== expected) throw ApiError.unauthorized();
};
