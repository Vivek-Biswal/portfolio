# Studio entrance — 15 November 2026

The outdoor `/3d/` desktop now uses an evening architectural composition: locally hosted Instrument Serif and Manrope, a softly lit studio illustration, a dark botanical landscape, faint orbital lines and eight subtle CSS light particles. The existing lavender, mint and peach preferences select corresponding dusk palettes. Reduced-motion preferences disable ambience, entrance motion and hover travel.

The new Step inside action uses the same startup-bound studio entry listener as the building. About, Projects, Notes, Contact, Settings, desktop windows, studio fallback and games retain their original controllers and shared CMS content. Both the source template and server renderer contain the new entry action. Canvas rendering publishes the actual walking floor offset to CSS so the building stays aligned after resizing. Outdoor character scale is smaller; the same distance-based walk cycle and manual controls remain in use.

The generated asset and full generation prompt are documented in `studio-entrance-asset.md`. The illustration is an exterior entrance; the interactive Three.js interior is unchanged.

## Verification

- Production build and distribution verification passed.
- CMS, arcade/controller/locomotion and studio test suites passed (112 test cases, including generated cases). The existing CMS rerender check now also checks that the new entry and About actions survive repeated rendering.
- Browser screenshots reviewed at 1280×720 and 390×844: entrance, typography, art placement, responsive navigation and walking controls were visible and unclipped.
- Follow-up static review corrected short-landscape intro/control overlap and restored landscape safe-area insets. These final compact-layout adjustments were not visually rechecked: browser access became unavailable.
- Live studio entry/exit and content-window clicks could not be completed in this browser pass. Existing automated interaction/game tests passed; real-device performance is not measured.
- No public deployment was performed.
