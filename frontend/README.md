# Frontend

Vite + React + TypeScript. Module docs live in [docs/](docs/); start with [docs/config.md](docs/config.md) and [docs/deploy.md](docs/deploy.md). UI styling, themes and shared components: [docs/design-system.md](docs/design-system.md).
Source layout: `src/app` (composition), `src/shared` (components, theme, i18n, hooks), `src/modules/device-management` (domain, application, infrastructure, ui).
Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm test` (unit tests with the in-memory fake, no network), `npm run test:contract` (needs `.env`; writes to the real sheet/Supabase project, use a test one).
Environment variables (put them in `.env.local`, never commit): `VITE_DB_PROVIDER` (`sheets` or `supabase`), `VITE_BASE_PATH`.
Sheets provider: `VITE_SHEETS_API_URL` and `VITE_IDENTITY_API_URL` (see [identity-api](../backend/docs/identity-api.md)); requests carry a Google ID token, no shared token.
Google login (all providers): `VITE_GOOGLE_CLIENT_ID` (public value, see [docs/auth.md](docs/auth.md)).
Supabase provider: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
