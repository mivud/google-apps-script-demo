// User actions. Action names are part of the public API. Handler input: { idToken, payload }.
// Types are checked here; format and business rules live in the domain.
Users.Endpoints.UserEndpoints = {
  ACTION: {
    LIST: 'users.user.list',
    GET: 'users.user.get',
    CREATE: 'users.user.create',
    UPDATE: 'users.user.update',
    DELETE: 'users.user.delete',
    ASSIGN_ROLE: 'users.userRole.assign',
    UNASSIGN_ROLE: 'users.userRole.unassign',
    ADD_CLAIM: 'users.userClaim.add',
    REMOVE_CLAIM: 'users.userClaim.remove'
  },

  readActions: function () {
    var action = Users.Endpoints.UserEndpoints.ACTION;
    return [action.LIST, action.GET];
  },

  build: function (deps) {
    var endpoints = Users.Endpoints.UserEndpoints;
    var application = Users.Application;
    var toJson = Users.Endpoints.UserJsonMapper.toJson;
    var handlers = {};
    var register = function (action, readInput, useCase, mapResult) {
      handlers[action] = function (input) {
        return DomainErrorTranslator.run(function () {
          return mapResult(useCase.execute(deps, readInput(input)));
        });
      };
    };
    register(endpoints.ACTION.LIST, endpoints.readToken, application.ListUsers, function (result) {
      return { items: result.items.map(toJson) };
    });
    register(endpoints.ACTION.GET, endpoints.readId, application.GetUser, toJson);
    register(endpoints.ACTION.CREATE, endpoints.readCreate, application.CreateUser, toJson);
    register(endpoints.ACTION.UPDATE, endpoints.readUpdate, application.UpdateUser, toJson);
    register(endpoints.ACTION.DELETE, endpoints.readId, application.DeleteUser, function (result) { return result; });
    register(endpoints.ACTION.ASSIGN_ROLE, endpoints.readUserRole, application.AssignUserRole, toJson);
    register(endpoints.ACTION.UNASSIGN_ROLE, endpoints.readUserRole, application.UnassignUserRole, toJson);
    register(endpoints.ACTION.ADD_CLAIM, endpoints.readUserClaim, application.AddUserClaim, toJson);
    register(endpoints.ACTION.REMOVE_CLAIM, endpoints.readUserClaim, application.RemoveUserClaim, toJson);
    return handlers;
  },

  readToken: function (input) {
    return { idToken: input.idToken };
  },

  readId: function (input) {
    return { idToken: input.idToken, id: PayloadReader.requireId(input.payload, 'id', 'User') };
  },

  readCreate: function (input) {
    return {
      idToken: input.idToken,
      email: PayloadReader.requireString(input.payload, 'email'),
      active: PayloadReader.requireBoolean(input.payload, 'active'),
      roleIds: PayloadReader.optionalIdList(input.payload, 'role_ids', 'Role')
    };
  },

  readUpdate: function (input) {
    return Object.assign(Users.Endpoints.UserEndpoints.readId(input), {
      email: PayloadReader.requireString(input.payload, 'email'),
      active: PayloadReader.requireBoolean(input.payload, 'active'),
      expectedLastModified: PayloadReader.requireString(input.payload, 'expected_last_modified')
    });
  },

  readUserRole: function (input) {
    return {
      idToken: input.idToken,
      userId: PayloadReader.requireId(input.payload, 'user_id', 'User'),
      roleId: PayloadReader.requireId(input.payload, 'role_id', 'Role')
    };
  },

  readUserClaim: function (input) {
    return {
      idToken: input.idToken,
      userId: PayloadReader.requireId(input.payload, 'user_id', 'User'),
      key: PayloadReader.requireString(input.payload, 'key'),
      value: PayloadReader.requireString(input.payload, 'value')
    };
  }
};
