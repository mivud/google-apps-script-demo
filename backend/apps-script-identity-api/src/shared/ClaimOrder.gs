// One ordering for every claim list: by key, then by value, plain string comparison.
var ClaimOrder = {
  compareText: function (a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
  },

  compare: function (a, b) {
    return ClaimOrder.compareText(a.key, b.key) || ClaimOrder.compareText(a.value, b.value);
  },

  same: function (a, b) {
    return a.key === b.key && a.value === b.value;
  },

  // Returns a sorted copy without duplicates.
  distinctSorted: function (claims) {
    var sorted = claims.map(function (claim) { return { key: claim.key, value: claim.value }; }).sort(ClaimOrder.compare);
    return sorted.filter(function (claim, at) { return at === 0 || !ClaimOrder.same(sorted[at - 1], claim); });
  }
};
