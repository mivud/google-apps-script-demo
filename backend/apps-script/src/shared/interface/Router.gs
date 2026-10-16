// Maps "<module>.<action>" to a handler. The map is injected, so modules never edit the router.
function Router(handlers) {
  this.handlers = handlers;
}

Router.prototype.resolve = function (action) {
  if (!Object.prototype.hasOwnProperty.call(this.handlers, action)) {
    throw ApiError.validation('Unknown action: ' + action);
  }
  return this.handlers[action];
};
