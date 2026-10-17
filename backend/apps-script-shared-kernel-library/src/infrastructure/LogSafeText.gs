// Makes text safe to log: long id-like tokens (sheet ids, keys) are masked and the length is bounded.
var LogSafeText = {
  MAX_LENGTH: 200,
  ID_LIKE: /[A-Za-z0-9_-]{20,}/g,
  MASK: '[id]',

  of: function (text) {
    return String(text).replace(LogSafeText.ID_LIKE, LogSafeText.MASK).slice(0, LogSafeText.MAX_LENGTH);
  }
};
