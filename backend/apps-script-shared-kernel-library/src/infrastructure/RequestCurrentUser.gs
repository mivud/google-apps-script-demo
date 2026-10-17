// CurrentUser port for one request: the app signs the user in after authentication, audit fields read it.
// One instance per request (built by the composition root), so nothing leaks between requests.
function RequestCurrentUser() {
  this.email = '';
}

RequestCurrentUser.prototype.signIn = function (email) {
  this.email = String(email);
};

RequestCurrentUser.prototype.id = function () {
  return this.email;
};
