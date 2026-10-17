// Use case: list fixed expense templates by description. deps: { templates }.
ExpenseTracking.Application.ListFixedTemplates = {
  execute: function (deps) {
    var items = deps.templates.list().sort(function (a, b) {
      return String(a.description).toLowerCase() < String(b.description).toLowerCase() ? -1 : 1;
    });
    return { items: items };
  }
};
