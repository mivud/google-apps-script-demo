# access-control (frontend)

Google sign-in, the signed-in caller's roles and claims, and the admin access preview. It replaces the former `auth` module. Backend counterpart: [backend/docs/access-control.md](../../backend/docs/access-control.md). Related: [claims](claims.md), [roles](roles.md), [users](users.md), [launcher](launcher.md).

## Public API ([index.ts](../src/modules/access-control/index.ts))

- `createAuthService(config)` returns `{ auth, renderSignInButton }`; `buildAuth(env, supabaseClient)` ([build-auth.ts](../src/app/build-auth.ts)) calls it once in [main.tsx](../src/main.tsx) and passes both to `AuthGate`.
- `AuthService`: `signIn(idToken, nonce)`, `restoreSession`, `silentFailure`, `signOut`, `current`, `getIdToken`, `getRole`, `subscribe`, `refreshIdToken`, `attempts` (pending or failed sign-in, read by the login page).
- Types: `Identity` and `Session` (`email`, `role`, `roles: string[]`, `claims: Claim[]`; `Session` adds the token), `Role` (`admin` | `viewer`), `EffectiveAccess` (same fields, but `role` may be `''`: only a preview of a role-less user shows it, a real sign-in is refused). `hasClaim` and `Claim` are re-exported from [claims](claims.md).
- `AccessPreviewService.preview(userId)` and `createAccessPreviewService(config)`: calls `access-control.access.preview` (Sheets) or the `preview_access` RPC (Supabase); admin only.
- UI: `AuthGate`, `UserMenu`, `CurrentUserBadge`, hooks `useSession`, `useRole`, `useCanWrite`. Device-management uses `useCanWrite` to hide write controls from viewers.
- Factories take a `ProviderConfig` ([provider-config.ts](../src/shared/api/provider-config.ts)): `{ provider: 'sheets', apiUrl, getIdToken, refreshIdToken? }` or `{ provider: 'supabase', client }`. The caller (composition root) decides the URL, so the Identity services use `VITE_IDENTITY_API_URL` while device-management uses `VITE_SHEETS_API_URL`.

## Flow

1. `AuthGate` wraps the whole app. With no session it calls `auth.restoreSession()`: a silent Google re-login (loading state) that is not retried. If it fails (`timeout`, `load_error`, or `unavailable` when Google will not prompt, e.g. dismissed or cooldown), `LoginPage` shows a neutral hint for the cause (`auth.silent*` messages) above the Google button.
2. The Google ID token goes to the provider adapter (identity-api `auth.session.get`, or Supabase `signInWithIdToken`), which returns email, role, role names and effective claims.
3. The token lives in memory only and is refreshed before it expires; adapters read it through `getIdToken`.
4. On `UNAUTHORIZED` the shared [SheetsCaller](../src/shared/api/sheets-caller.ts) calls `refreshIdToken()` once and retries once; with no new token the session ends and the gate shows the login page.
5. A failed background refresh keeps the session until the token expires; it is cleared at once only on `AuthError` or `ForbiddenError`.
6. After sign-in the gate keeps rendering its children at the same route, so the route present before sign-in (the return URL) is restored with no query parameter. On sign-out [reset-route-on-sign-out.ts](../src/app/reset-route-on-sign-out.ts) navigates to `/` (replace).
7. `CurrentUserBadge` opens the settings menu; `UserMenu` shows email, role and a sign-out button with a pending state.

## Rules and limits

- UI roles are a convenience; the backend (identity-api check or Supabase RLS) enforces access.
- A non-allowlisted, inactive or role-less account gets `ForbiddenError` on the login page.
- No token or session is stored in web storage; a reload needs the silent re-login. It can fail where One Tap cannot run (third-party cookies blocked, private window, prompt dismissed): the user then clicks the Google button once. `IdTokenSource.lastFailure()` carries the cause.
- Nonce: each Google initialize gets a random nonce; Google gets `sha256(nonce)`, the backend gets the raw nonce (`payload.nonce` of `auth.session.get`, or `signInWithIdToken`). Only the sign-in call carries it.
- Needs `VITE_GOOGLE_CLIENT_ID` and, for Sheets, `VITE_IDENTITY_API_URL`.
- An older backend that omits `roles`/`claims` still signs users in (they default to empty).
- `postToAppsScript` aborts after 45 s; the first request after sign-in runs alone through [WarmupGate](../src/shared/api/warmup-gate.ts).
- `NetworkError` carries a fixed message; server or browser error text is never kept.
- Conflict handling for the admin screens lives in [conflict.ts](../src/modules/access-control/ui/conflict.ts); route helpers for the Identity app are in [identity-routes.ts](../src/modules/access-control/ui/identity-routes.ts).
