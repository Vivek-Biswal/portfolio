# 1D: the quiet edition

The essentials at `/` and `/1d/` remain script-free HTML. Reading text and controls
use the existing locally hosted Manrope variable font; the hero and wordmark keep
their serif character. Warm paper, fine rules and a restrained blue ink accent
remain. No new dependencies or external services were added.

Small interactions use native HTML and CSS:

- The portrait's **Turn over** disclosure reveals a short note and the current
  CMS profile status. **Turn back** restores the portrait. The revealed note grows
  naturally for long status text and names instead of clipping them.
- Project titles, note titles and current work expand into complete inline readers.
- Links respond subtly to hover/focus, and anchor navigation briefly marks the
  destination margin. Reduced motion disables transitions and smooth scrolling.
- System/Light/Dark uses the existing CSS-only theme selector. No theme preference
  is written to browser storage.

Legacy Notes, Now and project reading URLs remain available for old links and
other worlds. Home reading stays in the current document. Contact, booking,
social and external project destinations still come from the shared CMS.

## Single-page reading and legibility — 2026-11-14

- Notes contain every published paragraph in native disclosures with stable
  `note-<CMS ID>` anchors. Multiple notes can stay open for comparison.
- Projects contain summary, image, details, technologies and external destinations
  under the title, using stable `project-<CMS ID>` anchors. Local `/work/` project
  navigation is replaced by this inline story on the home routes only.
- **Still on my desk** contains the entire shared Now collection. Footer Now and
  hero Contact navigation stay within the page. Legacy readers remain supported.
- Body text is 18px; controls are 14–15px and essential secondary labels are at
  least 13px. Muted text has stronger contrast in both themes. Tight serif letter
  spacing and the small monospace body/control styling have been removed.
- Supported browsers animate disclosure height in both directions with native
  `::details-content` and `interpolate-size`. Others retain native disclosures
  with a short entrance fade. No fixed height truncates long CMS articles.
  Reduced motion disables the transitions. Implementation reference:
  [Chrome's native details guidance](https://developer.chrome.com/blog/styling-details).

Validation: 9 essentials, 16 CMS, 16 notes and 31 integration tests passed, along
with production build and distribution verification. Desktop/mobile visual review
was unavailable (`Local browser access is unavailable for this chat`). Responsive
rules are authored but this update has not been visually verified or deployed.

## Earlier quiet discoveries — 2026-11-14

The marked wordmark, italic first name and reversible portrait are preserved.
The new presentation copy is shorter: “A little work. A little wonder.” introduces
the page, while the full shared profile copy remains in **Behind the hello**.
The section names are **A few words**, **Things made**, **Loose thoughts** and
**Leave a line**. Presentation copy is specific to 1D; published personal content
and destinations continue to use the shared CMS.

- **About:** a small ink loop draws on hover/focus; **Between the lines** unfolds
  the complete biography and tools as a margin note.
- **Work:** **Unfold the work** reveals a paper proof with its summary, image,
  details and technologies. Project, source and demo links remain direct links.
  The project reading page starts with the proof expanded.
- **Notes:** real article links gain a drawn underline and an ink-colored margin
  annotation. Summaries stay visible, including on touch devices.
- **Contact:** **Open a line** unfolds a letter containing every current contact
  option. Opening the letter does not initiate a call, email or booking.
- **The small print:** a final native reveal with a short thank-you.

All reveals use native details/summary controls. Open-state text labels are kept
separate from animated icons, content can grow with long CMS text, and motion is
disabled under reduced-motion preferences.

## Source

- `server/render-essentials.mjs`: 1D sections, portrait and reading-page markup.
- `server/render-public.mjs`: shared page rendering and stable CMS replacements.
- `src/zero/zero.css`: responsive layout, themes, interactions and print rules.
- `src/zero/discoveries.css`: simpler presentation and section-specific reveals.
- `src/zero/reading.css`: readable typography, inline stories and disclosure motion.
- `index.html`, `1d/index.html`, `work/*.html`: current offline templates.
- `scripts/test-essentials.mjs`: shared content, native navigation, escaping,
  empty collections, rerendering and script-free contracts.

## Validation

On 2026-11-13, the essentials (7), CMS (16), notes (16), journey (9) and integration
(31) tests passed. The production build and distribution verification passed.
Local HTTP checks returned 200 for both home routes and all three reading pages,
with the new layout and no script elements.

Browser access was unavailable in this chat, so desktop/mobile screenshots,
native disclosure interaction, theme switching and print appearance still need
a visual browser review. Responsive, reduced-motion and print rules are authored,
but real-device rendering and performance have not been measured.

Preview: http://127.0.0.1:5173/1d/

No public deployment was performed for this update.

For the 2026-11-14 refinement, 48 essentials/CMS/notes/journey tests passed. The
production build and distribution verification passed. Browser Use could select
the browser, but new review tabs failed to attach, so this refinement has no
desktop/mobile visual verification or screenshot evidence. The Firebase-backed
development response also timed out locally; no backend settings were changed.

Built offline preview with the default shared content:
http://127.0.0.1:5174/1d/

## Personal signature and Hello envelope — 2026-11-14

The supplied signature was traced into local SVG strokes: the tall V, ascending
letters, and returning oval flourish. Notebook lines and annotations are not
included. It signs the portrait reverse and the contact letter, drawing once
when either is opened. Other CMS profile names retain a text signoff.

The contact envelope keeps its face in view while opening: a hinged flap, a
small staggered Hello gesture, an ink underline, and a revealed contact sheet.
Hover, keyboard focus and native open states drive the effects. Touch users can
tap the whole summary; reduced motion shows the final ink without animation.
Contact content still grows naturally and links retain their original behavior.

Source: `src/shared/signature.js`, `server/render-essentials.mjs`, and
`src/zero/discoveries.css`. The 7 essentials and 16 CMS tests, production build,
and distribution verification passed. The built local preview returned HTTP 200
with the signature markup. Browser tabs still failed to attach; desktop/mobile
animation appearance remains unverified. This change has not been deployed.
