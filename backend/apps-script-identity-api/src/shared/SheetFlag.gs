// Booleans are stored as the text TRUE/FALSE; reading is case-insensitive and trimmed.
var SheetFlag = {
  format: function (flag) {
    return flag ? 'TRUE' : 'FALSE';
  },

  parse: function (cell) {
    return String(cell).trim().toLowerCase() === 'true';
  }
};
