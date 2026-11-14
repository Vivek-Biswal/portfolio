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

The hero is now a remixable portrait collage with three compositions: Portrait,
Play, and Signed. The same photograph, paper layers, graphic marks and original
signature move into a different arrangement for each selection. Play brings the
photo into color; Signed gives the handwritten mark more prominence. The signature
also appears beside the contact copy, in the section's existing color palette.

Native radio controls work with touch, keyboard arrows, and without JavaScript.
The enhancement adds a Remix button, a finite signature-drawing sequence, and
subtle pointer tilt. The selected composition survives shared CMS updates; stale
animation frames, timers and listeners are cleaned up. Motion pause, reduced
motion, visibility changes and window blur stop decorative motion. Mobile stacks
the artwork below the name and keeps the composition controls at least 44px tall.

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
- `src/one/portrait-playground-markup.js`: shared CMS portrait and signature markup.
- `src/one/portrait-playground.css`, `portrait-playground.js`: the three compositions,
  native control styling, pointer response and drawing lifecycle.
- `src/one/navigation.css`: persistent header, centered chapter navigation, mobile
  second row and anchor clearance.
- `src/one/section-motion.js`: chapter motion, pointer response and disclosure effects.
- `src/one/section-energy.css`: chapter-specific art direction and mobile layouts.
- `src/one/ideas-gallery.css`: illustrated Ideas gallery and responsive covers.
- `src/one/note-art.js`: deterministic, locally authored decorative SVG artwork.
- `src/one/notebook-content.js`, `notebook.css`, `notebook.js`: article presentation,
  route navigation, reading progress and focus restoration.
- `src/one/kinetic-math.js`: deterministic scatter and name fitting.
- `src/one/journey.css`: responsive design, both color modes and print fallback.
- `scripts/test-journey.mjs`, `scripts/test-kinetic.mjs`: content and motion checks.
- `scripts/test-portrait-playground.mjs`: initial native state, rapid input, CMS
  replacement, reduced motion, pause and teardown regression checks.

Run `npm run test:journey`, `npm run test:cms`, `npm run test:notes`,
`npm run build`, and `npm run verify:dist`. No dependency or paid API was added.
The existing separate studio chunk still triggers the Vite size warning.

Local static preview: http://127.0.0.1:5174/2d/ (build output with offline defaults).

## References and verification limits

The [Awwwards animation collection](https://www.awwwards.com/websites/animation/)
and [David Langarica](https://www.davidlangarica.dev/) were consulted as creative
portfolio references. This design and motion choreography were authored for this
portfolio; no reference site's code or assets were copied.
The portrait collage takes broad editorial inspiration from [Cappen](https://cappen.com/),
using this portfolio's own photograph, signature, typography and colors.

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

## Portrait review, 2026-11-14

The latest targeted suites pass 59 checks: 18 journey/motion/controller, 16 CMS,
16 notes and 9 essentials. The production build and distribution checks pass.
The unchanged separately loaded 3D studio still emits the existing bundle-size
warning. No dependency, paid service or public deployment was added.

Browser review covered the desktop composition at 1280 x 720 and the mobile light
theme at 390 x 844. Remix selected Play, keyboard ArrowRight selected Signed, and
the motion toggle stopped decorative animation without resetting the selection.
The mobile controls measured 44px tall. The review identified horizontal overflow
from the pre-existing rotated ribbon and overlapping background copy in Signed;
both were corrected in CSS and rebuilt. Browser access became unavailable before
the last two CSS fixes, the contact signature, or mobile tapping could receive a
final visual pass. The attempted viewport reset also failed after that loss of
access. Real-device performance and OS reduced-motion were not browser-tested;
the reduced-motion controller behavior is covered by automated tests.

## Persistent headers, 2026-11-15

1D and 2D keep their headers at the top using native CSS sticky positioning,
retaining document flow without a layout jump. The 2D chapter navigation now sits
in the header, centered on desktop and on a compact second row on mobile. The
small brand tagline was removed; the motion preference moved to the footer.
Theme and world switching remain in the header. Section anchor offsets account
for the persistent headers in both worlds, and the 1D pages remain script-free.

The journey, essentials and CMS suites pass all 43 checks, along with the build
and distribution checks. Both local pages and their CSS return HTTP 200.
Browser access was unavailable for this update, so sticky behavior, mobile
wrapping and anchor positions still require a visual browser pass. Nothing was
deployed publicly.

## Dedicated 2D project pages, 2026-11-15

The project preview, title and Explore project action now lead to
`/2d/work/#project-<stable CMS ID>`. This is a separate full-page 2D presentation:
large title and cover image, complete project detail text, tools, actual website,
demo and repository links, and next-project navigation. The old `/work/` readers
remain available to 1D. Legacy 1D reader URLs are not offered as the 2D primary
project action; actual external destinations retain their own labeled actions.

`src/one/project-content.js` renders the case studies and catalog from the shared
CMS. Native fragment links and CSS target selection work in static previews and
without JavaScript. `project-page.js` preserves the selected ID across published
updates, reapplies visibility after node replacement, restores focus and scroll,
and exposes the catalog if the selected project is removed. It shares the saved
2D theme and motion preferences. `project-page.css` handles responsive layouts,
finite entrance transitions, reduced motion and printing the selected project.

The `2d-work` server template is included in development, build packaging and
Vercel rewrites. Distribution checks cover eight public pages. Copyright updates
on the main 2D page now preserve the footer motion button and its event handler.

All 97 targeted tests pass (25 journey/project/controller, 16 CMS, 9 essentials,
16 notes, 31 integration), together with the production build and distribution
checks. Local HTTP checks confirm the new page and its JS/CSS assets return 200;
the main 2D page has three links to the dedicated default project and no links to
its old 1D reader. Browser access was unavailable: visual desktop/mobile layout,
live focus/scroll restoration and real-device performance remain unverified.
No paid dependencies or services were added. No public deployment was performed.
