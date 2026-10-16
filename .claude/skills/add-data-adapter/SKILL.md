---
name: add-data-adapter
description: Add a new database provider adapter behind the DataService interface. Use when supporting a new backend (e.g. Firebase, Airtable).
disable-model-invocation: true
---

# Add a data adapter

Requires an approved plan (see `plan-feature`).

1. Read `src/core` `DataService` interface and an existing adapter as reference.
2. Create `src/adapters/<provider>/` implementing every `DataService` method with the same semantics (errors, ordering, pagination, UUID ids).
3. Register the provider in the factory under `src/config/`; allow selecting it via `VITE_DB_PROVIDER`.
4. Do not modify `core/`, `services/`, or `ui/` (open/closed). If a change is unavoidable, stop and ask.
5. Document the provider and setup steps in `docs/` (English, Mermaid diagram if useful).
6. Stop for user review. Do not run tests or commit.
