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

[UsersPage](../src/modules/users/ui/pages/users-page.tsx) (`#/identity/users`) and [UserDetailPage](../src/modules/users/ui/pages/user-detail-page.tsx) (`#/identity/users/<id>`): role panel, own claims, effective access panel (see the page for edit and delete actions). Admin only; others see a "no access" state (the backend is authoritative).

## Limits

No paging. Fake for tests: [in-memory-user-repository](../src/modules/users/testing/in-memory-user-repository.ts).
