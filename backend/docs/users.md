# users (module of identity-api)

**Purpose:** the allowlist of people who may sign in, with their roles and own claims. Code: [modules/users](../apps-script-identity-api/src/modules/users). Related: [roles](roles.md), [claims](claims.md), [access-control](access-control.md), [identity-api](identity-api.md).

**Actions** (admin only; `list` and `get` are read actions):

| Action | Payload | Result |
|---|---|---|
| `users.user.list` | none | `{ items: User[] }` |
| `users.user.get` | `id` | `User` |
| `users.user.create` | `email`, `active`, `role_ids` (optional) | `User` |
| `users.user.update` | `id`, `email`, `active`, `expected_last_modified` | `User` (`active=false` deactivates) |
| `users.user.delete` | `id` | `{}` |
| `users.userRole.assign` / `unassign` | `user_id`, `role_id` | `User` |
| `users.userClaim.add` / `remove` | `user_id`, `key`, `value` | `User` |

`User` = `{ id, email, active, role_ids, claims, created, created_by, last_modified, last_modified_by }`. The legacy `role` column is never exposed.

**Rules**
- Email is normalized (trim, lowercase) in the `Email` value (`user_email_invalid`), unique (`user_email_duplicate`). Control characters are refused. Max 20 roles and 100 own claims per user, and 1000 rows each in `users`, `roles` and `claims` (`limit_exceeded`). Role and claim assignment changes stamp `last_modified` / `last_modified_by` on the parent user or role. Known gap until phase 2 backfills `user_roles`: a legacy user without `user_roles` rows stays admin via the fallback after their last explicit role is unassigned.
- Unknown role or user ids are `NOT_FOUND`; a role that does not exist cannot be assigned. Own claims must exist in the catalog (`claim_unknown`).
- Deleting a user removes its `user_roles` and `user_claims` first.
- Lockout rules (`last_admin`, `self_lockout`) are checked through the access-control port, see [access-control](access-control.md).
- Update is optimistic (`conflict`). Updating keeps the legacy `users.role` value as read, so a legacy user does not lose the fallback role. Legacy rows have an empty `last_modified`; clients send `''`.

**Data:** sheets `users` (`id,email,role,active` + audit), `user_roles` (`user_id,role_id` + audit), `user_claims` (`user_id,key,value` + audit); Postgres [006_users_roles_claims.sql](../supabase/migrations/006_users_roles_claims.sql). `role` is LEGACY (phase 1 fallback), written empty for new users; phase 2 drops it, see the runbook in [identity-api](identity-api.md).

**Limits:** no paging; each read joins three sheets in memory.
