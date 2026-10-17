# access-control (module of identity-api)

**Purpose:** decides what a verified Google identity may do: sign-in, effective roles and claims, permission authorization and lockout rules. It replaces the former `auth` module. Code: [modules/access-control](../apps-script-identity-api/src/modules/access-control). Setup, nonce and revocation: [identity-api](identity-api.md). Related: [users](users.md), [roles](roles.md), [claims](claims.md).

**Actions**

| Action | Input | Result |
|---|---|---|
| `auth.session.get` | `idToken`, `payload.nonce` | `{ email, role, roles, claims }` |
| `auth.access.resolve` | `idToken` | `{ email, role, roles, claims }` |
| `access-control.access.preview` | `payload.user_id` (needs `identity.read`) | same shape for that user; the target need not be active; `role` may be `''` |

`roles` are role names sorted; `role` is the primary role and may be any string (or `''`); `claims` are the effective claims. The names `auth.*` are kept for compatibility.

**Permission matrix** ([PermissionAuthorizationService](../apps-script-identity-api/src/modules/access-control/application/authorization/PermissionAuthorizationService.gs)): the caller needs the claim `permission=identity.read` or `permission=identity.write`, or the role `super`. A role named exactly `super` (case-sensitive) passes every check; there is no `admin` or `viewer` special case. Missing or malformed claims fail closed with `FORBIDDEN`. `identity.write` does not imply `identity.read`: grant both to a full editor.

| Actions | Needs |
|---|---|
| `claims.claim.list`, `roles.role.list`, `roles.role.get`, `users.user.list`, `users.user.get`, `access-control.access.preview` | `identity.read` |
| every other `claims.*`, `roles.*`, `users.*` action (create, update, delete, add/remove claim, assign/unassign role) | `identity.write` |
| `auth.session.get`, `auth.access.resolve` | a known active user (no permission) |

**Rules** ([EffectiveAccess](../apps-script-identity-api/src/modules/access-control/domain/EffectiveAccess.gs))
1. Role names = names of the user's `user_roles`. The legacy `users.role` column is ignored.
2. Primary `role` = `super` if the names contain it (exact), else the first role name in sorted order, else `''`. Only unknown or inactive users are refused with `FORBIDDEN`; a known active user with no roles and no claims signs in (the frontend then shows no apps).
3. Effective claims = role claims plus own claims, additive, distinct and sorted by key, then value. A role claim is dropped only when the user owns the exact same (key, value). Example: r1{a=1,b=2}, r2{a=3}: user{} gives a=1,a=3,b=2; user{a=9} gives a=1,a=3,a=9,b=2; user{b=2} gives a=1,a=3,b=2.
4. Lockout ([SuperLockoutRule](../apps-script-identity-api/src/modules/access-control/domain/SuperLockoutRule.gs)): the last active super cannot be deactivated, deleted or lose the `super` role (`last_super`); the caller cannot do that to themself, nor change their own email (`self_lockout`).

**Data:** no tables of its own; it reads `users`, `roles` and their link sheets. Postgres: [007_access_control.sql](../supabase/migrations/007_access_control.sql) redefines `current_app_role()` and adds RPCs `current_identity()` and `preview_access(uuid)` (Supabase side is not changed by the permission refactor). Domain violations raise exceptions whose message is the stable code.

**Limits:** an empty `role` means the user has no roles. Revocation delay is about 2 to 3 minutes (caches), see [identity-api](identity-api.md). Migrations 004-007 are not yet applied to the live Supabase project.
