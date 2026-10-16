# Backend docs

Two interchangeable storage backends behind one API contract: a Google Apps Script Web App over a Google Sheet, and Supabase (Postgres). Column names are identical in both.

## Index

| Doc | Purpose |
|---|---|
| [apps-script.md](apps-script.md) | API contract, clean-architecture layout, audit columns, sheets, setup and clasp workflow, tests (`npm test`) |
| [device-management.md](device-management.md) | Device-management module: equipment, category and maintenance log actions, rules, ports |
| [supabase.md](supabase.md) | Postgres schema, audit triggers, category rules, RLS policies |

## Architecture

- Apps Script code lives in [backend/apps-script/src](../apps-script/src): `Main.gs` entry points, `composition/` wiring, `modules/device-management`. The `shared/` building blocks (one file per class) are a separate library project in [backend/apps-script-shared-kernel-library](../apps-script-shared-kernel-library), see [shared-library](shared-library.md).
- Each module has `domain`, `application`, `endpoints` and `persistence/googlesheet` layers; dependencies point inward and parts talk only through ports.
- Supabase SQL lives in [backend/supabase/migrations](../supabase/migrations): `001_init.sql` (schema, triggers) and `002_rls_policies.sql`.
- Both backends give the same ordering, pagination, validation codes and server-filled audit fields.

Frontend side: see [frontend docs](../../frontend/docs/README.md).
- Setup errors and fixes (login, permissions, library, deploy): [apps-script-troubleshooting](apps-script-troubleshooting.md).
## Versioning

- The backend version lives in [package.json](../apps-script/package.json), format `1.0.x-beta.N` (SemVer pre-release), currently `1.0.0-beta.1`.
- While in beta, only the beta number goes up (`beta.2`, `beta.3`, ...), once per release, in a `chore(release): bump backend to <version>` commit. `x` and the `-beta` suffix change only when the user announces the official version.
- The API reports this version (`system.version.get` and `doGet`); keep `API_VERSION` in [SystemEndpoints.gs](../apps-script/src/composition/SystemEndpoints.gs) equal to it (a test checks this).
- Apps Script deployment and library versions are plain integers managed by Google; they are separate from this version.
