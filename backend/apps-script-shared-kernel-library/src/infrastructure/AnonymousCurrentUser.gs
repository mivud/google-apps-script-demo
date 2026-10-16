// CurrentUser port. Hook: once login exists, return the authenticated user (id/email) here.
function AnonymousCurrentUser() {}

AnonymousCurrentUser.prototype.id = function () {
  return '';
};
