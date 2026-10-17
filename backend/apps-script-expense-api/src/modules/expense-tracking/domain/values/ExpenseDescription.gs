// Value object: what an expense or template is for. Trimmed, 1-200 characters.
ExpenseTracking.Domain.ExpenseDescription = {
  MAX_LENGTH: 200,

  normalize: function (text) {
    var description = typeof text === 'string' ? text.trim() : '';
    if (description.length < 1 || description.length > ExpenseTracking.Domain.ExpenseDescription.MAX_LENGTH) {
      throw DomainError.create(DomainError.CODE.DESCRIPTION_INVALID);
    }
    return description;
  }
};
