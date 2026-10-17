// Use case: add a claim to the catalog. deps: { claims, authorizer, audit }. input: { idToken, key, value }.
Claims.Application.CreateClaim = {
  execute: function (deps, input) {
    var actor = deps.authorizer.requireWrite(input.idToken).email;
    var claim = Claims.Domain.Claim.of(input.key, input.value);
    if (deps.claims.exists(claim)) throw DomainError.create(DomainError.CODE.CLAIM_DUPLICATE);
    Claims.Domain.Claim.assertCanCreate(deps.claims.list().length);
    deps.claims.add(claim, deps.audit.created(actor));
    return claim;
  }
};
