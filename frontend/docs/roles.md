# roles (frontend)

Named groups of claims. Backend counterpart: [backend/docs/roles.md](../../backend/docs/roles.md). Code: [modules/roles](../src/modules/roles).

## Public API ([index.ts](../src/modules/roles/index.ts))

- Types `Role` (id, name, description, claims, audit fields) and `RoleInput`; `BUILT_IN_ROLE_NAMES` (`super`, which cannot be renamed or deleted), `isBuiltInRoleName`, `validateRoleInput`.
- `RoleService`: `list`, `get`, `create`, `update(id, input, expectedLastModified)`, `remove`, `addClaim`, `removeClaim`, over the `RoleRepository` port.
- `createRoleService(config: ProviderConfig)`: Sheets calls `roles.role.*` and `roles.roleClaim.*`; Supabase uses the `roles` and `role_claims` tables.

## Rules

- Name `^[a-z][a-z0-9_-]{1,31}$`, description at most 200 chars. Server codes handled in the UI: `role_name_duplicate`, `role_protected`, `role_in_use`, `claim_unknown`, `claim_duplicate`, `limit_exceeded`, `conflict`.
- Edits send the `lastModified` the user saw; a stale value shows the conflict message and a reload. Legacy rows have an empty `lastModified`; the client sends `''`.

## UI

[RolesPage](../src/modules/roles/ui/pages/roles-page.tsx) (`/identity/roles`) and [RoleDetailPage](../src/modules/roles/ui/pages/role-detail-page.tsx) (`/identity/roles/<id>`) with form dialog and claim assignment. The list is a `DataTable` (name link, built-in badge, claim count, description) plus an actions column with `Edit | Delete` icon buttons per row (Delete hidden for built-in roles). Delete uses the shared `useDeleteAction` flow (confirm dialog, toast, translated errors such as `role_in_use`) on the list and the detail page. The backend refuses to rename or delete built-in roles (`role_protected`).

## Limits

No paging. Fake for tests: [in-memory-role-repository](../src/modules/roles/testing/in-memory-role-repository.ts).
