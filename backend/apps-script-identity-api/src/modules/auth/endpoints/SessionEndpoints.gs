// Action names are part of the public API.
Auth.Endpoints.SessionEndpoints = {
  ACTION: {
    GET: 'auth.session.get'
  },

  readActions: function () {
    return [Auth.Endpoints.SessionEndpoints.ACTION.GET];
  },

  // Handler input: { idToken, nonce }.
  build: function (deps) {
    var handlers = {};
    handlers[Auth.Endpoints.SessionEndpoints.ACTION.GET] = function (input) {
      return Auth.Endpoints.AuthErrorTranslator.run(function () {
        return Auth.Application.GetSession.execute(deps, { idToken: input.idToken, nonce: input.nonce });
      });
    };
    return handlers;
  }
};
