// Action names are part of the public API.
AccessControl.Endpoints.SessionEndpoints = {
  ACTION: {
    GET: 'auth.session.get'
  },

  readActions: function () {
    return [AccessControl.Endpoints.SessionEndpoints.ACTION.GET];
  },

  // Handler input: { idToken, nonce }.
  build: function (deps) {
    var handlers = {};
    handlers[AccessControl.Endpoints.SessionEndpoints.ACTION.GET] = function (input) {
      return DomainErrorTranslator.run(function () {
        return AccessControl.Application.GetSession.execute(deps, { idToken: input.idToken, nonce: input.nonce });
      });
    };
    return handlers;
  }
};
