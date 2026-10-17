# launcher (app shell)

One SPA hosts several apps behind one Google sign-in. Code: [app/shell.tsx](../src/app/shell.tsx) and [app/launcher](../src/app/launcher). Related: [access-control](access-control.md), [device-management](device-management.md).

## Hash routes

| Route | Shows |
|---|---|
| `#/` (or empty) | launcher: cards of the registered apps |
| `#/devices/...` | device-management (`#/devices`, `#/devices/equipment/<id>`, `#/devices/categories`) |
| `#/identity/...` | Identity app (`#/identity/users[/<id>]`, `#/identity/roles[/<id>]`, `#/identity/claims`) |

- Legacy redirects ([app-route.ts](../src/app/launcher/app-route.ts)): `#/equipment/<id>` to `#/devices/equipment/<id>`, `#/categories` to `#/devices/categories`. The redirect uses `location.replace`, so it stays out of the back history.
- An unknown route is redirected to `#/`. An app owns its prefix and everything below it (`/devices` matches `/devices/x`, not `/devices-x`).
- Return URL: it is the hash present before sign-in; `AuthGate` keeps rendering children at the same hash, so there is no query parameter. On sign-out the hash is reset to `#/`.

## Registry

[app-registry.ts](../src/app/launcher/app-registry.ts) lists `AppDefinition`s ([app-definition.ts](../src/app/launcher/app-definition.ts)): `id`, `titleKey`, `descriptionKey`, `icon`, `path`, `load` and `accessClaimValue`. `isAppAvailable` shows an app when the user has the `super` role or a claim `app` = `accessClaimValue` (`identity` for Identity, `device.mgt` for device-management). The launcher hides other cards and `Shell` redirects a typed URL of a hidden app to `#/`; the backend still enforces real access.

Add an app: create its root component with a default export taking `{ deps }`, add an entry with a `load: () => import(...)`, add the `launcher.<id>.*` messages and an "All apps" link (`#/`) in its shell.

## Loading

[LazyAppHost](../src/app/launcher/lazy-app-host.tsx) uses `React.lazy`: a spinner while the chunk loads, an error state with retry if it fails ([load-error-boundary.tsx](../src/app/launcher/load-error-boundary.tsx)). Identity services are built only when the Identity app opens ([build-identity-services.ts](../src/app/identity/build-identity-services.ts)).

## Limits

Hash routing only (no host rewrites). App visibility is a UI convenience only; it is not a security boundary.
