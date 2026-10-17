// Server-to-server action used by the other backends. Action names are part of the public API.
AccessControl.Endpoints.AccessEndpoints = {
  ACTION: {
    RESOLVE: 'auth.access.resolve'
  },

  readActions: function () {
    return [AccessControl.Endpoints.AccessEndpoints.ACTION.RESOLVE];
  },

  // Handler input: { idToken }.
  build: function (deps) {
    var handlers = {};
    handlers[AccessControl.Endpoints.AccessEndpoints.ACTION.RESOLVE] = function (input) {
      return DomainErrorTranslator.run(function () {
        return AccessControl.Application.ResolveAccess.execute(deps, { idToken: input.idToken });
      });
    };
    return handlers;
  }
};
