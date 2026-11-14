# 1D: the quiet edition

The essentials at `/` and `/1d/` remain script-free HTML. The design uses system
serif and monospace type, warm paper, fine rules, numbered margins and a restrained
blue ink accent. There are no new dependencies, web fonts or external services.

Small interactions use native HTML and CSS:

- The portrait's **Turn over** disclosure reveals a short note and the current
  CMS profile status. **Turn back** restores the portrait. The revealed note grows
  naturally for long status text and names instead of clipping them.
- Project images and details open through **A closer look** disclosures.
- Links respond subtly to hover/focus, and anchor navigation briefly marks the
  destination margin. Reduced motion disables transitions and smooth scrolling.
- System/Light/Dark uses the existing CSS-only theme selector. No theme preference
  is written to browser storage.

The Notes, Now and project reading pages use the same paper-and-ink treatment.
Notes have a native contents list and stable article anchors; all published text
remains in the document. The current contact, booking, social and project links
still come from the shared CMS.

## Quiet discoveries — 2026-11-14

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
