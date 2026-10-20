# Backend docs

Two interchangeable storage backends behind one API contract: a Google Apps Script Web App over a Google Sheet, and Supabase (Postgres). Column names are identical in both.

## Index

| Doc | Purpose |
|---|---|
| [apps-script.md](apps-script.md) | API contract, clean-architecture layout, audit columns, sheets, setup and clasp workflow, tests (`npm test`) |
| [identity-api.md](identity-api.md) | Standalone identity Web App: token verification, allowlist, roles, setup steps |
| [expense-api.md](expense-api.md) | Standalone expense Web App: money sources, fixed expense templates, expenses, claims, setup runbook |
| [access-control.md](access-control.md) | Sign-in, effective roles/claims, admin authorization, lockout rules |
| [users.md](users.md) | Users module: allowlist, role assignment, own claims |
| [roles.md](roles.md) | Roles module: built-in roles, role claims |
| [claims.md](claims.md) | Claims module: claim catalog |
| [auth.md](auth.md) | Token verification and how apps-script uses identity-api |
| [google-oauth-setup.md](google-oauth-setup.md) | Google Cloud project and OAuth Web client for Sign in with Google, where the Client ID goes |
| [device-management.md](device-management.md) | Device-management module: equipment, category and maintenance log actions, rules, ports |
| [supabase.md](supabase.md) | Postgres scripts per area (api, users, device management, expense tracking), audit triggers, RLS policies |
| [supabase-setup.md](supabase-setup.md) | Step-by-step Supabase project setup: scripts, Google sign-in, first super user, permissions, frontend config, verification |
| [firebase.md](firebase.md) | Firestore collections, `firestore.rules`, the callable `api` function, full action list, rules and error codes |
| [firebase-setup.md](firebase-setup.md) | Step-by-step Firebase project setup: Firestore, Google sign-in, deploy, seed, first super user, frontend config, verification |

## Architecture

- Apps Script code lives in [backend/apps-script-device-api/src](../apps-script-device-api/src): `Main.gs` entry points, `composition/` wiring, `modules/device-management`. The identity modules (`claims`, `roles`, `users`, `access-control`) live in [backend/apps-script-identity-api](../apps-script-identity-api) (a separate Web App). The `shared/` building blocks (one file per class) are a separate library project in [backend/apps-script-shared-kernel-library](../apps-script-shared-kernel-library), see [shared-library](shared-library.md).
- Each module has `domain`, `application`, `endpoints` and `persistence/googlesheet` layers; dependencies point inward and parts talk only through ports.
- Supabase SQL lives in [backend/supabase/migrations](../supabase/migrations), one script per area, run in order: `001_api.sql` (shared helpers, access resolution, RPCs), `002_users.sql` (users, roles, claims), `003_device_management.sql`, `004_expense_tracking.sql` (one script per module). The old incremental scripts are kept in [legacy](../supabase/legacy) for reference only.
- Both backends give the same ordering, pagination, validation codes and server-filled audit fields.

Frontend side: see [frontend docs](../../frontend/docs/README.md).
- Setup errors and fixes (login, permissions, library, deploy): [apps-script-troubleshooting](apps-script-troubleshooting.md).
## Versioning

- The backend version lives in [package.json](../apps-script-device-api/package.json), format `1.0.x-beta.N` (SemVer pre-release), currently `1.0.0-beta.1`.
- While in beta, only the beta number goes up (`beta.2`, `beta.3`, ...), once per release, in a `chore(release): bump backend to <version>` commit. `x` and the `-beta` suffix change only when the user announces the official version.
- The API reports this version (`system.version.get` and `doGet`); keep `API_VERSION` in [SystemEndpoints.gs](../apps-script-device-api/src/composition/SystemEndpoints.gs) equal to it (a test checks this).
- The shared kernel library has its own `1.0.x-beta.N` version, see [shared-library](shared-library.md).
- Apps Script deployment and library versions are plain integers managed by Google; they are separate from these versions. Put the project version in their description (`clasp deploy -d "v<version>"`, `clasp create-version "v<version>"`).
