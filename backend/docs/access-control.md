# access-control (module of identity-api)

**Purpose:** decides what a verified Google identity may do: sign-in, effective roles and claims, admin authorization and lockout rules. It replaces the former `auth` module. Code: [modules/access-control](../apps-script-identity-api/src/modules/access-control). Setup, nonce and revocation: [identity-api](identity-api.md). Related: [users](users.md), [roles](roles.md), [claims](claims.md).

**Actions**

| Action | Input | Result |
|---|---|---|
| `auth.session.get` | `idToken`, `payload.nonce` | `{ email, role, roles, claims }` |
| `auth.access.resolve` | `idToken` | `{ email, role, roles, claims }` |
| `access-control.access.preview` | `payload.user_id` (admin only) | same shape for that user; the target need not be active; `role` may be `''` |

`roles` are role names sorted; `claims` are the effective claims. The names `auth.*` are kept for compatibility. All `claims.*`, `roles.*`, `users.*` and preview actions require the caller's primary role to be `admin` ([AdminAuthorizationService](../apps-script-identity-api/src/modules/access-control/application/authorization/AdminAuthorizationService.gs)), else `FORBIDDEN`.

**Rules** ([EffectiveAccess](../apps-script-identity-api/src/modules/access-control/domain/EffectiveAccess.gs))
1. Role names = names of the user's `user_roles`. Legacy fallback (phase 1): a user with no `user_roles` rows gets `[users.role]` when it is `admin` or `viewer`, and also the claims of the role row named like it.
2. Primary `role` = `admin` if the names contain it, else `viewer`, else `''`. A user with `''` or inactive is refused with `FORBIDDEN`.
3. Effective claims = distinct role claims; if the user owns any claim with key K, role claims with key K are dropped; then own claims are added; sorted by key, then value. Example: r1{a=1,b=2}, r2{a=3}: user{} gives a=1,a=3,b=2; user{a=9} gives a=9,b=2.
4. Lockout ([AdminLockoutRule](../apps-script-identity-api/src/modules/access-control/domain/AdminLockoutRule.gs)): the last active admin cannot be deactivated, deleted or lose the admin role (`last_admin`); the caller cannot do that to themself, nor change their own email (`self_lockout`).

**Data:** no tables of its own; it reads `users`, `roles` and their link sheets. Postgres: [007_access_control.sql](../supabase/migrations/007_access_control.sql) redefines `current_app_role()` and adds RPCs `current_identity()` and `preview_access(uuid)` (admin only). Domain violations raise exceptions whose message is the stable code.

**Limits:** an empty `role` is possible only in previews. Revocation delay is about 2 to 3 minutes (caches), see [identity-api](identity-api.md). Migrations 004-007 are not yet applied to the live Supabase project.
