# Backend docs

Two interchangeable storage backends behind one API contract: a Google Apps Script Web App over a Google Sheet, and Supabase (Postgres). Column names are identical in both.

## Index

| Doc | Purpose |
|---|---|
| [apps-script.md](apps-script.md) | API contract, clean-architecture layout, audit columns, sheets, setup and clasp workflow, tests (`npm test`) |
| [device-management.md](device-management.md) | Device-management module: equipment, category and maintenance log actions, rules, ports |
| [supabase.md](supabase.md) | Postgres schema, audit triggers, category rules, RLS policies |

## Architecture

- Apps Script code lives in [backend/apps-script/src](../apps-script/src): `Main.gs` entry points, `composition/` wiring, `shared/` building blocks (one file per class) and `modules/device-management`.
- Each module has `domain`, `application`, `endpoints` and `persistence/googlesheet` layers; dependencies point inward and parts talk only through ports.
- Supabase SQL lives in [backend/supabase/migrations](../supabase/migrations): `001_init.sql` (schema, triggers) and `002_rls_policies.sql`.
- Both backends give the same ordering, pagination, validation codes and server-filled audit fields.

Frontend side: see [frontend docs](../../frontend/docs/README.md).
