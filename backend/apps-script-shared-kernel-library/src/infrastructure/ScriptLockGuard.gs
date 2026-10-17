var LOCK_WAIT_TIMEOUT_MS = 20000;

// One lock for every write keeps read-modify-write on the sheet consistent.
// lock must be the calling app's LockService.getScriptLock(), so each app has its own lock.
function ScriptLockGuard(lock) {
  this.lock = lock;
}

ScriptLockGuard.prototype.runExclusive = function (work) {
  var lock = this.lock;
  // If acquiring fails nothing is held, so the release below is only reached after success.
  lock.waitLock(LOCK_WAIT_TIMEOUT_MS);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
};
