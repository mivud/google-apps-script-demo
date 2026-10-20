# Supabase setup (step by step)

**Purpose:** create and configure the Supabase project used when `VITE_DB_PROVIDER=supabase`. This is the counterpart of [apps-script](apps-script.md) (Sheets backend); the schema itself is described in [supabase](supabase.md). Do the steps in order. Nothing here needs a secret to be committed.

## Overview

| Step | Where | Who |
|------|-------|-----|
| 1. Create the project | supabase.com dashboard | You |
| 2. Run the SQL scripts | Dashboard > SQL Editor | You |
| 3. Enable Google sign-in only | Dashboard > Authentication | You |
| 4. Add the first super user | SQL Editor | You |
| 5. Grant permissions to roles | SQL Editor or the app | You |
| 6. Put URL and anon key in the frontend | `frontend/.env.local`, GitHub variables | You |
| 7. Verify | SQL Editor and the app | You |

Sign-in flow: the browser gets a Google ID token (Sign in with Google, with a nonce), the app calls `supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })`, and Supabase issues a session JWT. Row Level Security (RLS) then decides access from the JWT email, the `users` allowlist and the permission claims. There is no server of your own in between.

## 1. Create the project

1. Sign in at https://supabase.com/dashboard and choose **New project**.
2. Name: `apps-script-demo` (any name works), pick a strong database password (store it in a password manager, the app never uses it) and the region closest to your users.
3. Wait until the project is ready (about 2 minutes).
4. Open **Project Settings > API** and note two values:
   - **Project URL**, like `https://<project-ref>.supabase.co` -> `VITE_SUPABASE_URL`.
   - **anon public** key -> `VITE_SUPABASE_ANON_KEY`. It is public by design (it ships in the bundle); RLS protects the data.
   - Never copy the **service_role** key anywhere in the frontend, in `VITE_*` variables, in docs or in commits.

## 2. Run the SQL scripts

Open **SQL Editor > New query**, paste one file at a time from [backend/supabase/migrations](../supabase/migrations), press **Run**, and wait for `Success` before the next one. The order matters.

| Order | File | Creates |
|-------|------|---------|
| 1 | [001_api.sql](../supabase/migrations/001_api.sql) | Shared helpers, access resolution, RPCs `current_identity` and `preview_access` |
| 2 | [002_users.sql](../supabase/migrations/002_users.sql) | Identity tables, lockout rules, RLS, the `super` role and the six permission claims |
| 3 | [003_device_management.sql](../supabase/migrations/003_device_management.sql) | `categories`, `equipment`, `maintenance_logs` |
| 4 | [004_expense_tracking.sql](../supabase/migrations/004_expense_tracking.sql) | `payment_methods`, `fixed_expense_templates`, `expenses`, `generate_fixed_expenses` |
| 5 | [005_fixed_expense_payment_day.sql](../supabase/migrations/005_fixed_expense_payment_day.sql) | `payment_day` on templates, `paid_at` on expenses, `generate_fixed_expenses` uses the payment day |

- Every script is idempotent: running it again is safe.
- If the editor warns about a "destructive operation" it is only the `drop trigger/policy if exists` lines; confirm.
- A project that already ran the old scripts in [legacy](../supabase/legacy) does not need these; do not mix both sets on one database.
- Check **Table Editor**: all tables show an **RLS enabled** badge. A table without it is a bug, report it.

## 3. Enable Google sign-in only

Open **Authentication**.

1. **Sign In / Providers > Google**: enable it.
   - **Client IDs:** the OAuth Web client ID (same value as `VITE_GOOGLE_CLIENT_ID`, see [google-oauth-setup](google-oauth-setup.md)). It is public. If you use several clients, separate IDs with commas.
   - **Skip nonce checks:** keep it **off**. The frontend always sends a nonce, so Supabase can reject replayed tokens.
   - **Client Secret:** the app only exchanges ID tokens, it never starts the OAuth redirect through Supabase, so the secret is not used. If the dashboard insists on a value, use the client secret of the same Google client and keep it in the dashboard only, never in the repo.
2. **Disable every other provider** (Email, Phone, GitHub, ...). Under **Sign In / Providers > Email** turn off **Enable email signup** (and **Confirm email** is then irrelevant). Under **User Signups** turn off **Allow new users to sign up** only if you manage Auth users by hand; leave it on otherwise, because the first Google login creates the Auth user. Access is still limited by the `users` allowlist.
3. Turn **Anonymous sign-ins** off.
4. **URL Configuration:** set **Site URL** to the deployed frontend (for example `https://mivud.github.io/google-apps-script-demo/` or your custom domain). Add `http://localhost:5173` to **Redirect URLs** for local work. The ID-token flow does not redirect through Supabase, so these only matter for emails and future OAuth flows.
5. In Google Cloud, the OAuth client must list the frontend origins and the `/auth/callback` redirect URIs (already in [google-oauth-setup](google-oauth-setup.md)). Nothing from Supabase needs to be added there for the ID-token flow.

Why this matters: RLS trusts only a Google login with a verified email (`is_google_login()`). Another provider could let someone register an allowlisted email.

## 4. Add the first super user

Nobody can use the app until one active user holds the `super` role. In **SQL Editor** (no JWT there, so the lockout rules do not block you) run, with your Google email:

```sql
insert into public.users (email) values ('you@example.com');

insert into public.user_roles (user_id, role_id)
select u.id, r.id
  from public.users u, public.roles r
 where lower(u.email) = 'you@example.com' and r.name = 'super';
```

Use the exact Google account email you will sign in with. `super` bypasses every permission check, so keep this list short. After the first login you can manage users, roles and claims in the app (Users screen).

## 5. Grant permissions to other roles

`002_users.sql` seeds these claims (key `permission`):

| Value | Allows |
|-------|--------|
| `identity.read` / `identity.write` | Read / change users, roles, claims |
| `device.mgt.read` / `device.mgt.write` | Read / change categories, equipment, maintenance logs |
| `expense.read` / `expense.write` | Read / change payment methods, fixed templates, expenses |

Everyone except `super` needs the matching claim, through a role (`role_claims`) or directly (`user_claims`). Easiest path is the app: create a role such as `device-editor`, add the claims, then assign the role to users. By SQL:

```sql
insert into public.roles (name, description) values ('device-editor', 'Manage devices');

insert into public.role_claims (role_id, key, value)
select r.id, 'permission', v
  from public.roles r, unnest(array['device.mgt.read', 'device.mgt.write']) v
 where r.name = 'device-editor';
```

A user who is listed in `users` but has no role or claim signs in but sees no data.

## 6. Configure the frontend

Local (`frontend/.env.local`, never committed):

```
VITE_DB_PROVIDER=supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
VITE_GOOGLE_CLIENT_ID=<Google OAuth Web client id>
```

GitHub Pages: repo **Settings > Secrets and variables > Actions > Variables**, add the same four names (they are public values, so Variables, not Secrets). Redeploy afterwards. Details: [frontend config](../../frontend/docs/config.md) and [deploy](../../frontend/docs/deploy.md). Switching back to Sheets is only a config change (`VITE_DB_PROVIDER=sheets`).

## 7. Verify

SQL Editor checks (run as the postgres role, so RLS is bypassed; these only confirm the objects exist):

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;  -- rowsecurity = true everywhere
select name from public.roles;                                                        -- super
select key, value from public.claims order by 1, 2;                                  -- 6 permission claims
select u.email, r.name from public.users u
  join public.user_roles ur on ur.user_id = u.id join public.roles r on r.id = ur.role_id;
```

App checks:
1. `npm run dev` in `frontend`, sign in with the super account. The home page loads and the Users screen lists you.
2. Sign in with a Google account that is not in `users`: the app shows the "no access" message and no data loads.
3. Sign in as a user without claims: lists are empty or the module is hidden.
4. Try to deactivate or delete yourself as the only super: the app shows `last_super` / `self_lockout`.
5. Optional contract tests (they create and delete real rows, use a test project): see [frontend device-management](../../frontend/docs/device-management.md).

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `relation "public.users" does not exist` while running `001` | The file was edited. `001_api.sql` starts with `set check_function_bodies = off`; run the whole file in one query. |
| `permission denied for table ...` or empty lists after login | The user has no matching claim, is inactive, or is missing from `users`. Check section 5 and the email spelling. |
| `Unacceptable audience in id_token` / `invalid_client` on sign-in | The Client ID in Supabase (Providers > Google) differs from `VITE_GOOGLE_CLIENT_ID`. |
| `Nonces mismatch` / `nonce` error | Skip-nonce is off (correct) but the token was issued without the nonce: reload the page and sign in again; do not reuse an old token. |
| Sign-in works but every table is empty for a super user | The Auth email is not verified or the provider is not Google (`is_google_login()` is false). Sign in with Google, not another provider. |
| `FORBIDDEN` from `preview_access` | The caller lacks `identity.read`. |
| `last_super` / `self_lockout` when editing users | Intended guard: another active super must exist, and you cannot remove or re-email your own super account. |
| Changes in SQL do not show in the API | PostgREST caches the schema: run `notify pgrst, 'reload schema';` or restart in **Project Settings > Data API**. |

## Rules and limits

- Never commit the database password, the `service_role` key or the Google client secret. Only the project URL, the anon key and the Google Client ID are public.
- The free plan pauses an inactive project after a week; resume it from the dashboard.
- Revocation is immediate (RLS reads `users` on every request), unlike the Apps Script backend whose caches delay it by a few minutes. A signed-in session JWT still lives until it expires (default 1 hour).
- Back up before changing RLS or running scripts on a project with real data (**Database > Backups** on paid plans, or `pg_dump`).
