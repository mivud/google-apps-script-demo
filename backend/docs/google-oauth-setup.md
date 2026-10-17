# Google OAuth setup (Google Cloud)

**Purpose:** how the Google OAuth client used by "Sign in with Google" was created, and where its Client ID goes. The Client ID is public by design (it ships in the frontend bundle); the client secret is not used by this app and is never stored.

## What exists

| Item | Value |
|------|-------|
| Google Cloud project | `nexus-identity` (project ID `regal-mediator-511816-p7`) |
| Auth platform app name | Nexus Identity (audience: External, publishing status: Testing) |
| OAuth client | `nexus-identity-web` (type: Web application) |
| Client ID | `370199693443-0rlp3k36qjtk1hr6f6r65qfk2i1cpueh.apps.googleusercontent.com` |
| Authorized JavaScript origins | `https://mivud.github.io`, `http://localhost:5173`, `http://localhost` |
| Authorized redirect URIs | `https://mivud.github.io/google-apps-script-demo/auth/callback`, `http://localhost:5173/auth/callback` (redirect sign-in fallback) |
| Test users | the project owner's Google account |

Settings can take 5 minutes to a few hours to take effect.

## Where the Client ID is used

| Place | Setting |
|-------|---------|
| Frontend (`frontend/.env.local` and GitHub Actions variable) | `VITE_GOOGLE_CLIENT_ID` |
| `apps-script-identity-api` Script Property | `GOOGLE_CLIENT_ID` |
| `apps-script` (device-management) Script Property | `GOOGLE_CLIENT_ID` |
| Supabase dashboard, Authentication > Providers > Google | Client ID (keep the nonce check on; disable all other providers and email signup) |

The same ID must be used everywhere: both Web Apps check the token `aud` claim against it.

## Re-creating it from scratch

1. Open the Google Cloud console and create a project (for example `nexus-identity`).
2. Go to Google Auth Platform > Get started. Set the app name, the user support email and the contact email. Choose **External** (a personal Gmail account has no organization, so Internal is not available). Accept the Google API Services User Data Policy.
3. Go to Clients > Create client. Application type **Web application**, name `nexus-identity-web`.
4. Add the **Authorized JavaScript origins**: the GitHub Pages origin (`https://<github-user>.github.io`, origin only, no repo path), `http://localhost:5173` and `http://localhost` for local development.
5. Add the **Authorized redirect URIs** used by the redirect sign-in fallback (exact match, including the path and no trailing slash): `https://<github-user>.github.io/<repo>/auth/callback` (this repo: `https://mivud.github.io/google-apps-script-demo/auth/callback`) and `http://localhost:5173/auth/callback`. Create.
6. Copy the Client ID. The client secret is not needed; do not save it.
7. Go to Audience > Test users > Add users, and add every Google account that must sign in while the app is in Testing.

## Rules and limits

- **Testing mode:** only listed test users can complete the Google sign-in (up to 100). Tokens for test users also expire as Google decides for testing apps. Anyone else sees an access-blocked page from Google before reaching the app.
- **Allowlist is separate:** a test user can still be refused by the app if the email is not an active row in the identity-api `users` sheet. Add the email in both places.
- **Going public later:** set the publishing status to Production on the Audience page. With only the basic scopes (`openid`, `email`, `profile`) no Google verification review is required.
- **New origin** (for example a Cloudflare Pages domain): add it under the client's Authorized JavaScript origins and its `/auth/callback` URL under Authorized redirect URIs. Changes need a few minutes to apply.
- **Secrets:** the client secret is shown once at creation. If it is ever needed, create a new one in the client page instead of searching for the old one.
- **Related:** [identity-api](identity-api.md) for the Script Properties and deploy steps, [auth](auth.md) for the token checks, [supabase](supabase.md) for the provider setup, and `frontend/docs/access-control.md` for the sign-in flow.
