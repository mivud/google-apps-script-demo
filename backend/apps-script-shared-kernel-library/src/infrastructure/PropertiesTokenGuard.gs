// settings: { read(key) } over the app's Script Properties (see ScriptSettings.fromProperties).
function PropertiesTokenGuard(settings) {
  this.settings = settings;
}

PropertiesTokenGuard.prototype.assertValid = function (token) {
  var expected = this.settings.read(ScriptSettings.API_TOKEN_KEY);
  if (!expected || token !== expected) throw ApiError.unauthorized();
};
