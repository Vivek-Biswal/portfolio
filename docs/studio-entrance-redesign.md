# Pixel OS desktop — 15 November 2026

The current /3d/ entrance is a pixel mini-game desktop. This replaces the previous evening architectural landing-page treatment, following the user's correction to preserve the OS concept. The 1D and 2D worlds are unchanged.

## Desktop experience

- Pixel type, pastel wallpaper, tactile window borders, desktop apps, Start menu and taskbar.
- A draggable readme.txt window with keyboard movement, close/reopen controls and the existing studio action. Its title and introduction still come from the shared CMS.
- A locally authored SVG studio and canvas pixel landscape: cottages, clouds, gardens and a pond. The existing manual character movement and distance-based gait remain intact.
- Four collectible pixels with a saved curiosity badge, a pettable cat, a recycle bin that reveals a seed and grows a flower, and a mystery floppy that launches one of the seven existing games without immediately repeating the last choice.
- Discoveries persist locally when storage is available and remain usable when it is blocked. Reduced-motion preferences suppress decorative motion. Desktop surprises suspend while the studio or arcade is active.
- Compact phone and landscape layouts put sidequests in a scrollable window. All new controls are buttons with keyboard labels. Closing a panel returns focus to its launcher; dragging the readme focuses its titlebar for keyboard movement.

## Preserved integrations

The existing app window manager, CMS subscription, content readers, Three.js studio, cutaway walls, interior cat, interaction controller, seven games and scores retain their controllers. The source template and server renderer both include the new readme actions. No new dependencies, external services or paid assets were introduced.

The original evening illustration remains an unused historical asset; the current entrance uses public/2d/studio-building.svg.

## Verification

- Production build, distribution verification and 117 CMS, admin, arcade, locomotion and studio tests passed; 34 focused surprise/controller/CMS tests were rerun after integration fixes.
- Browser interactions verified: readme close/reopen and keyboard movement, Projects app open/close, cat reaction, seed and flower, collecting all four pixels, mystery disk opening Brick Breaker and returning to desktop, and studio entry/exit.
- Desktop reviewed at 1280×720. Phone-sized layouts checked at 390×844 and 375×667 with no horizontal page overflow. An 844×390 review exposed a landscape sidequest overflow; the final build uses a compact scrollable panel there. Browser access became unavailable before that last landscape correction and the final focus fixes could be visually rechecked.
- Real-device performance has not been measured. No public deployment was performed.
