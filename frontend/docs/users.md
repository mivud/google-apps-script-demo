# users (frontend)

The allowlist of people who may sign in, with their roles and own claims. Backend counterpart: [backend/docs/users.md](../../backend/docs/users.md). Code: [modules/users](../src/modules/users).

## Public API ([index.ts](../src/modules/users/index.ts))

- Types `User` (id, email, active, roleIds, claims, audit), `UserCreateInput`, `UserUpdateInput`; `validateUserEmail` (trim, lowercase), `MAX_ROLES_PER_USER` (20).
- `UserService`: `list`, `get`, `create`, `update(id, input, expectedLastModified)`, `remove`, `assignRole`, `unassignRole`, `addClaim`, `removeClaim`, over the `UserRepository` port.
- `createUserService(config: ProviderConfig)`: Sheets calls `users.user.*`, `users.userRole.*`, `users.userClaim.*`; Supabase uses `users`, `user_roles`, `user_claims` (update filters on `last_modified`; zero rows means `conflict`).

## Rules

- Server codes: `user_email_invalid`, `user_email_duplicate`, `last_admin`, `self_lockout`, `limit_exceeded`, `conflict`, `claim_unknown`. The effective access of a user (merge of role and own claims) is computed by the backend and shown through the access preview of [access-control](access-control.md).
- Assigning a role the user already has is a no-op on both providers.

## UI

[UsersPage](../src/modules/users/ui/pages/users-page.tsx) (`#/identity/users`) and [UserDetailPage](../src/modules/users/ui/pages/user-detail-page.tsx) (`#/identity/users/<id>`): role checklist (checkboxes of all roles + Save, [AssignmentPanel](../src/shared/components/assignment-panel.tsx)), own claims checklist, effective access panel (see the page for edit and delete actions). The list is a `DataTable` (email link, active badge, role names) plus an actions column with `Edit | Delete` icon buttons per row (Edit opens the form dialog; Delete uses the shared delete flow). Delete always uses the shared flow (`useDeleteAction`: confirm dialog, call, toast; errors such as `last_admin` and `self_lockout` are translated), on the list and on the detail page. Admin only; others see a "no access" state (the backend is authoritative).

## Limits

No paging. Fake for tests: [in-memory-user-repository](../src/modules/users/testing/in-memory-user-repository.ts).
