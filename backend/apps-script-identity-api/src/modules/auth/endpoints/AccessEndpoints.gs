// Server-to-server action used by the other backends. Action names are part of the public API.
Auth.Endpoints.AccessEndpoints = {
  ACTION: {
    RESOLVE: 'auth.access.resolve'
  },

  readActions: function () {
    return [Auth.Endpoints.AccessEndpoints.ACTION.RESOLVE];
  },

  // Handler input: { idToken }.
  build: function (deps) {
    var handlers = {};
    handlers[Auth.Endpoints.AccessEndpoints.ACTION.RESOLVE] = function (input) {
      return Auth.Endpoints.AuthErrorTranslator.run(function () {
        return Auth.Application.ResolveAccess.execute(deps, { idToken: input.idToken });
      });
    };
    return handlers;
  }
};
