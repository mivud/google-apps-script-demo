// Secrets and ids live in Script Properties, never in code.
var ScriptSettings = {
  API_TOKEN_KEY: 'API_TOKEN',
  SPREADSHEET_ID_KEY: 'SPREADSHEET_ID',

  read: function (key) {
    return PropertiesService.getScriptProperties().getProperty(key);
  }
};
