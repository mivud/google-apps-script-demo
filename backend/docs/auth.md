# auth (module of identity-api)

**Purpose:** sign-in with Google and role-based access, for all backends. Code: [apps-script-identity-api/src/modules/auth](../apps-script-identity-api/src/modules/auth). Setup, actions and the nonce rules: [identity-api](identity-api.md). `apps-script` no longer contains this module.

**Layers:** `domain` (values `Email`, `Role`, `SessionNonce`; entity `User`), `application` (`AccessSupportService`, queries `ResolveAccess`, `GetSession`), `endpoints` (`SessionEndpoints`, `AccessEndpoints`), `persistence/googlesheet` (`UserRepository`). Emails are normalized once, in the `Email` value; the repository only receives an `Email` and matches with `User.hasEmail`.

**Token verification** ([GoogleIdTokenVerifier](../apps-script-shared-kernel-library/src/infrastructure/GoogleIdTokenVerifier.gs)): shape and length check, then POST to `https://oauth2.googleapis.com/tokeninfo`. Accepted only if `aud` equals `GOOGLE_CLIENT_ID`, `iss` is Google, `exp` is in the future and `email_verified` is `true`. Verified identities (email, nonce) are cached under the SHA-256 of the token for `min(exp - now, 60 s)`; the raw token is never stored. Refused tokens are remembered 30 s (also by hash) to protect the UrlFetch quota.

**Revocation delay:** a disabled user or revoked token can keep working for up to about 2 to 3 minutes: identity-api verified-token cache (60 s) + `IdentityClient` access cache (60 s) + `users` row cache (about 60 s). The device-management API relies on bearer ID tokens (valid about 1 h, no nonce check there); the identity decision is refreshed through the caches above.

**Role literals** (`admin`, `viewer`) are an API contract shared with the other backends and the frontend. The server-to-server resolver contract is the `AccessResolver` port in the shared kernel `Ports.gs`, implemented by `IdentityClient`.

**OAuth scopes:** `spreadsheets` is accepted because the scripts are standalone (they open sheets by id); `drive.file` is a possible future narrowing.

**Allowlist:** sheet `users`; `active` must be `true`; `role` is `admin` or `viewer`. Rows are cached about 60 s, so manual edits apply within a minute.

**Permissions (enforced by each consuming backend):** `apps-script` allows reads (`*.list`, `*.get`, `system.version.get`) for `admin` and `viewer`, every other action only for `admin` ([AccessControl.gs](../apps-script/src/composition/AccessControl.gs)).

**How `apps-script` uses it:** per request [IdentityClient](../apps-script/src/infrastructure/IdentityClient.gs) checks the token shape and length, then calls `auth.access.resolve` on `IDENTITY_API_URL` and caches `{ email, role }` for 60 s under the SHA-256 of the token. Before any cache or network call it also reads `aud` and `exp` from the unverified payload and refuses tokens for another audience or already expired, as a cheap filter only (so random well-shaped tokens cannot cost identity-api calls); the cached access never outlives the token's `exp`. Only the sign-in call (`auth.session.get`) checks the nonce; later requests carry the bare ID token, valid until it expires. It does not call Google's `tokeninfo` itself: identity-api is the only verifier, which saves one round trip per cache miss. Refusals (`UNAUTHORIZED`, `FORBIDDEN`) are cached 30 s so invalid tokens cannot flood identity-api. If identity-api is unreachable, not configured or answers oddly (or `IDENTITY_API_URL` is not an `https://script.google.com/macros/s/<id>/exec` URL), the request fails closed with `INTERNAL` "Service unavailable" (not cached). In `Main.gs` the order is authenticate (resolve), authorize ([AccessControl](../apps-script/src/composition/AccessControl.gs): unknown roles denied), schema check, handler. Revoking a user can take up to about 60 s (row cache) plus 60 s (access cache) to apply.

**Errors:** `UNAUTHORIZED` ("Invalid token") and `FORBIDDEN` ("Access denied"), one message each. Tokens and emails are never logged.

**Audit:** `created_by` / `last_modified_by` in `apps-script` are the resolved email.
