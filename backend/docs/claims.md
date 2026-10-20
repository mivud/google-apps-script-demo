# claims (module of identity-api)

**Purpose:** the catalog of claims (`key` + `value` pairs such as `device.write=true`) that roles and users may hold. Code: [modules/claims](../apps-script-identity-api/src/modules/claims). Setup and envelope: [identity-api](identity-api.md). Related: [roles](roles.md), [users](users.md), [access-control](access-control.md).

**Actions** (`list` needs `identity.read`, create and delete need `identity.write`, or the role `super`; the list is a read action and runs without the write lock):

| Action | Payload | Result |
|---|---|---|
| `claims.claim.list` | none | `{ items: [{ key, value }] }` (only key and value, no audit fields) |
| `claims.claim.create` | `key`, `value` | `{ key, value }` |
| `claims.claim.delete` | `key`, `value` | `{}` |

**Rules**
- `Claim` is a value object: key `^[a-z][a-z0-9_.:-]{0,63}$` (`claim_key_invalid`), value 1-200 chars without control characters (`claim_value_invalid`).
- The pair is unique (`claim_duplicate`). A claim held by any role or user cannot be deleted (`claim_in_use`); adding a claim to a role or user requires it to exist here (`claim_unknown`).
- Sorted by key, then value (plain string compare, [ClaimOrder](../apps-script-identity-api/src/shared/ClaimOrder.gs)).

**Data:** sheet `claims` (`key,value` + audit columns `created,created_by,last_modified,last_modified_by`), Postgres table `claims` ([002_users.sql](../supabase/migrations/002_users.sql)). Audit fields are filled by the server, never sent by clients.

**Errors:** domain failures are `VALIDATION` with the stable code as `error.message`; malformed payload types give `VALIDATION` `invalid_request`.

**Limits:** no paging (data is small); no update action (delete and create instead).
