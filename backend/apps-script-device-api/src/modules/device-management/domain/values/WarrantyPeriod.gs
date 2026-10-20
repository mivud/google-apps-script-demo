// Pure value object: purchase date + warranty months -> expiry date. All dates are UTC date-only
// strings (YYYY-MM-DD), so they compare correctly as plain strings.
DeviceManagement.Domain.WarrantyPeriod = {
  MAX_MONTHS: 600,
  MIN_YEAR: 1900,
  MAX_YEAR: 2999,
  MONTHS_PER_YEAR: 12,
  DATE_PATTERN: /^(\d{4})-(\d{2})-(\d{2})$/,
  MESSAGE: {
    // Stable codes, same convention as category_cycle: the message is the code.
    INVALID_DATE: 'purchase_date_invalid',
    INVALID_MONTHS: 'warranty_months_invalid',
    MONTHS_NEED_DATE: 'warranty_requires_purchase_date'
  },

  // purchaseDate / months are null when absent; throws a validation error on any broken rule.
  validate: function (purchaseDate, months) {
    var WarrantyPeriod = DeviceManagement.Domain.WarrantyPeriod;
    if (purchaseDate !== null) WarrantyPeriod.parseDate(purchaseDate);
    if (months === null) return;
    if (!WarrantyPeriod.isValidMonths(months)) throw ApiError.validation(WarrantyPeriod.MESSAGE.INVALID_MONTHS);
    if (purchaseDate === null) throw ApiError.validation(WarrantyPeriod.MESSAGE.MONTHS_NEED_DATE);
  },

  isValidMonths: function (months) {
    var WarrantyPeriod = DeviceManagement.Domain.WarrantyPeriod;
    return typeof months === 'number' && months % 1 === 0 && months >= 0 && months <= WarrantyPeriod.MAX_MONTHS;
  },

  // Returns { year, month (0-based), day } or throws; rejects rollover dates such as 2026-02-30.
  parseDate: function (text) {
    var WarrantyPeriod = DeviceManagement.Domain.WarrantyPeriod;
    var match = typeof text === 'string' ? WarrantyPeriod.DATE_PATTERN.exec(text) : null;
    if (!match) throw ApiError.validation(WarrantyPeriod.MESSAGE.INVALID_DATE);
    var parts = { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
    var inRange = parts.year >= WarrantyPeriod.MIN_YEAR && parts.year <= WarrantyPeriod.MAX_YEAR;
    if (!inRange || parts.day < 1 || parts.day > WarrantyPeriod.daysInMonth(parts.year, parts.month)) {
      throw ApiError.validation(WarrantyPeriod.MESSAGE.INVALID_DATE);
    }
    return parts;
  },

  daysInMonth: function (year, month) {
    var date = new Date(0);
    date.setUTCFullYear(year, month + 1, 0);
    return date.getUTCDate();
  },

  // Null without a purchase date or months. Clamps to the end of a shorter month (31 Jan + 1 = 28/29 Feb).
  expiryDate: function (purchaseDate, months) {
    var WarrantyPeriod = DeviceManagement.Domain.WarrantyPeriod;
    if (purchaseDate === null || months === null) return null;
    var start = WarrantyPeriod.parseDate(purchaseDate);
    var total = start.month + months;
    var year = start.year + Math.floor(total / WarrantyPeriod.MONTHS_PER_YEAR);
    var month = total % WarrantyPeriod.MONTHS_PER_YEAR;
    var day = Math.min(start.day, WarrantyPeriod.daysInMonth(year, month));
    return WarrantyPeriod.format(year, month, day);
  },

  // The expiry day itself is still covered; today is a YYYY-MM-DD string supplied by the caller.
  isExpired: function (expiry, today) {
    return expiry !== null && expiry !== undefined && expiry < today;
  },

  format: function (year, month, day) {
    var pad = function (value, width) { return ('0000' + value).slice(-width); };
    return pad(year, 4) + '-' + pad(month + 1, 2) + '-' + pad(day, 2);
  }
};
