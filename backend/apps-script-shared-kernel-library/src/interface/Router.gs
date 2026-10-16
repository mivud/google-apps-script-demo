// Maps "<module>.<action>" to a handler. The map is injected, so modules never edit the router.
// readActions: names of actions that never change data, so they can run without the write lock.
function Router(handlers, readActions) {
  this.handlers = handlers;
  this.readActions = readActions || [];
}

Router.prototype.resolve = function (action) {
  if (!Object.prototype.hasOwnProperty.call(this.handlers, action)) {
    throw ApiError.validation('Unknown action: ' + action);
  }
  return this.handlers[action];
};

Router.prototype.isReadOnly = function (action) {
  return this.readActions.indexOf(action) !== -1;
};
