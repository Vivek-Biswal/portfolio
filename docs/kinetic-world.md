# Kinetic 2D world

The `/2d/` portfolio now uses oversized typography, a tilted portrait, scroll-driven
letter assembly/dispersal, a moving typographic ribbon, ambient lighting, project
image parallax and rotating graphic marks. Native page scrolling remains in control.

`server/render-line.mjs` still reads the shared CMS fields. All four anchor sections,
project links, note reader routes and complete no-script content remain available.
New content refreshes the animation instances without retaining stale CMS elements.
The 1D and 3D worlds use their existing renderers and styles.

The default palette is charcoal, acid yellow and warm paper with a saved light-mode
option. Motion has an independent saved pause control. System reduced-motion always
overrides that control. Mobile uses shorter travel distances and a single-column
layout. Long names shrink to the actual title width; glyph splitting preserves
Unicode graphemes and accessible original text.

## Files and validation

- `src/one/kinetic-motion.js`: GSAP ScrollTrigger and lifecycle cleanup.
- `src/one/kinetic-math.js`: deterministic scatter and name fitting.
- `src/one/journey.css`: responsive design, both color modes and print fallback.
- `scripts/test-journey.mjs`, `scripts/test-kinetic.mjs`: content and motion checks.

Run `npm run test:journey`, `npm run test:cms`, `npm run test:notes`,
`npm run build`, and `npm run verify:dist`. No dependency or paid API was added.
The existing separate studio chunk still triggers the Vite size warning.

Local preview: http://127.0.0.1:5173/2d/

## References and verification limits

The [Awwwards animation collection](https://www.awwwards.com/websites/animation/)
and [David Langarica](https://www.davidlangarica.dev/) were consulted as creative
portfolio references. This design and motion choreography were authored for this
portfolio; no reference site's code or assets were copied.

Browser Use was still disabled in Work settings during implementation, including
after the user indicated they would enable it. The server response, source tests
and production build can be verified locally; the actual motion, visual layout,
keyboard flows and real-device performance still need a browser review.

Validation completed: 9 journey/motion tests, 16 CMS tests, 12 notes tests,
production build, distribution verification and HTTP 200 checks for the local page
and motion modules. No public deployment was performed in this phase.
