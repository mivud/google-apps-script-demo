// Role actions. Action names are part of the public API. Handler input: { idToken, payload }.
// Types are checked here; format and business rules live in the domain.
Roles.Endpoints.RoleEndpoints = {
  ACTION: {
    LIST: 'roles.role.list',
    GET: 'roles.role.get',
    CREATE: 'roles.role.create',
    UPDATE: 'roles.role.update',
    DELETE: 'roles.role.delete',
    ADD_CLAIM: 'roles.roleClaim.add',
    REMOVE_CLAIM: 'roles.roleClaim.remove'
  },

  readActions: function () {
    var action = Roles.Endpoints.RoleEndpoints.ACTION;
    return [action.LIST, action.GET];
  },

  build: function (deps) {
    var endpoints = Roles.Endpoints.RoleEndpoints;
    var application = Roles.Application;
    var toJson = Roles.Endpoints.RoleJsonMapper.toJson;
    var handlers = {};
    var register = function (action, readInput, useCase, mapResult) {
      handlers[action] = function (input) {
        return DomainErrorTranslator.run(function () {
          return mapResult(useCase.execute(deps, readInput(input)));
        });
      };
    };
    register(endpoints.ACTION.LIST, endpoints.readToken, application.ListRoles, function (result) {
      return { items: result.items.map(toJson) };
    });
    register(endpoints.ACTION.GET, endpoints.readId, application.GetRole, toJson);
    register(endpoints.ACTION.CREATE, endpoints.readCreate, application.CreateRole, toJson);
    register(endpoints.ACTION.UPDATE, endpoints.readUpdate, application.UpdateRole, toJson);
    register(endpoints.ACTION.DELETE, endpoints.readId, application.DeleteRole, function (result) { return result; });
    register(endpoints.ACTION.ADD_CLAIM, endpoints.readRoleClaim, application.AddRoleClaim, toJson);
    register(endpoints.ACTION.REMOVE_CLAIM, endpoints.readRoleClaim, application.RemoveRoleClaim, toJson);
    return handlers;
  },

  readToken: function (input) {
    return { idToken: input.idToken };
  },

  readId: function (input) {
    return { idToken: input.idToken, id: PayloadReader.requireId(input.payload, 'id', 'Role') };
  },

  readCreate: function (input) {
    return {
      idToken: input.idToken,
      name: PayloadReader.requireString(input.payload, 'name'),
      description: PayloadReader.optionalString(input.payload, 'description')
    };
  },

  readUpdate: function (input) {
    var endpoints = Roles.Endpoints.RoleEndpoints;
    return Object.assign(endpoints.readId(input), {
      name: PayloadReader.requireString(input.payload, 'name'),
      description: PayloadReader.optionalString(input.payload, 'description'),
      expectedLastModified: PayloadReader.requireString(input.payload, 'expected_last_modified')
    });
  },

  readRoleClaim: function (input) {
    return {
      idToken: input.idToken,
      roleId: PayloadReader.requireId(input.payload, 'role_id', 'Role'),
      key: PayloadReader.requireString(input.payload, 'key'),
      value: PayloadReader.requireString(input.payload, 'value')
    };
  }
};
