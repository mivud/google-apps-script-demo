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

## Set up the redirect sign-in (existing client)

Needed once per client and per new origin. No code, env var or backend change is required: the app derives the redirect URI from `origin + BASE_URL + auth/callback`.

1. Open [Google Cloud console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials) and select the project `nexus-identity`.
2. Under OAuth 2.0 Client IDs, open `nexus-identity-web` (the Client ID must start with `370199693443-0rlp3k36`).
3. In **Authorized redirect URIs** (not the JavaScript origins box) click Add URI and enter both values, exactly, with no trailing slash and no spaces:
   - `https://mivud.github.io/google-apps-script-demo/auth/callback`
   - `http://localhost:5173/auth/callback`
4. Click Save, reload the page and check both URIs are still listed. Wait 5 minutes to a few hours for Google to apply it.
5. Run the app (`http://localhost:5173`, port 5173 exactly) and click "Sign in with Google (redirect)" on the login page. Try an incognito window if an old error page is cached.

The two boxes take different values:

| Box | Format | Example |
|-----|--------|---------|
| Authorized JavaScript origins | scheme + host + port only, no path | `https://mivud.github.io` |
| Authorized redirect URIs | full URL with the path | `https://mivud.github.io/google-apps-script-demo/auth/callback` |

## Add a custom domain

Needed once when the site moves to a custom domain (this repo: `nexus.vdminh.blog`). Keep the `github.io` values if that URL stays in use. Do the same steps as above, with these values:

| Box | Value |
|-----|-------|
| Authorized JavaScript origins | `https://nexus.vdminh.blog` |
| Authorized redirect URIs | `https://nexus.vdminh.blog/auth/callback` |

The path has no repo name because a custom domain serves the site at `/` (see [deploy](../../frontend/docs/deploy.md)). Wait 5 minutes to a few hours for Google to apply it.

## Troubleshooting

| Message | Cause and fix |
|---------|---------------|
| `Invalid Origin: URIs must not contain a path or end with "/"` | A URI with a path was entered in Authorized JavaScript origins. Move it to Authorized redirect URIs. |
| `Error 400: redirect_uri_mismatch` (Google page "doesn't comply with Google's OAuth 2.0 policy") | The URI sent is not registered on that client. Compare the `redirect_uri` shown in the error details with the list character by character (scheme, port, path, trailing slash), confirm the Client ID in the error matches `VITE_GOOGLE_CLIENT_ID`, and wait for propagation. If Vite started on another port, register that port too. |
| Access blocked (app in Testing) | The Google account is not a test user. See Rules and limits. |
| Login page appears again after returning from Google | The callback was rejected (stale or tampered `state`, expired after 10 minutes, or another tab). Start the sign-in again in the same tab. |

## Rules and limits

- **Testing mode:** only listed test users can complete the Google sign-in (up to 100). Tokens for test users also expire as Google decides for testing apps. Anyone else sees an access-blocked page from Google before reaching the app.
- **Allowlist is separate:** a test user can still be refused by the app if the email is not an active row in the identity-api `users` sheet. Add the email in both places.
- **Going public later:** set the publishing status to Production on the Audience page. With only the basic scopes (`openid`, `email`, `profile`) no Google verification review is required.
- **New origin** (for example a Cloudflare Pages domain): add it under the client's Authorized JavaScript origins and its `/auth/callback` URL under Authorized redirect URIs. Changes need a few minutes to apply.
- **Secrets:** the client secret is shown once at creation. If it is ever needed, create a new one in the client page instead of searching for the old one.
- **Related:** [identity-api](identity-api.md) for the Script Properties and deploy steps, [auth](auth.md) for the token checks, [supabase](supabase.md) for the provider setup, and `frontend/docs/access-control.md` for the sign-in flow.
