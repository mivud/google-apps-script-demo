# Deploy

## GitHub Pages (current)

Workflow: [deploy-pages.yml](../../.github/workflows/deploy-pages.yml). Runs on push to `main` and manual dispatch: `npm ci`, `npm run build` in `frontend/`, then publishes `frontend/dist`.

Setup:
1. Repo Settings > Pages > Source: **GitHub Actions**.
2. Repo Settings > Secrets and variables > Actions > **Variables**: `VITE_DB_PROVIDER`, `VITE_SHEETS_API_URL`, `VITE_IDENTITY_API_URL`, `VITE_GOOGLE_CLIENT_ID` (status: **done**, all four are set). For Supabase also `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The workflow passes them to the build.
3. Merge to `main`.

The workflow sets `VITE_BASE_PATH=/<repo>/` automatically. Pages has no rewrites, so the build also emits [404.html](../404.html) as the SPA fallback (see [launcher](launcher.md)): deep links and refreshes work on the clean URLs.

## Cloudflare Pages (planned)

Build command `npm run build`, root `frontend`, output `dist`, with `VITE_BASE_PATH=/` and the same `VITE_*` vars. Client-side routes need the SPA fallback `public/_redirects` (`/* /index.html 200`), which is already in the repo.

## Security

All `VITE_*` values are embedded in the public bundle. Treat them as public: use only the Supabase anon key (protected by RLS) the public Google client id and the Apps Script URLs (access is enforced by the Google ID token, not by a shared token). Never put service-role keys or real secrets here. See [config](config.md).
