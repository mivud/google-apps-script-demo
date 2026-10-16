var IdRules = {
  UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,

  // Returns a lowercase uuid, or null when the value cannot be an id (lookups treat that as "no match").
  normalize: function (id) {
    if (typeof id !== 'string') return null;
    var normalized = id.trim().toLowerCase();
    return IdRules.UUID_PATTERN.test(normalized) ? normalized : null;
  }
};
