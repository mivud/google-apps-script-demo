// Boundary parsing of request payload fields. Never trusts types sent by the client.
// Business formats (dates, amounts, names) are checked by the domain, not here.
var PayloadReader = {
  MAX_TEXT_LENGTH: 1000,
  SAFE_ID: /^[A-Za-z0-9_-]{1,64}$/,

  invalid: function () {
    return DomainError.create(DomainError.CODE.INVALID_REQUEST);
  },

  has: function (payload, field) {
    return Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== undefined;
  },

  requireString: function (payload, field) {
    var value = payload[field];
    if (typeof value !== 'string' || value.length > PayloadReader.MAX_TEXT_LENGTH) throw PayloadReader.invalid();
    return value;
  },

  requireBoolean: function (payload, field) {
    if (typeof payload[field] !== 'boolean') throw PayloadReader.invalid();
    return payload[field];
  },

  requireNumber: function (payload, field) {
    if (typeof payload[field] !== 'number') throw PayloadReader.invalid();
    return payload[field];
  },

  // Passes any JSON value through; the domain value object decides what is valid (null clears an optional field).
  readRaw: function (payload, field) {
    return payload[field];
  },

  normalizeId: function (raw) {
    return IdRules.normalize(raw) || (PayloadReader.SAFE_ID.test(raw) ? raw.toLowerCase() : '');
  },

  // An id that can never match a row is reported as not found.
  requireId: function (payload, field, entityLabel) {
    var raw = PayloadReader.requireString(payload, field);
    var id = PayloadReader.normalizeId(raw);
    if (!id) throw DomainError.notFound(entityLabel, raw.slice(0, 40));
    return id;
  },

  // A foreign key: a malformed id becomes '' so the use case answers with its own "reference not found" code.
  requireReferenceId: function (payload, field) {
    return PayloadReader.normalizeId(PayloadReader.requireString(payload, field));
  },

  // Like requireReferenceId, but null or empty means "none" (returned as '').
  readOptionalReferenceId: function (payload, field) {
    if (payload[field] === null) return '';
    return PayloadReader.requireReferenceId(payload, field);
  },

  // fields: [{ from (payload name), to (domain name), type }]. Only fields present in the payload are returned,
  // so anything not listed (audit columns, months_added, template_id) can never be set by a client.
  readFields: function (payload, fields) {
    var result = {};
    fields.forEach(function (field) {
      if (PayloadReader.has(payload, field.from)) result[field.to] = PayloadReader.READERS[field.type](payload, field.from);
    });
    return result;
  }
};

PayloadReader.READERS = {
  string: PayloadReader.requireString,
  boolean: PayloadReader.requireBoolean,
  number: PayloadReader.requireNumber,
  raw: PayloadReader.readRaw,
  reference: PayloadReader.requireReferenceId,
  optionalReference: PayloadReader.readOptionalReferenceId
};
