# Firebase setup (step by step)

**Purpose:** create and configure the Firebase project used when the frontend provider is Firebase. Counterpart of [supabase-setup](supabase-setup.md); the data model and actions are in [firebase](firebase.md). Nothing here needs a secret to be committed. Replace every `<placeholder>`.

| Step | Where | Who |
|------|-------|-----|
| 1. Create the project and upgrade to Blaze | console.firebase.google.com | You |
| 2. Enable Firestore | Console > Build > Firestore | You |
| 3. Enable Google sign-in only | Console > Build > Authentication | You |
| 4. Install tools and link the project | terminal | You |
| 5. Deploy rules, indexes and the function | terminal | You |
| 6. Seed the super role and the first super user | terminal | You |
| 7. Put the web config in the frontend | `frontend/.env.local`, GitHub variables | You |
| 8. Verify | Console and the app | You |

## 1. Create the project

1. Open https://console.firebase.google.com and choose **Add project**. Name: `apps-script-demo` (any name); note the **Project ID** (`<project-id>`).
2. Google Analytics is not needed; turn it off.
3. Cloud Functions need the **Blaze** (pay as you go) plan: **Upgrade** in the console. Usage for this app stays within the free quota; set a budget alert under Billing.

## 2. Enable Firestore

1. **Build > Firestore Database > Create database**, edition **Standard**, mode **Production** (rules deny everything until step 5), location close to your users (for example `asia-southeast1`). The location cannot be changed later.

## 3. Enable Google sign-in only

1. **Build > Authentication > Get started > Sign-in method**: enable **Google**, set the public-facing name and a support email, save.
2. Leave **every other provider disabled** (Email/Password, Phone, Anonymous, ...). The rules and the function only accept provider `google.com` with a verified email, but disabled providers also stop people registering allowlisted emails.
3. **Settings > Authorized domains**: add the deployed frontend domain (for example `mivud.github.io`); `localhost` is there by default.
4. Optional: reuse the existing Google OAuth Web client (see [google-oauth-setup](google-oauth-setup.md)); Firebase accepts a Google ID token from it through the Google credential flow.

## 4. Install tools and link the project

```
npm install -g firebase-tools
firebase login
cd backend/firebase
cp .firebaserc.example .firebaserc      # then set "default" to <project-id>
```

`.firebaserc` holds only the project id. Requires Node.js 20 or newer.

## 5. Deploy rules, indexes and the function

```
cd backend/firebase
firebase deploy --only firestore
firebase deploy --only functions
```

- The first command publishes [firestore.rules](../firebase/firestore.rules) and [firestore.indexes.json](../firebase/firestore.indexes.json); indexes take a few minutes to build.
- The second installs and compiles [functions](../firebase/functions) (predeploy) and deploys the callable `api`. The default region is `us-central1`; to change it set `FUNCTIONS_REGION` (for example in `functions/.env`, not committed) before deploying and use the same region in the frontend.
- Local try-out without deploying: `npm --prefix functions run serve` (Auth, Functions and Firestore emulators).

## 6. Seed the super role and the first super user

The seed script creates the `super` role, the six permission claims (`identity.read/write`, `device.mgt.read/write`, `expense.read/write`) and, with `--super-email`, the first super user (the lockout rules do not apply because there is no caller). It is idempotent and uses your own Google credentials, never a key file.

```
gcloud auth application-default login
cd backend/firebase/functions
npm install
GOOGLE_CLOUD_PROJECT=<project-id> npm run seed -- --super-email you@example.com
```

On Windows PowerShell use `$env:GOOGLE_CLOUD_PROJECT = "<project-id>"` first. Use the Google account that will sign in. Later users, roles and claims are managed from the app (actions in [firebase](firebase.md)).

## 7. Put the web config in the frontend

1. **Project settings > General > Your apps > Add app > Web**. Register `apps-script-demo-web` (no hosting).
2. Copy the config values. They are public identifiers (the data is protected by rules and the function), but keep them in env files, not in code:

| Value | Frontend variable (names are defined in the frontend docs) |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| Functions region | `VITE_FIREBASE_FUNCTIONS_REGION` (same as the deployed region) |

3. Put them in `frontend/.env.local` and in GitHub **Settings > Secrets and variables > Actions > Variables**, then run the Pages workflow again.
4. Never add a service account key or admin credentials to the frontend or the repo.

## 8. Verify

1. **Firestore Data** shows `roles` (one `super` document), `claims` (6), `users` (1), `user_roles` (1) and `access_index/you@example.com` with `is_super: true`.
2. Sign in to the app with the super account: the app calls `access-control.identity.current` and shows all areas.
3. Sign in with a Google account that is not in `users`: reads fail with `permission-denied` and the function returns `forbidden`.
4. In the Firestore **Rules playground**, a write to any collection is denied for every user.
5. Try the last-super protection: deactivating the only super user must fail with `last_super` (or `self_lockout` for yourself).

## Updating

Re-run step 5 after any change to rules, indexes or function code. Rules and the function are versioned together with the frontend, as action names and payloads are a shared contract.
