# Apps Script setup: errors and fixes

**Purpose:** a log of the problems hit while configuring the Apps Script projects (login, permissions, library, deploy), each with the symptom, cause and fix, in the order they were met. Setup steps themselves live in [apps-script](apps-script.md) and [shared-kernel-library](shared-library.md).

**Projects:** app `apps-script-demo` (clasp root [apps-script](../apps-script-device-api)) and library `shared-kernel-library` (clasp root [apps-script-shared-kernel-library](../apps-script-shared-kernel-library)), imported by the app as `SharedKernelLibrary`.

## 1. Login and permissions

**1.1 `clasp login` succeeds but every call fails with "Request had insufficient authentication scopes".**
- Cause: the consent screen lists granular checkboxes. If `script.projects` is left unticked the login still says "logged in".
- Fix: run `clasp login` again (interactive; run it yourself, never scripted) and tick every box.
- Minimum scopes clasp needs here: `script.projects` (push, create version) and `script.deployments` (deploy), plus `openid`, `email`, `profile`. `script.webapp.deploy`, Drive, Cloud and logging were not needed.
- Verify without printing the token: send the access token from `~/.clasprc.json` to `https://oauth2.googleapis.com/tokeninfo` and print only the scope names.

**1.2 The Apps Script API must be on for your account.** If `clasp push` answers that the API is disabled, enable it at script.google.com/home/usersettings ("Google Apps Script API").

**1.3 First run asks for authorization (web app and editor).** The app manifest declares one OAuth scope, `https://www.googleapis.com/auth/spreadsheets`. Approve it once as the deploying account. After a manifest change that adds a scope or a service, approve again.

**1.4 Web app access.** `appsscript.json` uses `executeAs: USER_DEPLOYING` and `access: ANYONE_ANONYMOUS`, so the API runs as the deployer and the browser needs no Google login. Access control is the Google ID token plus the role resolved by [identity-api](identity-api.md).

**1.5 Script properties (set by hand, never committed).** Project Settings > Script properties of the **app**: `GOOGLE_CLIENT_ID`, `IDENTITY_API_URL` (identity-api `/exec` URL) and `SPREADSHEET_ID`. The identity-api project has its own `GOOGLE_CLIENT_ID` and `SPREADSHEET_ID`. The app writes `SCHEMA_SIGNATURE` itself. Never log or paste tokens.

**1.6 API returns `INTERNAL` with "You do not have permission to call UrlFetchApp.fetch ... script.external_request".**
- Cause: the new scope was never authorized; `doGet`/`doPost` of a web app never show a consent prompt.
- Fix: in the Apps Script editor run `authorizeScopes`, tick all permissions, then retry.

**1.7 Sign-in says "This Google account is not allowed" although the email is in the sheet.**
- Cause: the `active` column must hold the text `TRUE`/`true`; a number `1` is not accepted.
- Fix: set the cell to `TRUE` (text or boolean) and retry.

**1.8 Very slow first request, or sign-in stuck on "Signing in...".**
- Cause: Apps Script cold start. The frontend aborts after 45 s and offers a retry. The first data request after sign-in runs alone to fill the access cache.
- Fix: retry; later requests are fast.

**1.9 Sign-in fails with a nonce error.**
- Cause: the nonce was sent outside `payload`.
- Fix: send the nonce inside `payload`. See [identity-api](identity-api.md).

## 2. clasp and project files

**2.1 `clasp push` asks to overwrite the manifest.** Use `clasp push --force` after you changed `appsscript.json`.

**2.2 Push fails with a placeholder id.** `.clasp.json` and the library `libraryId` hold the real Script ID of the Google project. Create the project first (script.google.com), copy the id from its URL, then push. Naming rules are in CLAUDE.md ("Naming convention").

**2.3 A deleted project cannot be reused.** If someone trashes the library project the page says "Project is in the trash". Create a new project and replace its Script ID in `apps-script-shared-kernel-library/.clasp.json` and in the app's `appsscript.json` (`libraryId`), then create a new version.

**2.4 `clasp list-scripts` can hang** (over 60 s). Skip it; open the project URL instead.

## 3. Deploy

**3.1 `clasp push` does not change the live Web App.** The Web App runs a numbered version. After each push run `clasp deploy -i <deploymentId> -d "<text>"`. Updating the same deployment keeps the URL, so the frontend needs no change. List ids with `clasp deployments`. The `@HEAD` deployment is only for testing.

**3.2 Smoke test.** `curl -sL <url>` must return `{"ok":true,"data":{"service":"equipment-api"}}`. For POST use `curl -sL -H 'Content-Type: text/plain' -d '<json>'`. The first call after a deploy is slow (cold start, 2 to 9 s); measure from the second call.

## 4. Library problems

**4.1 The library needs a version.** `clasp create-version "<text>"` in the library folder, then put the number in the app's `appsscript.json` (`dependencies.libraries[].version`) and push the app. The app keeps running the pinned version until you bump it. Share the library with the deploying account (Viewer is enough).

**4.2 `Invalid token` although the token is correct.**
- Symptom: every action returns `UNAUTHORIZED`; `GOOGLE_CLIENT_ID` is the same in both projects and in the frontend.
- Cause: inside a library the global `PropertiesService`, `CacheService` and `LockService` use the library project's own stores, not the app's. The verifier read the library's empty properties.
- Fix: the app passes its own handles in [Composition.gs](../apps-script-device-api/src/composition/Composition.gs): `ScriptSettings.fromProperties(PropertiesService.getScriptProperties())`, `new ScriptRowCache(CacheService.getScriptCache())`, `new ScriptLockGuard(LockService.getScriptLock())`. Library code must never call those three services itself.

**4.3 `Sheets API has not been enabled for the Cloud project managed by Apps Script`.**
- Symptom: `INTERNAL` error on every read (message in the account language).
- Cause: the Sheets advanced service (v4) must be declared where the code runs. Declaring it only in the library did not enable the API for the app's Cloud project.
- Fix: declare `Sheets` v4 in `enabledAdvancedServices` of the **app** manifest too, push and deploy, then wait a few minutes. With a standard Cloud project, also enable "Google Sheets API" there.
- Safety net: `SpreadsheetSource` logs a warning and falls back to `SpreadsheetApp` when the API call fails, so the API keeps working while the API is still being enabled. Check Executions logs for "Sheets API read failed" to see whether the fast path is active.

**4.4 Library exposes only top-level `function` and `var`.** `const`, `let` and `class` at the top level are invisible to the app. The app reaches library names through the aliases in [SharedLibrary.gs](../apps-script-device-api/src/SharedLibrary.gs), which must load first in `filePushOrder`.

## 5. Quick checklist from scratch

1. `clasp login` with `script.projects` and `script.deployments` ticked; Apps Script API on.
2. Create the library project `shared-kernel-library`; put its Script ID in its `.clasp.json` and in the app manifest `libraryId`.
3. In `backend/apps-script-shared-kernel-library`: `clasp push --force`, `clasp create-version "..."`.
4. Put the version in the app manifest; in `backend/apps-script-device-api`: `clasp push --force`.
5. In the app project set `GOOGLE_CLIENT_ID`, `IDENTITY_API_URL` and `SPREADSHEET_ID` (identity-api must be set up first, see [identity-api](identity-api.md)); authorize the scopes once.
6. `clasp deploy -i <deploymentId> -d "..."`, smoke test, then call `device-management.equipment.list` with a Google ID token of an allowlisted user.
