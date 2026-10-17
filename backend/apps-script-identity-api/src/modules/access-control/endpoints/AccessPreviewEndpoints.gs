// Preview (identity.read) of the effective access of a user. Action names are part of the public API.
AccessControl.Endpoints.AccessPreviewEndpoints = {
  ACTION: {
    PREVIEW: 'access-control.access.preview'
  },

  readActions: function () {
    return [AccessControl.Endpoints.AccessPreviewEndpoints.ACTION.PREVIEW];
  },

  // Handler input: { idToken, payload }.
  build: function (deps) {
    var handlers = {};
    handlers[AccessControl.Endpoints.AccessPreviewEndpoints.ACTION.PREVIEW] = function (input) {
      return DomainErrorTranslator.run(function () {
        return AccessControl.Application.PreviewAccess.execute(deps, {
          idToken: input.idToken,
          userId: PayloadReader.requireId(input.payload, 'user_id', 'User')
        });
      });
    };
    return handlers;
  }
};
