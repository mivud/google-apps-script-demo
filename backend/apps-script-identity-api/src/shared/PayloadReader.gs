// Boundary parsing of request payload fields. Never trusts types sent by the client.
var PayloadReader = {
  MAX_TEXT_LENGTH: 1000,
  MAX_ID_LIST: 100,
  SAFE_ID: /^[A-Za-z0-9_-]{1,64}$/,

  invalid: function () {
    return DomainError.create(DomainError.CODE.INVALID_REQUEST);
  },

  requireString: function (payload, field) {
    var value = payload[field];
    if (typeof value !== 'string' || value.length > PayloadReader.MAX_TEXT_LENGTH) throw PayloadReader.invalid();
    return value;
  },

  optionalString: function (payload, field) {
    return payload[field] === undefined || payload[field] === null ? '' : PayloadReader.requireString(payload, field);
  },

  requireBoolean: function (payload, field) {
    if (typeof payload[field] !== 'boolean') throw PayloadReader.invalid();
    return payload[field];
  },

  // Rows typed by hand in the sheet may carry non-uuid ids, so any short safe token is looked up as is;
  // anything else can never match a row and is reported as not found.
  requireId: function (payload, field, entityLabel) {
    var raw = PayloadReader.requireString(payload, field);
    var id = IdRules.normalize(raw) || (PayloadReader.SAFE_ID.test(raw) ? raw.toLowerCase() : '');
    if (!id) throw DomainError.notFound(entityLabel, raw.slice(0, 40));
    return id;
  },

  optionalIdList: function (payload, field, entityLabel) {
    var list = payload[field];
    if (list === undefined || list === null) return [];
    if (!Array.isArray(list) || list.length > PayloadReader.MAX_ID_LIST) throw PayloadReader.invalid();
    var ids = list.map(function (item) { return PayloadReader.requireId({ item: item }, 'item', entityLabel); });
    return ids.filter(function (id, at) { return ids.indexOf(id) === at; });
  }
};
