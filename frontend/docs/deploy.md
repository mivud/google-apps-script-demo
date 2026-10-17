# Deploy

## GitHub Pages (current)

Workflow: [deploy-pages.yml](../../.github/workflows/deploy-pages.yml). Runs on push to `main` and manual dispatch: `npm ci`, `npm run build` in `frontend/`, then publishes `frontend/dist`.

Setup:
1. Repo Settings > Pages > Source: **GitHub Actions**.
2. Repo Settings > Secrets and variables > Actions > **Variables**: `VITE_DB_PROVIDER`, `VITE_SHEETS_API_URL`, `VITE_IDENTITY_API_URL`, `VITE_EXPENSE_API_URL`, `VITE_GOOGLE_CLIENT_ID` (the first, second and fourth are **done**; `VITE_EXPENSE_API_URL` must be added once the expense web app is deployed, the workflow fails without it for `sheets`). For Supabase also `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The workflow passes them to the build.
3. Merge to `main`.

The workflow reads the Pages settings with `actions/configure-pages` and sets the build base path itself, so nothing has to be changed when switching between a custom domain and `github.io`:

| Pages setting | Site URL | Base path |
|---|---|---|
| Custom domain set | `https://nexus.vdminh.blog/` | `/` |
| No custom domain | `https://<user>.github.io/<repo>/` | `/<repo>/` |

The repository variable `VITE_BASE_PATH`, when set, overrides the detected value; leave it unset normally. A wrong base path makes every asset 404. Pages has no rewrites, so the build also emits [404.html](../404.html) as the SPA fallback (see [launcher](launcher.md)): deep links and refreshes work on the clean URLs.

### Custom domain setup

1. DNS: for a subdomain such as `nexus.vdminh.blog` create a `CNAME` record `nexus` pointing to `<user>.github.io` (no repo path). For an apex domain create `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. With Cloudflare keep the record DNS-only while GitHub issues the certificate; if proxied, set SSL/TLS to Full (not Flexible).
2. Repo Settings > Pages > Custom domain: enter the domain, Save, wait for the DNS check, then tick **Enforce HTTPS**. No `CNAME` file is needed with the GitHub Actions source.
3. Optional: verify the domain in the account Settings > Pages > Add a domain (a `TXT` record) so nobody else can claim it.
4. Add the domain to the Google OAuth client (origin `https://<domain>`, redirect URI `https://<domain>/auth/callback`, see [google-oauth-setup](../../backend/docs/google-oauth-setup.md)).
5. Re-run the workflow (push to `main` or Run workflow). Hard-reload the browser to drop a cached `index.html`.

To go back to `github.io`, remove the custom domain in Settings > Pages and re-run the workflow; keep the `github.io` origin and redirect URI in the OAuth client.

### Deploy scripts (force a base path)

Two PowerShell scripts in [scripts](../../scripts) set the repository variable `VITE_BASE_PATH` and start the workflow on `main` with `gh` (sign in once with `gh auth login`; add `-Watch` to follow the run). Use them only to force a mode; note that they leave the variable set, which then overrides the automatic detection until it is deleted (Settings > Secrets and variables > Actions > Variables).

| Script | Base path | Use for |
|---|---|---|
| `scripts/deploy-custom-domain.ps1` | `/` | `https://nexus.vdminh.blog/` |
| `scripts/deploy-github-pages.ps1` | `/<repo>/` | `https://<user>.github.io/<repo>/` |

The workflow file and the code on `main` are what get built, so merge changes first.

## Cloudflare Pages (planned)

Build command `npm run build`, root `frontend`, output `dist`, with `VITE_BASE_PATH=/` and the same `VITE_*` vars. Client-side routes need the SPA fallback `public/_redirects` (`/* /index.html 200`), which is already in the repo.

## Security

All `VITE_*` values are embedded in the public bundle. Treat them as public: use only the Supabase anon key (protected by RLS) the public Google client id and the Apps Script URLs (access is enforced by the Google ID token, not by a shared token). Never put service-role keys or real secrets here. See [config](config.md).
