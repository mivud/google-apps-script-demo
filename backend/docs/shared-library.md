# SharedKernelLibrary (Apps Script)

**Purpose:** building blocks reused by every Apps Script app of this repo, shipped as an Apps Script library so a fix is made once. Code lives in [apps-script-shared-kernel-library](../apps-script-shared-kernel-library) (own clasp project, `rootDir` is `src`). The device-management app imports it under the identifier `SharedKernelLibrary`.

**Contents** (one file per class): `domain/` (ErrorCode, ApiError, Values, IdRules, AuditRules), `application/` (Ports, AuditStamper, PatchSupport), `infrastructure/` (ScriptSettings, clock, uuid, current user, token and lock guards, ScriptRowCache), `persistence/googlesheet/` (SpreadsheetSource, SheetLayout, SpreadsheetTable, SheetUpgrade, SheetInstaller), `interface/` (RequestParser, Router, ResponseWriter). No module code, no `doGet`/`doPost`.

**Using it in an app**
- Declare the library in the app's `appsscript.json` (`dependencies.libraries`: `userSymbol` `SharedKernelLibrary`, `libraryId` = the library script id, `version` = a pinned number, not HEAD).
- Add an alias file that loads first (see [SharedLibrary.gs](../apps-script/src/SharedLibrary.gs)): `var ApiError = SharedKernelLibrary.ApiError;` and so on, only for what the app uses. App code then keeps plain names.
- Only top-level `function` and `var` declarations are visible through a library. Do not use `const`, `let` or `class` at the top level of the library.

**Behavior to know**
- Inside a library the global `PropertiesService`, `CacheService` and `LockService` point at the library project's own stores, not the app's. So the app must hand its own handles in at composition time: `ScriptSettings.fromProperties(PropertiesService.getScriptProperties())`, `new ScriptRowCache(CacheService.getScriptCache())`, `new ScriptLockGuard(LockService.getScriptLock())`. Each app then keeps its own `API_TOKEN`, `SPREADSHEET_ID`, schema signature, cache and lock. Library code must never call these three services directly.
- Set `SPREADSHEET_ID` in the app; `getActiveSpreadsheet()` has no meaning inside a library.
- The Sheets advanced service (`Sheets`, v4) is enabled in the library's `appsscript.json`. If it is not available, reads silently fall back to `SpreadsheetApp`, so check the first call's latency after a deploy.
- A library does not make calls faster; the gain is shared code and one place to fix it.

**Setup and release workflow**
1. Create a standalone Apps Script project for the library (this repo uses `shared-kernel-library`) and put its script id in [.clasp.json](../apps-script-shared-kernel-library/.clasp.json). Use the same id as `libraryId` in the app's `appsscript.json`.
2. `cd backend/apps-script-shared-kernel-library`, `clasp push`.
3. In the library editor: Deploy > New deployment > Library (or Manage versions > New version) to get a version number.
4. Put that number in the app's `appsscript.json` and `clasp push` the app. Share the library with the account that deploys the Web App (at least Viewer).
5. After each library change, repeat steps 2 to 4; the app keeps running the pinned version until you bump it.

**Tests:** the app's harness loads the library into its own vm context and exposes it as `SharedKernelLibrary`, like the real boundary (see [loadAppsScript.js](../apps-script/tests/harness/loadAppsScript.js)).
