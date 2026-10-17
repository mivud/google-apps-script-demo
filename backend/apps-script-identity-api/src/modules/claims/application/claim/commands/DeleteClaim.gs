// Use case: remove a claim from the catalog unless a role or user still uses it.
// deps: { claims, usage, authorizer }. input: { idToken, key, value }.
Claims.Application.DeleteClaim = {
  execute: function (deps, input) {
    deps.authorizer.requireWrite(input.idToken);
    var claim = Claims.Domain.Claim.of(input.key, input.value);
    if (!deps.claims.exists(claim)) throw DomainError.notFound('Claim', claim.key);
    if (deps.usage.isInUse(claim)) throw DomainError.create(DomainError.CODE.CLAIM_IN_USE);
    deps.claims.remove(claim);
    return {};
  }
};
