// Secrets and ids live in Script Properties, never in code.
var ScriptSettings = {
  GOOGLE_CLIENT_ID_KEY: 'GOOGLE_CLIENT_ID',
  SPREADSHEET_ID_KEY: 'SPREADSHEET_ID',
  SCHEMA_SIGNATURE_KEY: 'SCHEMA_SIGNATURE',

  // store must be the CALLING app's PropertiesService.getScriptProperties(): inside a library the global
  // PropertiesService points at the library's own (empty) properties.
  fromProperties: function (store) {
    return {
      read: function (key) { return store.getProperty(key); },
      write: function (key, value) { store.setProperty(key, value); }
    };
  }
};
