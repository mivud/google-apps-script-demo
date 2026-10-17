// Claim actions. Action names are part of the public API. Handler input: { idToken, payload }.
Claims.Endpoints.ClaimEndpoints = {
  ACTION: {
    LIST: 'claims.claim.list',
    CREATE: 'claims.claim.create',
    DELETE: 'claims.claim.delete'
  },

  readActions: function () {
    return [Claims.Endpoints.ClaimEndpoints.ACTION.LIST];
  },

  build: function (deps) {
    var endpoints = Claims.Endpoints.ClaimEndpoints;
    var application = Claims.Application;
    var handlers = {};
    handlers[endpoints.ACTION.LIST] = function (input) {
      return DomainErrorTranslator.run(function () {
        return application.ListClaims.execute(deps, { idToken: input.idToken });
      });
    };
    handlers[endpoints.ACTION.CREATE] = function (input) {
      return DomainErrorTranslator.run(function () {
        return application.CreateClaim.execute(deps, endpoints.toClaimInput(input));
      });
    };
    handlers[endpoints.ACTION.DELETE] = function (input) {
      return DomainErrorTranslator.run(function () {
        return application.DeleteClaim.execute(deps, endpoints.toClaimInput(input));
      });
    };
    return handlers;
  },

  // Types are checked here; the format rules live in the Claim value object.
  toClaimInput: function (input) {
    return {
      idToken: input.idToken,
      key: PayloadReader.requireString(input.payload, 'key'),
      value: PayloadReader.requireString(input.payload, 'value')
    };
  }
};
