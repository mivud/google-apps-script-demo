// Namespace root of the claims module. Must load before every other file of the module.
// The functions below are the module's public surface; the composition root is the only caller.
// Layer namespaces are resolved inside functions, so load order of layer files never matters.
var Claims = {
  Domain: {},
  Application: {},
  Endpoints: {},
  Persistence: { GoogleSheet: {} },

  createClaimRepository: function (source, cache) {
    return Claims.Persistence.GoogleSheet.ClaimRepository.create(source, cache);
  },

  // parts: { claims (ClaimRepository), usage (ClaimUsage port), authorizer, audit }.
  createDeps: function (parts) {
    return { claims: parts.claims, usage: parts.usage, authorizer: parts.authorizer, audit: parts.audit };
  },

  // Handlers take { idToken, payload, nonce } built by Main.gs from the request.
  createEndpoints: function (deps) {
    return Claims.Endpoints.ClaimEndpoints.build(deps);
  },

  readActions: function () {
    return Claims.Endpoints.ClaimEndpoints.readActions();
  },

  schemaDefinitions: function () {
    return [{ schema: Claims.Persistence.GoogleSheet.ClaimRepository.SCHEMA }];
  }
};
