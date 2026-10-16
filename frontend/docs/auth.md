# auth (frontend)

Google sign-in for the whole app. Backend counterpart: [backend/docs/auth.md](../../backend/docs/auth.md).

## Public API ([index.ts](../src/modules/auth/index.ts))

- `createAuthService(config)` returns `{ auth, renderSignInButton }`; the app calls `buildAuth(env, supabaseClient)` once in [main.tsx](../src/main.tsx) and passes both to `AuthGate`. The Supabase client is created in the composition root and shared with the data adapter.
- `AuthService`: `signIn(idToken, nonce)`, `signOut`, `current`, `getIdToken`, `getRole`, `subscribe`, `refreshIdToken`, and `attempts` (a `SignInAttemptStore`: pending or failed sign-in, read by the login page). The Google button is rendered by infrastructure code, not the application layer.
- UI: `AuthGate`, `UserMenu`, `CurrentUserBadge`, hooks `useSession`, `useRole`, `useCanWrite`. The device-management module imports `useCanWrite` from this public index to hide create, edit and delete controls from viewers.

## Flow

1. `AuthGate` wraps the app. With no session it first tries a silent Google re-login (loading state), then shows `LoginPage` with the Google button.
2. The Google ID token goes to the provider adapter (Apps Script `auth.session` or Supabase `signInWithIdToken`), which returns email and role (`admin` or `viewer`).
3. The token is kept in memory only and refreshed before it expires. Data adapters read it through `getIdToken`.
4. On `UNAUTHORIZED` the Sheets adapter calls `refreshIdToken()` once and retries once; if no token comes back, `refreshIdToken` signs out and the gate shows the login page.
5. A failed background refresh (for example a network error) keeps the session until the token expires; it is cleared at once only on `AuthError` or `ForbiddenError`.
6. `CurrentUserBadge` is the button that opens the settings menu (passed to `AppShell` as `settingsTrigger`, so language, color scheme and theme pickers live behind the user button): an avatar initial on mobile, plus email and role from 768px.
7. `UserMenu` (inside the settings menu) shows email, role and a sign-out button with a pending state.

## Rules and limits

- Roles in the UI are a convenience: viewers do not see create, edit or delete controls (`useCanWrite`), but the backend (Apps Script check or Supabase RLS) enforces access.
- A non-allowlisted account gets `ForbiddenError` and a clear message on the login page; other failures show a retry button.
- No token or session is stored in web storage; a page reload needs the silent re-login (may show the Google prompt).
- A repeated `UNAUTHORIZED` after a successful refresh surfaces as an error message, not an automatic sign-out.
- Nonce: each Google initialize gets its own random nonce, bound to its callback; it is reused until a credential consumes it, then replaced. Google gets sha256(nonce); the raw nonce goes to Supabase (`signInWithIdToken`) or, for Sheets, in the `nonce` field of `auth.session.get` so the backend can check the hash against the token claim. Limit: only the sign-in call carries the nonce; later data requests send just the ID token, so a stolen token is valid there until it expires.
- Sheets sign-in calls the identity API at `VITE_IDENTITY_API_URL` (`{ action: 'auth.session.get', idToken, payload: { nonce } }`; the nonce must be inside `payload`, as in the identity-api contract); data requests keep using `VITE_SHEETS_API_URL` with the ID token. The `supabase` provider ignores the identity URL.
- Needs `VITE_GOOGLE_CLIENT_ID` (public value) and, for Sheets, `VITE_IDENTITY_API_URL`; `VITE_SHEETS_API_TOKEN` is no longer used.
- Speed: `postToAppsScript` aborts after 45 s (error with retry instead of an endless spinner). `SheetsAdapter` runs the first data request after sign-in alone through [WarmupGate](../src/shared/api/warmup-gate.ts), so the backend's access cache is filled once and the parallel requests that follow are answered from it.
- `NetworkError` carries a fixed message; server or browser error text is never kept.
