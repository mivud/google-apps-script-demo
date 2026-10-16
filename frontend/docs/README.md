# Frontend docs

Static Vite + React + TypeScript app (responsive, English and Vietnamese). Data provider is chosen by config only.

## Index

| Doc | Purpose |
|---|---|
| [device-management.md](device-management.md) | Module: domain, services, adapters, contract tests, UI, async pattern |
| [config.md](config.md) | Env vars, provider factory, base path, data flow |
| [design-system.md](design-system.md) | Admin-style theme: tokens, 7 accents, light/dark/system, shared components, TreeList, DataTable |
| [i18n.md](i18n.md) | Catalogs, language detection, error translation |
| [deploy.md](deploy.md) | GitHub Pages workflow, Cloudflare Pages plan, security |

## Architecture

- Code in [frontend/src](../src): `app/` (composition root: env, factory, App), `shared/` (errors, i18n, async hooks, common components), `modules/device-management/` (`domain`, `application` ports and services, `infrastructure/persistence/{googlesheet,supabase}`, `ui`, public `index.ts`). Dependencies point inward; `shared` never imports modules.
- UI calls services only; services depend on `DataService`; adapters are the only code that does network access.
- [app](../src/app) reads `VITE_*` env vars and the factory injects the chosen adapter.
- Hash routes: `#/`, `#/equipment/<id>`, `#/categories`.
- Text is localized through a small in-house i18n layer (`en`, `vi`).

Backend side: see [backend docs](../../backend/docs/README.md).
## Versioning

- The frontend version lives in [package.json](../package.json) (keep `package-lock.json` in sync), format `1.0.x-beta.N` (SemVer pre-release), currently `1.0.0-beta.1`.
- While in beta, only the beta number goes up (`beta.2`, `beta.3`, ...), once per release, in a `chore(release): bump frontend to <version>` commit. `x` and the `-beta` suffix change only when the user announces the official version.
- The app reads it at build time and shows it, with the backend version, at the bottom of the settings menu.

## Naming

- Every file and folder under `frontend/` is lowercase kebab-case, including React components (`app-shell.tsx`, `use-async-data.ts`, `in-memory-data-service.ts`). File names never use PascalCase or camelCase.
- Identifiers inside the code keep the language convention: components, classes and types in PascalCase (`AppShell`), functions and variables in camelCase, constants in UPPER_SNAKE_CASE.
- Backend Apps Script files are different: PascalCase `.gs` files (see Naming convention in CLAUDE.md).
