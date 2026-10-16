// Clock port backed by the system time.
function SystemClock() {}

SystemClock.prototype.now = function () {
  return new Date();
};
