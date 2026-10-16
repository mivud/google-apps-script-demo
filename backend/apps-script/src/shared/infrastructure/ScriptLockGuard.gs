var LOCK_WAIT_TIMEOUT_MS = 20000;

// One lock for every call keeps read-modify-write on the sheet consistent.
function ScriptLockGuard() {}

ScriptLockGuard.prototype.runExclusive = function (work) {
  var lock = LockService.getScriptLock();
  // If acquiring fails nothing is held, so the release below is only reached after success.
  lock.waitLock(LOCK_WAIT_TIMEOUT_MS);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
};
