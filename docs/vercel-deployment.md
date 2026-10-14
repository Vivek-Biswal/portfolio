# Vercel release setup

This is a Vite multipage portfolio with a Firebase-backed CMS and a Vercel Node API. Import this repository into Vercel with the
repository root as Root Directory. The checked-in `vercel.json` selects Vite,
uses `npm ci`, builds with `npm run build && npm run verify:dist`, and serves
`dist/`. Select Node.js 22.x. The CMS requires the server environment variables below.

## Firebase server environment

Set `FIREBASE_PROJECT_ID=vivek-biswal`, `FIREBASE_STORAGE_BUCKET=vivek-biswal.firebasestorage.app`, and private `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel server environment settings. Use the JSON value from the ignored local setup, without the surrounding dotenv quotes. Never put it in a `VITE_*` variable, repository, screenshot or chat. Set `SITE_ORIGIN` to the exact HTTPS origin used to access the site; production and preview origins must be configured independently. Keep `FIREBASE_MEDIA_ENABLED=false` until Storage is provisioned.

Add the deployed hostname to Firebase Authentication authorized domains. Do not include a protocol or port there. Redeploy after setting environment variables. Open `/admin/login/` directly and follow [the admin guide](admin-guide.md).

The live project already has shared content, its owner account and authenticator MFA configured. Email verification and first authenticator enrollment must be completed by the owner. Verify draft save, authenticated previews, publication across all three worlds, revision restore and sign-out on a Vercel Preview before production.

## Routes

- `/` and `/1d/`: script-free 1D essentials.
- `/2d/`: 2D guided line.
- `/3d/`: 3D pixel desktop and seven-game arcade.
- `/work/dimensional-portfolio.html`, `/work/now.html`, `/work/notes.html`.

Keep directory trailing slashes and the `.html` project-page URLs. Public page rewrites render shared published content through `/api/portfolio`.
The admin dashboard template is packaged privately with that function; it is removed from static output. Hashed
`/assets/` files get immutable caching; other files use Vercel defaults.

## Local release checks

```sh
npm ci
npm run build
npm run verify:dist
node --test scripts/test-arcade-games.mjs scripts/test-arcade-world.mjs scripts/test-glitch-run.mjs
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The verifier checks the seven pages, local assets, dependency/lockfile agreement,
absence of trial plugins, and the no-JavaScript contract for 1D. The arcade tests
cover gameplay, pause/replay, boundary wrapping, room paths and responsive room
sizes. The public GSAP 3.13.0 distribution replaces `gsap-trial`.

After importing, inspect Vercel's Preview deployment at each route, reload a
nested route directly, check the three-world navigation, and play a game on a phone. Best
scores are per-browser/per-origin; localhost scores do not transfer to Vercel.

## Public release constraint

The existing repository's `LICENSE` (Personal Portfolio License v1.0) restricts
cloning/redistributing the original site and use of its proprietary 3D assets.
The original README and attribution remain in place. Technical deployment setup
does not resolve those source/asset permissions. Obtain permission from the
original owner or replace the inherited design/assets before public release.
No Vercel project was created and no deployment was published by this update.

## References

- [Vercel project configuration](https://vercel.com/docs/project-configuration)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [GSAP installation](https://gsap.com/docs/v3/Installation/)
