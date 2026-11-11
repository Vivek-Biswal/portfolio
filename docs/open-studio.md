# Open studio implementation

Local preview: run `npm run dev`, open `/3d/`, then choose the studio building.
The current local preview uses the detailed animated 2D character in the 3D studio.
It has not been deployed. Earlier Blender character files are preserved but are no
longer loaded by the studio. The character-phase history below describes that earlier pass.

## Object-specific readers — 2026-11-11

- Contact opens an internet-phone shell with a browser strip, contact-channel tiles,
  save-contact/profile links and a home indicator. Links still come from the shared
  contact helpers; no external page is embedded or contacted until its link is used.
- Notes open a cloth-bound journal with paper leaves, a centre gutter, a ribbon,
  folio numbers and an endpaper for odd spreads. Phones show one page at a time.
  Long articles, empty collections and CMS updates retain the existing reader flow.
- Projects open a monitor with its own desktop wallpaper, file window, folder
  navigation and project detail view. Project links and technologies remain shared.
- Studio games use a cabinet marquee, a per-game accent, framed canvas, score panel
  and physical-looking controls. The existing game controller and score storage are
  unchanged. The regular outdoor arcade retains its existing styles.
- Project navigation no longer triggers the notebook animation. Controls retain
  keyboard focus, the dialog close/Escape flow and reduced-motion support.
- `tmp/studio-readers-preview.html` opens the three readers directly with clearly
  labelled sample content. It is a development-only fixture, excluded from builds.
  The browser kernel still cannot initialize, so a visual desktop/mobile review
  and real-device performance verification remain outstanding.

## Screenshot collision fixes — 2026-11-11

- The character is now an upright, yaw-facing mesh rather than a camera-pitched
  Three.js Sprite. Its head stays over its feet when orbiting or zooming, preventing
  the upper body from passing through tables and arcade cabinets.
- All seated frames register their pelvis to the real seat centre and top surface
  (.585 for desk chairs, .583 for the runtime-scaled arcade stools). Mirroring does
  not move that contact point. Station-facing direction comes from the destination
  camera, not the last walking direction. Alpha-tested depth writing preserves
  normal furniture occlusion without drawing the character over everything.
- Rebuilt `studio-props.blend` and `studio-props.glb`: book, phone and keyboard are
  fully supported by their tabletops. Cover/page pivots sit at the book surface, so
  opening cannot swing covers below the table. The old static notebook writing is
  excluded from batching. The cradle receiver follows the actual sprite pose.
- Tests inspect the real exported furniture and moving props, verify all ten seat
  contacts, and sample book opening positions. The archived 3D rig test explicitly
  retains its original cradle coordinates; the live scene uses the new 2D layout.
- Browser and Windows inspection kernels both failed to initialize. Offline Blender
  geometry review images are in `tmp/studio-fixes/`; these are asset-placement
  checks, not live browser screenshots or verification of transition timing.

## Current character and camera update — 2026-11-11

- `studio-pixel-avatar.js` reuses the outdoor character's complete standing and
  eight-frame walking poses. The sprite faces the camera and mirrors with movement.
  Artwork is not cut into limbs or stretched into a simulated seated pose.
- Station transitions now render authored 2D sitting, seated interaction and
  standing poses at full opacity. The previous fade-out was removed. Four sitting
  keyframes play forward when sitting and backward when standing, with separate
  keyboard, book and phone poses. Every frame uses the standing frame scale, so
  seated characters are not stretched taller. The interaction controller,
  cancellation and saved exploration position remain shared across all stations.
- New sprite: `public/2d/vivek-station-poses-v1.png` (transparent RGBA, 4 by 2
  frames), created with the built-in image generator. Prompt and reference are
  recorded in `docs/station-sprite-prompt.md`. This is a sprite animation, not a
  rigged hand/seat constraint solver; final seat contact needs browser review.
- Scroll over the area you want to inspect to zoom toward the pointer. Right-drag
  or Shift-drag pans; left-drag rotates. Touch uses two fingers to pan/pinch.
- The area selector smoothly frames Projects, Ideas, Arcade or Contact without
  moving the character. View restores the room overview. Minimum zoom distance is
  now 3 units instead of 9, and the orbit target is no longer fixed at the centre.
- Local tests exercise the real OrbitControls wheel/pan behavior, verify Projects
  and all seven cabinets fit their area views, and check sprite action completion
  and cancellation. The browser-control tool failed to initialize on this date,
  so these changes have not yet had a fresh visual browser review.
- Validation: all 39 studio tests, the production build and distribution checks
  passed. Vite still reports the existing large studio bundle warning.

## Working flow

- The original pixel desktop leads into a lazy-loaded Three.js studio.
- Arrows/WASD or held touch arrows move the character relative to the camera.
  Releasing the input stops movement. Clicking a distant object marks its interaction
  point without starting an automatic walk.
- Drag the canvas to orbit, scroll/pinch to zoom, pan to inspect corners, and use View to return.
- Approach a desk, phone, or game cabinet, then click its label/object, press E,
  or use the action button. Projects, Notes, and Contact reuse the existing CMS content.
- E near a station starts alignment, sitting, object use and the focused reader.
  Closing puts the object away, stands the character up, and restores the position
  and camera. Games reuse the existing controllers and score storage.
- Help contains the instructions. Contextual action prompts appear near a station.
  Skip animation and Escape are available throughout the sequence.
- The cat alternates between resting and roaming, steers around furniture, and
  flees when the character approaches. Its body parts remain the same across poses.
- A failed room/WebGL load opens the existing classic arcade instead.
- No Firebase schema, authentication, public-world URLs, or paid services changed.

## Assets and rebuilds

The runtime room is `public/studio/sunset-studio.glb`. Editable source:
`docs/assets/sunset-studio.blend`. The earlier room and its Blender saves are preserved.
The rendered façade is `public/studio/entrance.png`,
with source `docs/assets/studio-entrance.blend`. Both were built locally with Blender.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --disable-autoexec --python scripts/build-sunset-studio.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --disable-autoexec --python scripts/build-studio-entrance.py
```

`studio-world.js` owns fixed furniture coordinates, collision, and interaction points.
Keep its obstacle positions aligned with `build-sunset-studio.py` when moving furniture.
The Blender room's static meshes are merged by material and wall group at load time.
The two foreground perimeter walls fade away as the camera rotates. Wall-attached
plants and window frames fade with them. Reduced-motion preference removes the fade.
Rendering stops while hidden or in an existing desktop fallback reader. The focused
studio reader retains the seated pose and subtle scene movement. The skyline is instanced geometry;
sunset is fixed rather than a day/night cycle. Projects is raised, with a walkable stair approach.
The cat uses a short escape route when local steering is blocked by furniture.

## Validation

```text
npm run test:studio
npm run test:arcade
npm run test:notes
npm run build
npm run verify:dist
```

Browser checks must cover: entry/exit, rotation/reset, touch hold/release, a shared
reader, game return, and a narrow viewport. The tests cover collision/substeps,
camera-relative input, cat escape/recovery, shared notes, and game lifecycle/score retention.

The earlier room pass was locally verified on 2026-10-31: production build and distribution checks pass;
78 combined studio, arcade, locomotion, and notes tests pass. Browser checks covered
the rendered entrance, held touch movement, Notes open/close with position retained,
Brick Breaker launch/return, physical desk selection without auto-walking, camera
rotation with back-wall cutaway, and narrow-screen overflow. No browser warnings or
errors were recorded in the final studio check. The Three.js studio chunk is loaded
only on entry (about 158 kB gzip); the GLB is about 2 MB. Real-device performance
profiling remains pending. These visual checks apply to the earlier room, not the sunset rebuild.

The sunset rebuild adds furnished Projects, Ideas, Contact and Arcade areas, an oak
floor, patterned rugs, books, ivy, lanterns, seven cabinets and a surrounding skyline.
Its GLB is about 6 MB and loads only on studio entry. Twelve focused studio tests cover
all destination routes, collisions, stairs, camera quadrants and cat escape/recovery.
The exported GLB parses successfully and merges into 80 static material batches.
Production build, distribution validation, arcade tests and notes tests pass.
Browser checks completed on 2026-11-01: held keyboard input stops on release;
Snake launch/return and Notes open/close retain the exact character position;
camera rotation switches the two foreground walls and hides the backs of display panels.
At 390 x 844, the portrait camera fits the floor, touch-arrow hold/release works,
and the document has no horizontal overflow. Desktop rendering reported no warnings
or errors during inspection. Real mobile hardware performance remains unverified.
The Blender preview is an offline asset render. `sunset-mobile-browser.png` records
the actual mobile browser view. The browser connection became unavailable again
before the final desktop screenshot could be saved.

## Character and object interaction delivery

- Editable character: `docs/assets/studio-avatar.blend`.
- Runtime character: `public/studio/studio-avatar.glb`, one mesh, one skin, thirteen clips.
- Editable props: `docs/assets/studio-props.blend`; runtime: `public/studio/studio-props.glb`.
- The room source files are preserved. Runtime batching fits the stool height to
  the seated pose without overwriting the existing room Blender file.
- Character rebuild: Blender `--background --python scripts/build-studio-avatar.py`.
- Prop rebuild: Blender `--background --python scripts/build-studio-props.py`.
- Pose stills: Blender `--background --python scripts/review-studio-avatar.py`.
  Run these from the repository root. The generators replace their own two output
  Blender files, so save hand-edited copies under a different name before rebuilding.

To view animations in Blender, open `studio-avatar.blend`, select `VivekRig`, switch
the lower editor to Dope Sheet > Action Editor, and select a named action. Set the
timeline range to that action's frame range and press Space. The same mesh and rig
are used for idle, walk, turn, sit_down, stand_up, seated_idle, typing, book_open,
page_turn, phone_pickup, phone_putdown, arcade_play and release. Front/side/back and
walk/sit/typing/phone/stand stills are saved alongside the Blender file.

`studio-interaction.js` owns the sequence and invalidates stale completion callbacks.
`studio-anchors.js` owns each station's seat, approach, facing and focused camera.
`studio-reader.js` reads the existing shared CMS data with stable selected IDs.
Projects use the monitor reader, ideas use a selectable paginated notebook, and
the telephone presents existing contact links without initiating a call.
The seven cabinets retain their controllers and local scores.

The local-only `?studio-review` query adds station positioning controls for pose QA.
It does not ship in the production JavaScript. Public exploration remains manual.

## Character-phase verification and limits

The 2026-11-03 local pass ran 110 tests covering studio collisions/cutaways/cat,
interaction transitions/cancellation, exported assets, alternating walk stance,
constant leg lengths, long notebook pagination, arcade behavior, shared notes and
CMS/admin contracts. Production build and distribution validation passed.

Browser checks covered all seven cabinet launches and returns, Projects details,
the notebook contents/article, telephone contact reader, camera restoration and
focus restoration. At 390 x 844, the notebook uses one readable page with no
horizontal overflow; held movement stops on release. `studio-book-mobile.png`
records the actual browser reader. Browser emulation is not a real-device benchmark.

The 2026-11-04 continuation refit the telephone grip/earpiece and arcade stools,
removed an accumulating blink offset, and kept Help scrollable on short landscape
screens. Fourteen interaction/asset tests now pass, including a measured cradle-to-ear
contact check (111 tests across the previously checked suites). The latest production
build and distribution validation pass. The lazy studio chunk is about 169 kB gzip;
Vite still reports its expected large-chunk advisory for the Three.js bundle.

Additional browser checks verified repeated E plus Escape during alignment, Skip
while opening and closing, the telephone reader, and landscape Help at 844 x 390.
Temporarily withholding the avatar asset opened the usable classic arcade with a
retry message; restoring the asset and re-entering loaded the studio successfully.
The final clean scene screenshot is `studio-character-desktop.png`.

Remaining visual acceptance: likeness refinement against the supplied portrait,
close-up hand/finger contact during every transition, and terrain/foot contact on
stair edges. The mathematical walk tests do not replace that visual inspection.
The stylized model is not a facial scan or motion-capture asset. Real mobile GPU,
memory and thermal performance have not been measured.

The animated doorway transition, day/night cycle and public deployment remain
outside this character-and-interaction phase.
