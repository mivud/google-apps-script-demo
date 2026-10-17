// Registers handlers that read the input, run one use case and map the result, translating domain errors.
// Handler input: { actor, payload }.
var EndpointBuilder = {
  create: function (deps) {
    var handlers = {};
    return {
      handlers: handlers,
      add: function (action, readInput, useCase, mapResult) {
        handlers[action] = function (input) {
          return DomainErrorTranslator.run(function () {
            return mapResult(useCase.execute(deps, readInput(input)));
          });
        };
      }
    };
  }
};
