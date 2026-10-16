// Entity: a person allowed (or no longer allowed) to use the apps, identified by id and unique email.
Auth.Domain.User = {
  // email must be an Email value (already normalized).
  hasEmail: function (user, email) {
    return user.email === email;
  },

  // An inactive user or one with an unknown role cannot sign in.
  canSignIn: function (user) {
    return user.active && user.role !== '';
  }
};
