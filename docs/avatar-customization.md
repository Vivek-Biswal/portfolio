# Personalized 3D avatar

This local version keeps the cloned website's layout, purple lighting, rig,
typing animation, blink morphs and scroll camera transitions. The included
rigged character is customized at load time by
`src/components/Character/utils/personalizeAvatar.ts`.

The current facial reference is Vivek's supplied portrait and original color
photos. The earlier pixel reference still informs the black crewneck, charcoal
trousers and cream sneakers. The portrait pass narrows the overall head, tapers
the jaw, reduces eye size, fills and arches the brows, broadens the nose base
slightly and widens the friendly smile. It remains clean-shaven, without a cap.

This is a stylized sculpt of the animated base mesh, rather than an exact
portrait reconstruction. The black top and trousers keep their original
rigged geometry. Hair, mouth interior and curved teeth are native 3D geometry
attached to the head bone. Neutral face lighting keeps the skin warmer while
the purple background and rim remain part of the site's visual style.

The portrait revision replaces the inflated hair locks with a short continuous
scalp and shallow, surface-fitted swept details. Skin uses a higher-roughness
material and very fine procedural grain to soften its plastic appearance.
The smile has subtle enamel separation and warmer tooth color. Lighting uses
a more neutral key, less environment intensity and a restrained lavender rim.
Eye shaping follows the actual socket; base and blink normals are regenerated
together, and all head details share the same portrait proportion transform.

## Preview

Run `npm run dev` and open `/3d/` on the URL Vite prints. At the top of the page:

- Move the pointer to turn the character's head.
- Hover over the face for the eyebrow reaction.
- Click or tap an eye for a short head shake. Dragging to scroll does not trigger it.
- Keyboard users can tab to the "Shake my head" button.
- Scroll down to see the original camera and monitor transition.

Character motion respects `prefers-reduced-motion`. The rest of the cloned
website's existing animation system remains in place.

## Editing the appearance

The `avatarAppearance` values control skin, hair, lips, eyes, outfit and shoes.
`createSweptHair.ts` builds the fitted scalp, side part and shallow swept relief.
`createAvatarSmile.ts` opens the authored lip boundaries using surface distance
and creates the curved teeth and mouth interior. `createEyeSocketMask.ts`
limits eye shaping to the actual socket, protecting the nose bridge. These helpers are next to
`personalizeAvatar.ts` in `src/components/Character/utils/`.
The sculpt and head details use the included model's bind-pose coordinates.
Changing to another model will need its mesh/bone names and proportions adapted.

The original GLB and animation clips are unchanged on disk. Added details are
parented to the head bone, so they follow the existing movements. Skin and
clothes use independent materials. Loading and teardown own their textures,
geometry, timers, listeners and scroll effects.

## Verification

Run `npm run build` for TypeScript and production compilation.
Run `node scripts/verify-avatar.mjs` to check facial and eye topology, preserved
UVs and blink closure, rig preservation, reference outfit colors, cap removal,
the actual grin opening, curved teeth, swept hair, eye raycasts and finite
deformed geometry across all 11 animation clips. The head-following check also
turns the head and checks every added detail's world transform. Base and all
three regenerated facial normal endpoints must be finite and have unit length.

The portrait revision is checked with the same topology, blink, eye raycast,
normal and 11-clip animation assertions. Hair bounds now allow the intentionally
shorter portrait hairstyle. These checks validate rig integrity; they do not
establish facial likeness. Judge likeness in the live preview against the photos.

The offline verifier also writes mesh data to `tmp/` for a geometry preview.
That preview uses simple CPU lighting; it is not a browser screenshot and
does not reproduce the site's HDR environment or tone mapping. The avatar is
actual 3D geometry; it does not place a photograph over the animated face.
The export retains the geometry's smoothed normals and transforms them through
morphs, skinning and world space; it also records material roughness and related
parameters. It does not recreate the live GPU shader or HDR lighting.

The earlier pixel-reference revision was inspected in the live browser at
1280 × 720. Frontal, pointer-controlled turned, and seated typing views show
the cap removed, swept hair, warm skin, the open toothy grin and matching
outfit. Teeth and hair stay attached during the head turn and seated camera
transition. The eye click was exercised, and both skinned eye surfaces pass
the independent camera-ray check. The GPU captures are:

- `docs/screenshots/avatar-pixel-match-front.jpg`
- `docs/screenshots/avatar-pixel-match-turn.jpg`
- `docs/screenshots/avatar-pixel-match-seated.jpg`

These captures precede the face-polish revision. The frontal and turned views
include the earlier eye width and iris refinement; the seated capture verifies
the hair, smile and outfit before that eye-width adjustment. A fresh GPU capture
of the polish revision was unavailable because the browser tool exposed no
browser surface. The current polish revision has offline geometry verification;
its rendered appearance still needs review in `/3d/`.

Blinking can produce partly closed eyes in individual screenshots; the source
clip has short closure pulses and open resting morph weights. The verifier
checks both complete blink endpoints against the actual eyelid landmarks.
An intermediate hot reload in that earlier revision displaced the canvas; a
full page reload restored its centered placement. Those screenshots use that
clean load. During that load, the browser reported only the inherited Three.js shader derivative
warning; earlier import errors occurred while helper files were being written.

These checks verify geometry, animation compatibility and the visible browser
result. They do not establish exact facial likeness or physical-device touch
behavior.

The inherited project's LICENSE and README remain applicable to its original
code, design and assets. No publication or deployment is performed here.
