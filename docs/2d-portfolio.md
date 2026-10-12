# VivekOS: the 2D portfolio

Open `/2d/`. This original pixel desktop follows the desktop metaphor and the
walking-and-interacting idea discussed using PixelOS and Matteo Santoro's
portfolio. The Framer template and Pokemon artwork were not copied.

## Experience

The welcome scene opens on arrival. Open About, Projects, Notes, Contact or
Settings from the icons, introductory button or Start menu. Each app has one
window. Reopening raises/restores it; title-bar controls minimize, maximize or
close it. Desktop title bars support dragging and arrow-key movement. Phone
windows fit the workspace and scroll their own content.

The approved About portrait stays intact with a gentle whole-body idle lift.
Click it to change its greeting. Walking uses original complete pixel frames,
with connected arms and legs, swept black hair, warm skin, black clothes and
cream shoes. Integer scaling keeps the sprites on their native grid. A separate
character layer keeps the outdoor walker visible in front of the building.

Settings offers lavender, peach and mint wallpapers, plus optional scanlines.
Preferences and game records stay in the visitor's browser when storage is
available. Reset Desktop preserves display preferences. The clock uses India
Standard Time. Email links open the visitor's mail app; copy-email explains a
manual fallback when the clipboard is blocked.

## Arcade

Click the building or Arcade in the taskbar. Vivek runs to the entrance and
enters a room that fills the desktop workspace. Tall screens use two cabinet
rows; short landscape screens use one. The floor, garden, cabinets and arcade
exterior are original canvas/SVG artwork. Cabinets show miniature game motifs.

Walk using arrows/WASD, the directional pad, or floor clicks. Click a cabinet to
walk there and play. Near a cabinet, Enter/E/Space also selects it. Paths avoid
cabinet bodies. Walk through the bottom exit or select Desktop to leave.

| Game | Controls and goal |
| --- | --- |
| Snake | Arrows/WASD collect fruit. All four edges wrap; hitting your tail ends the round. |
| Brick Breaker | Left/right move; Action launches. Clear bricks with three lives. |
| Memory Match | Click cards, or arrows select and Action flips. Match eight pairs. |
| Glitch Run | Space/Action/up jumps, with two jumps before landing. Catch sparks and avoid glitches. |
| Pong | Up/down moves against the computer. First to seven wins. |
| Block Drop | Left/right move, down soft-drops, up rotates, Action hard-drops. Complete rows. |
| Coin Maze | Arrows/WASD collect coins while avoiding patrols. Three lives, two-minute clock. |

Each game has Pause, Restart and Arcade controls. P/Escape pauses; P/Resume
continues. Escape while paused returns to the room; R restarts inside the game.
A single native result dialog owns pause/game-over messages, with keyboard
focus kept in its actions. Touch controls remain available. Records are tracked
per game and merged with higher records from other tabs.

Gameplay pauses when the page loses focus/visibility or focus moves to
navigation. Room input stops on blur. Portfolio windows retain their positions,
contents and minimized states while the arcade is open. Reduced motion stops
ambient walking/portrait idle motion and skips the entrance run; manually
started gameplay retains the motion needed to play.

## Files and provenance

- `2d/index.html`: shell, app icons, dimension links and no-JavaScript fallback.
- `src/two/desktop.js`, `desktop.css`, `content.js`: windows, preferences and content.
- `src/two/typography.css`: pixel display/copy styles matching the supplied reference.
- `src/two/companion.js`, `companion.css`: intact portrait and whole-frame sprites.
- `src/two/arcade.js`, `arcade.css`: entry, room, controls, overlays and records.
- `src/two/arcade-world.js`, `arcade-art.js`: paths, collisions and original scenery.
- `src/two/arcade-games-a.js`, `arcade-games-b.js`, `arcade-runner.js`: seven games.
- `src/two/game-engine.js`: fixed-step runner simulation.
- `public/2d/arcade-building.svg`: original building art.
- `public/2d/cursor-arrow.svg`, `cursor-hand.svg`: large pixel mouse cursors.
- `public/2d/vivek-pixel.png`: image generated from Vivek's supplied photographs.

The approved 1024 x 1536 RGBA portrait is preserved, with normal image sampling
in About. Small animated sprites use native pixel sampling. Press Start 2P and
Pixelify Sans are hosted locally under `public/2d/fonts/`, downloaded from the
[official Google Fonts repository](https://github.com/google/fonts). Their SIL
Open Font License files are included. Press Start 2P provides display lettering;
Pixelify Sans provides readable copy, controls and canvas labels.

## Build and verification

Use `npm run dev -- --host 127.0.0.1 --port 5173` while editing. Production uses
`npm run build` and `npm run verify:dist`. See `vercel-deployment.md` for hosting
configuration and the inherited 3D asset/license release constraint.

`node --test scripts/test-arcade-games.mjs scripts/test-arcade-world.mjs scripts/test-glitch-run.mjs`
passes 36 tests. They cover four-edge Snake wrapping, reversal/self-collision,
lifecycle cleanup, Memory wins and frozen reveal delays, Block Drop rotation and
line clearing, maze connectivity and patrol losses, all cabinet paths,
responsive room sizes, 400 arbitrary click paths and fixed-step runner behavior.

Browser checks inspected the refreshed desktop, phone and short-landscape room,
building arrival, cabinet selection, Snake, native pause dialog, desktop
restoration and the intact About portrait. These checks do not claim that every
gameplay combination was manually played. OS reduced-motion emulation was not
available; that behavior was source-reviewed. Countdown expiry itself is not
asserted by the maze tests. No production deployment was performed.
