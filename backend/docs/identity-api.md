# identity-api (Apps Script Web App)

**Purpose:** a standalone Web App that owns Google ID token verification, the allowlist and roles. Other backends (today `apps-script`, device-management) ask it who a token belongs to. Code: [backend/apps-script-identity-api](../apps-script-identity-api). Module details: [auth](auth.md).

**Contract:** same envelope as the other API: `POST` `text/plain` JSON `{ idToken, action, payload }` (token at the top level) -> `{ ok, data }` or `{ ok, error: { code, message } }`. `doGet` returns `{ service, version }`.

| Action | Input | Result | Caller |
|---|---|---|---|
| `auth.session.get` | `idToken`, `payload.nonce` (raw, 16-128 chars of `A-Za-z0-9_-`) | `{ email, role }` | web client, at sign-in |
| `auth.access.resolve` | `idToken` | `{ email, role }` | other backends (server-to-server) |
| `system.version.get` | none | `{ version }` | anyone |

Both auth actions check `aud` (= `GOOGLE_CLIENT_ID`), `iss`, `exp` and `email_verified`, then the allowlist. Errors stay generic: `UNAUTHORIZED` (any token or nonce problem), `FORBIDDEN` (unknown, inactive or role-less user).

**Nonce:** the client creates a random nonce, passes `sha256(nonce)` (lowercase hex) to Google sign-in, and sends the raw nonce in `auth.session.get`. The server hashes it and compares it with the token `nonce` claim; a mismatch is `UNAUTHORIZED`. A token without a `nonce` claim is refused with the same generic `UNAUTHORIZED`. Domain rules raise typed errors (`invalid_email`, `invalid_nonce`, `nonce_mismatch`) that the endpoints translate to generic `FORBIDDEN` / `UNAUTHORIZED`. Limit: an attacker holding a stolen token together with its nonce can still replay it; the nonce only stops tokens minted for another sign-in attempt. `auth.access.resolve` takes no nonce.

**Data:** the `users` sheet (`id,email,role,active,created_at,updated_at`) lives in the identity spreadsheet, separate from the equipment spreadsheet. Created empty on the first call; nothing is seeded.

**Script Properties:** `GOOGLE_CLIENT_ID`, `SPREADSHEET_ID` (identity spreadsheet). `SCHEMA_SIGNATURE` is written by the app.

**Revocation delay:** token cache 60 s + `IdentityClient` cache 60 s + `users` row cache about 60 s (see [auth](auth.md)). The token is verified before the schema check or any sheet access. Callers pin `IDENTITY_API_URL` to `https://script.google.com/macros/s/<id>/exec`. Role literals `admin`/`viewer` are an API contract.

**Scopes:** `spreadsheets` (accepted because the script is standalone; `drive.file` is a future option), `script.external_request`. Web App: execute as `Me` (deployer), access `Anyone`. The token is the only credential; `auth.access.resolve` only reveals the caller's own email and role.

**Library:** `SharedKernelLibrary` (pinned version in `src/appsscript.json`). It must be a version that has `Sha256Hasher` and the `nonce` field of `GoogleIdTokenVerifier` (publish a new library version and pin it in both apps).

## Setup runbook (no Claude needed)

Each step says who does it and whether it is already done. Values below are real for this repository (none is a secret). Run `clasp` commands from the folder named in the step; you need `clasp login` once.

| # | Step | Status |
|---|------|--------|
| 1 | Google Cloud OAuth client created | Done, see [google-oauth-setup](google-oauth-setup.md) |
| 2 | Shared library pushed and published as **version 6** (`backend/apps-script-shared-kernel-library`: `clasp push -f`, then `clasp create-version "<text>"`) | Done |
| 3 | Version 6 pinned in `backend/apps-script/src/appsscript.json` and `backend/apps-script-identity-api/src/appsscript.json` (`dependencies.libraries[0].version`) | Done |
| 4 | identity-api pushed (`backend/apps-script-identity-api`: `clasp push -f`) | Done |
| 5 | identity-api deployed as Web App (`clasp create-deployment -d "<text>"`). Deployment id `AKfycbx4py-e2k_7QqT1fo1kZvO1Q6ErIqsKyUtMUTaaPhde-HzPqIbme_44eoei2Lvd6JEl`, URL `https://script.google.com/macros/s/AKfycbx4py-e2k_7QqT1fo1kZvO1Q6ErIqsKyUtMUTaaPhde-HzPqIbme_44eoei2Lvd6JEl/exec` | Done |
| 6 | device-management app pushed and version 14 created (`backend/apps-script`: `clasp push -f`, `clasp create-version "<text>"`) | Done |
| 7 | Create the identity spreadsheet `nexus-identity-users`, id `1yPoSbfgJ-y_OJgO3yNwy8b5R-wTPaeA5jAhPKNGJ5Nw` (https://docs.google.com/spreadsheets/d/1yPoSbfgJ-y_OJgO3yNwy8b5R-wTPaeA5jAhPKNGJ5Nw/edit) | Done |
| 8 | Set Script Properties of identity-api (`GOOGLE_CLIENT_ID`, `SPREADSHEET_ID`) | Done; **you still authorize once** (8.4) |
| 9 | Add the first admin row | **You** |
| 10 | Set Script Properties of apps-script (`GOOGLE_CLIENT_ID`, `IDENTITY_API_URL`) | Done; **you still authorize once** (10.3) |
| 11 | Redeploy device-management (`clasp redeploy <deploymentId> -V 14`, URL unchanged; identity-api is live at version 2). Smoke test: `GET` returns `{service: "equipment-api"}`; a POST with a fake or missing `idToken` returns `UNAUTHORIZED` / "Invalid token"; the identity-api `GET` returns `{service: "identity-api"}` | Done (2026-10-17) |
| 12 | Frontend env and GitHub variables | **You** |
| 13 | Supabase Google provider (only if you use the `supabase` provider) | **You** |

### 7. Create the identity spreadsheet
1. Go to https://sheets.new and name it `nexus-identity-users`. It must be a separate file from the equipment spreadsheet.
2. Leave it empty. The API creates the `users` tab with the right headers (`id`, `email`, `role`, `active`, `created_at`, `updated_at`) on the first request that carries a valid Google token, so the first sign-in attempt (which will be refused as "Access denied") creates it; then do step 9. If you prefer to create the tab by hand, name it `users` and use exactly those headers in that order.
3. Copy the spreadsheet id from the URL: `https://docs.google.com/spreadsheets/d/<THIS_PART>/edit`.

### 8. Script Properties of identity-api
1. Open https://script.google.com/d/1frJ2qzPo22k4DK7a8xJSNXVUtXPzbJ8N1VrP9vvw5QjcVtDcaiiSPcVU/edit
2. Project Settings (gear icon) > Script Properties > Add script property:
   - `GOOGLE_CLIENT_ID` = `370199693443-0rlp3k36qjtk1hr6f6r65qfk2i1cpueh.apps.googleusercontent.com`
   - `SPREADSHEET_ID` = the id from step 7
3. Save.
4. Authorize once: in the editor open `Main.gs`, pick the function **`authorizeScopes`** in the toolbar (not `doGet`, which never calls `UrlFetchApp` and so skips the external-service consent) and press Run. Press **Review permissions**, choose your account and, if Google shows "app not verified", press Advanced > Go to project (unsafe).
   - **Tick both permissions on the consent page (or press "Select all"), then Allow.** Google lists them as granular checkboxes and an unticked one is silently skipped:
     - "See, edit, create, and delete all your Google Sheets spreadsheets" (`spreadsheets`): reads the `users` allowlist sheet.
     - "Connect to an external service" (`script.external_request`): calls Google's `tokeninfo` endpoint to verify ID tokens.
   - If one is left unticked the script later fails with "insufficient authentication scopes" or "You do not have permission to call ...". Fix it by running a function again and ticking the missing box (if Google no longer asks, remove the app at https://myaccount.google.com/permissions and repeat).
   - The consent window is a separate pop-up window; if it does not appear, check that the browser did not block pop-ups.

### 9. First admin row
Open the app (or call the API) once with the admin account so the `users` tab exists (it is refused with "Access denied" that first time), then in the `users` tab, row 2: `id` any UUID (for example from https://www.uuidgenerator.net/), `email` the Google account that will sign in, `role` `admin`, `active` `TRUE`, `created_at` and `updated_at` the current time as `2026-10-16T00:00:00.000Z`. **`active` must be the text `TRUE`** (or `true`); `1`, `yes` or an empty cell count as inactive and the sign-in is refused with "This Google account is not allowed to use this app" (the exact message for an email that is not listed or not active). `role` must be exactly `admin` or `viewer`, and the email must match the Google account (case is ignored). Add more rows later for other people (`viewer` for read only). The same email must also be a test user in Google Cloud while the app is in Testing mode.

### 10. Script Properties of apps-script (device-management)
1. Open https://script.google.com/d/10dTqI3hCbe5kdACYwP6X1I_udUAujWK1fxrwR6J-X4oUZTFRfQtLc7AU/edit
2. Project Settings > Script Properties:
   - `GOOGLE_CLIENT_ID` = the same client id as in step 8
   - `IDENTITY_API_URL` = `https://script.google.com/macros/s/AKfycbx4py-e2k_7QqT1fo1kZvO1Q6ErIqsKyUtMUTaaPhde-HzPqIbme_44eoei2Lvd6JEl/exec` (must be exactly this form, ending in `/exec`)
3. Authorize the project again (new `script.external_request` permission). This project has its own consent, separate from identity-api. In the editor open `Main.gs`, pick the function **`authorizeScopes`** in the toolbar (not `doGet`) and press Run, then **Review permissions** and **tick both permissions** ("Sheets spreadsheets" and "Connect to an external service", or "Select all"), then Allow. See step 8.4 for what each permission is for.
   - Why not `doGet`: it never calls `UrlFetchApp`, so running it does not ask for the external-service consent and finishes as "Execution completed" even though the permission is still missing. `authorizeScopes` calls `UrlFetchApp`, so Google asks.
   - Symptom of a missing consent: the app loads after sign-in but every device-management call fails with "Network request failed", and the raw API response is `INTERNAL` with "You do not have permission to call UrlFetchApp.fetch. Required permissions: https://www.googleapis.com/auth/script.external_request" (the message appears in the browser language).
   - After the consent, the deployed Web App works without a redeploy; if it still fails, create a new version and `clasp redeploy` (step 11).
4. The old `API_TOKEN` property is no longer used by the code. After the new setup works you can delete it (Project Settings > Script Properties > Edit > X > Save) so a stale credential does not stay around.

### 11. Redeploy device-management
Redeploy **after** step 10, because the new code refuses requests without these properties and without an `idToken`, so the currently deployed frontend (which sends the old token) stops working until the new frontend is live too.

```
cd backend/apps-script
clasp redeploy AKfycbzekbyuHppNOQaTRrsjt3Q5_HQP7HE_vgUe9EI5mLHbZXAVRkWuO-TuILiCcuJxQkX_OA -V 14 -d "v<version> (library v6, Google login)"
```
The URL stays the same. Check with `clasp deployments`.

### 12. Frontend env and GitHub variables
- Local: in `frontend/.env.local` set `VITE_GOOGLE_CLIENT_ID` (step 8 value) and `VITE_IDENTITY_API_URL` (the identity-api URL above). Remove `VITE_SHEETS_API_TOKEN`.
- GitHub: repository Settings > Secrets and variables > Actions > Variables: add `VITE_GOOGLE_CLIENT_ID` and `VITE_IDENTITY_API_URL`, and delete the old `VITE_SHEETS_API_TOKEN` secret or variable if it exists. Then run the Pages workflow again.

### 13. Supabase (only for `VITE_DB_PROVIDER=supabase`)
Run `backend/supabase/migrations/003_auth.sql` in the SQL editor; Authentication > Providers: enable Google with the client id above, keep the nonce check on, disable every other provider and email signup. Add the admin to the `public.users` table.

### Check it works
1. Open the app, press Sign in with Google with the admin account: the app should load. A Google account that is not in the `users` sheet must see "Access denied".
2. Set the row's `role` to `viewer`, wait about 2 minutes (cache), sign in again: create, edit and delete buttons must be hidden.
3. Problems: see [apps-script-troubleshooting](apps-script-troubleshooting.md).

### After every change
Library change: push, create a new version, pin the new number in both `appsscript.json` files, push both apps. App change: push, create a version, `clasp redeploy <deploymentId> -V <version>` so the URL stays the same.

**Versioning:** [package.json](../apps-script-identity-api/package.json) and `API_VERSION` in [SystemEndpoints.gs](../apps-script-identity-api/src/composition/SystemEndpoints.gs) stay equal, `1.0.x-beta.N`.

**filePushOrder** (in `.clasp.json`): `SharedLibrary.gs`, `AuthModule.gs`, `domain/values/{Role,Email,SessionNonce}`, `domain/entities/User`, `application/access/AccessSupportService`, the two use cases, `persistence/googlesheet/UserRepository`, the two `endpoints/*`, `composition/SystemEndpoints.gs`, `composition/Composition.gs`, `Main.gs` last.
