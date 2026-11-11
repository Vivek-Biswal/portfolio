# Station sprite artwork

Created using the built-in image generator. Reference: `public/2d/vivek-walk-v2.png`.
Output: `public/2d/vivek-station-poses-v1.png`. The original generated PNG is preserved; the browser samples its eight cells without resizing the seated poses to standing height.

## Generation prompt

Create a production game sprite sheet matching exactly the detailed pixel-art young man in the reference: recognizable face, swept black hair, warm brown skin, black sweatshirt, dark charcoal trousers, cream white sneakers. NATURAL same proportions and same head size, no chibi. TRANSPARENT BACKGROUND. Output a perfectly regular 4 column by 2 row sprite sheet, eight full-body poses, no text, no chair, no objects, no ground, no shadows, no glow. Every cell equal dimensions, generous transparent margins. Same 3/4 view facing RIGHT in all frames. Same scale in every cell, feet at the SAME BASELINE, same hip horizontal anchor. Row 1 frames 0-3 chronological sitting animation: 0 standing relaxed arms down; 1 slight knee bend and torso lean forward preparing to sit; 2 halfway lowering hips with knees bent; 3 fully seated on an invisible chair, thighs nearly horizontal pointing right, knees bent 90 degrees, feet flat on floor, hands resting on thighs. Row2 frames4-7: 4 identical seated pose with forearms reaching comfortably forward to a keyboard; 5 same seated pose fingers slightly lowered typing; 6 same seated pose right hand holding invisible phone receiver beside right ear, left hand resting on thigh; 7 same seated pose hands extended forward gently turning a book page. Feet stay planted at same baseline, seated height naturally shorter than standing. Pixel art crisp detailed edges. Crucial: no furniture painted into sprites. Preserve identical facial structure, body scale and outfit across all 8 frames.

## Inspection

The generated asset has a transparent RGBA background and eight complete poses. It includes a small receiver/book in the relevant hands despite the no-object instruction; the runtime hides the duplicate 3D telephone receiver while the phone pose holds it. It has four sitting keyframes and two typing keyframes, not eight sitting keyframes. Browser tooling failed to initialize, so in-room visual alignment remains unverified.
