var ROW_CACHE_TTL_SECONDS = 60;
var ROW_CACHE_KEY_PREFIX = 'rows:';

// Short-lived cache of parsed table rows.
// store must be the calling app's CacheService.getScriptCache(), so apps never share cached rows.
// It is only an accelerator: any failure degrades to a normal sheet read.
function ScriptRowCache(store) {
  this.store = store;
}

ScriptRowCache.prototype.get = function (name) {
  var raw = this.store.get(ROW_CACHE_KEY_PREFIX + name);
  return raw ? JSON.parse(raw) : null;
};

ScriptRowCache.prototype.put = function (name, rows) {
  try {
    this.store.put(ROW_CACHE_KEY_PREFIX + name, JSON.stringify(rows), ROW_CACHE_TTL_SECONDS);
  } catch (err) {
    // Values over the CacheService size limit are simply not cached.
  }
};

ScriptRowCache.prototype.remove = function (name) {
  this.store.remove(ROW_CACHE_KEY_PREFIX + name);
};
