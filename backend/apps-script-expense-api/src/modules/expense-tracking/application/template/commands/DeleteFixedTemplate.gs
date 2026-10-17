// Use case: delete a fixed expense template. Expenses already generated from it stay (their template_id is just history).
// deps: { templates }. input: { id }.
ExpenseTracking.Application.DeleteFixedTemplate = {
  execute: function (deps, input) {
    if (!deps.templates.findById(input.id)) {
      throw DomainError.notFound(ExpenseTracking.Application.UpdateFixedTemplate.LABEL, input.id);
    }
    deps.templates.delete(input.id);
    return {};
  }
};
