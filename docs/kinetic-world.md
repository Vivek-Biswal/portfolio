# Kinetic 2D world

The `/2d/` portfolio now uses oversized typography, a tilted portrait, scroll-driven
letter assembly/dispersal, a moving typographic ribbon, ambient lighting, project
image parallax and rotating graphic marks. Native page scrolling remains in control.

The second pass gives each chapter its own interaction: hero typography stickers,
a scattered-to-settled CMS skill constellation, unfolding project previews with
oversized numbers and category bands, illustrated note covers, and a large scrolling
HELLO strip with staggered contact panels. Project and note titles now animate too.
Fine-pointer devices add restrained image tilt and magnetic arrow movement.

Native About/project disclosures reuse one entrance animation each. The notebook
has a reading progress line and transitions only on opening or navigating to a new
article; CMS refreshes keep the current reading position without replaying motion.
The site Motion off control also stops CSS transitions and reader entrances.

The Ideas chapter is now **offscript.**, a staggered editorial gallery. Each note
has original SVG artwork and a palette selected by its stable CMS ID. Opening it
keeps that artwork in a large title spread, followed by a paper-colored reading
surface and an illustrated next-article link. The contents strip reveals the
selected note on navigation and preserves its position during content updates.
The reader locks background scrolling, while Escape returns focus to its opener.
Mobile uses stacked covers and a horizontally scrollable contents strip.

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
- `src/one/section-motion.js`: chapter motion, pointer response and disclosure effects.
- `src/one/section-energy.css`: chapter-specific art direction and mobile layouts.
- `src/one/ideas-gallery.css`: illustrated Ideas gallery and responsive covers.
- `src/one/note-art.js`: deterministic, locally authored decorative SVG artwork.
- `src/one/notebook-content.js`, `notebook.css`, `notebook.js`: article presentation,
  route navigation, reading progress and focus restoration.
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

Browser review on 2026-11-13 covered the gallery and reader at desktop and mobile
viewport sizes (1366 x 900 and 390 x 844). Opening notes, next-article navigation,
the current-work view, Escape and restoration of focus to the original card were
verified. The reader had no horizontal content overflow at either size.

The review identified an off-screen selected mobile tab and a shifted SVG
rotation origin. Both were corrected, and background scrolling was locked while
the modal is open. Browser access became unavailable before these last fixes
could receive a final visual pass. Real-device performance, OS reduced-motion
and the light-theme visual pass were not tested in this iteration.

Validation commands cover 9 journey/motion tests, 16 CMS tests, 16 notes tests,
the production build and distribution verification. The four new notes tests
check stable artwork after CMS reordering and safe SVG rendering. No public
deployment was performed in this phase.
