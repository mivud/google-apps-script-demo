# roles (module of identity-api)

**Purpose:** named groups of claims that can be assigned to users. Code: [modules/roles](../apps-script-identity-api/src/modules/roles). Related: [claims](claims.md), [users](users.md), [access-control](access-control.md), [identity-api](identity-api.md).

**Actions** (admin only; `list` and `get` are read actions):

| Action | Payload | Result |
|---|---|---|
| `roles.role.list` | none | `{ items: Role[] }` |
| `roles.role.get` | `id` | `Role` |
| `roles.role.create` | `name`, `description` (optional) | `Role` |
| `roles.role.update` | `id`, `name`, `description`, `expected_last_modified` | `Role` |
| `roles.role.delete` | `id` | `{}` |
| `roles.roleClaim.add` / `remove` | `role_id`, `key`, `value` | `Role` |

`Role` = `{ id, name, description, claims: [{key,value}], created, created_by, last_modified, last_modified_by }`.

**Rules**
- Name `^[a-z][a-z0-9_-]{1,31}$` (`role_name_invalid`), unique case-insensitively (`role_name_duplicate`); description at most 200 chars (`role_description_invalid`); max 100 claims per role (`limit_exceeded`).
- Built-in roles `admin` and `viewer` are seeded (created_by `system`) under the write lock while the `roles` sheet is empty ([SeedBuiltInRoles](../apps-script-identity-api/src/modules/roles/application/role/commands/SeedBuiltInRoles.gs)). They cannot be renamed or deleted (`role_protected`).
- A role assigned to a user cannot be deleted (`role_in_use`). Deleting a role removes its claim rows. Adding a claim needs it in the catalog (`claim_unknown`), duplicates are `claim_duplicate`.
- Update is optimistic: send the `last_modified` the client saw; a mismatch is `conflict`. Rows created before the audit columns have an empty `last_modified`, so clients send `''`.

**Data:** sheets `roles` (`id,name,description` + audit) and `role_claims` (`role_id,key,value` + audit); Postgres [005_roles.sql](../supabase/migrations/005_roles.sql). Writes clear the row cache of the sheets they change.

**Limits:** no paging; the role list is loaded whole for every access check (small data, cached about 60 s).
