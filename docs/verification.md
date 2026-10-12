# Portfolio revision verification

Browser checks on 2026-10-08 used the running Vite app at `http://127.0.0.1:5173/`.

## Verified in the browser

- Desktop at 1280 × 720: Work has one pin spacer. Its 1965 px height includes the 720 px section and 1245 px horizontal scroll distance. TechStack stays below the pinned project cards, then appears in its own clipped section.
- At the final project cards, TechStack's top remained below the viewport. The tech scene and Contact content also remained separate, with about 140 px between their visible bounds at the final desktop scroll position.
- Mobile at 390 × 844: Work has no pin spacer. Its project row scrolls horizontally; advancing the row changed `scrollLeft` to about 346 px and displayed project 02. Vertical scrolling proceeds directly to Contact without a leftover pin gap.
- Resizing back to desktop recreates one pin spacer and resets the row's native `scrollLeft` to zero.
- The first avatar revision rendered a lower fitted cap, clean-shaven face, smiling mouth, and broader cheekbones/jaw. `avatar-revision-initial.jpg` shows this intermediate revision with the preceding eye material.

Screenshots are saved under `docs/screenshots/`. TypeScript checks passed for the section changes.

## Final eye material limitation

The subsequent procedural eye shader was reviewed in source. The browser became unavailable before a fresh final render could be captured: browser inventory returned no enabled browsers, and creating a replacement in-app browser failed even after resetting the runtime.

Therefore the final eye appearance, GPU shader compilation, and eye-click head-shake interaction were not verified in this browser pass. The intermediate avatar screenshot must not be represented as a screenshot of the final eye material.
