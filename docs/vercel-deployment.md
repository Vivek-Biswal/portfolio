# Vercel release setup

This is a Vite multipage static site. Import this repository into Vercel with the
repository root as Root Directory. The checked-in `vercel.json` selects Vite,
uses `npm ci`, builds with `npm run build && npm run verify:dist`, and serves
`dist/`. Select Node.js 22.x. No environment variables or backend services are
required by the portfolio or browser-local arcade.

## Routes

- `/` and `/1d/`: script-free 1D essentials.
- `/2d/`: 2D guided line.
- `/3d/`: 3D pixel desktop and seven-game arcade.
- `/work/dimensional-portfolio.html`, `/work/now.html`, `/work/notes.html`.

Keep directory trailing slashes and the `.html` project-page URLs. There is no
SPA catch-all rewrite: every world has its own generated HTML entry. Hashed
`/assets/` files get immutable caching; other files use Vercel defaults.

## Local release checks

```sh
npm ci
npm run build
npm run verify:dist
node --test scripts/test-arcade-games.mjs scripts/test-arcade-world.mjs scripts/test-glitch-run.mjs
npm run preview -- --host 127.0.0.1
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
