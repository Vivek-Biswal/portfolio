# Along a line: the 1D portfolio

Open `/1d/`. This is a standalone HTML entry built by Vite, inspired by the compact
personal portfolio at https://pulkit.page/ and adapted to Vivek's dimension idea.
No reference text or personal credentials have been copied.

The four stops are Hello, Work, Ideas, and Contact. A continuous visual line connects
them. Native anchor links work without JavaScript. The small JavaScript module adds
active section tracking, reading progress, and a light/dark switch. Theme preference
is saved locally when browser storage is available. Motion follows the visitor's
reduced-motion preference. On smaller screens the chapter navigation moves above
the content.

- Content: `1d/index.html`
- Styles: `src/one/journey.css`
- Interactions: `src/one/journey.js`
- Entry configuration: `vite.config.ts`

0D links to 1D, and the 1D header lets visitors switch to 0D, 2D, or 3D.
The 2D link opens the pixel desktop. The Work stop shows the existing portfolio project
and its case study. Social handles, jobs, and additional projects have not been
invented. The contact links use Vivek's supplied email and existing downloads.

Run `npm run dev -- --host 127.0.0.1 --port 5173` for editing or `npm run build`
and `npm run preview -- --host 127.0.0.1 --port 4173` for a production preview.
Publish the full `dist/` folder at the domain root to retain every version.

## Browser verification

Checked the running page at 1280 x 720, 390 x 844, and 320 x 740. The portrait,
chapter navigation, project disclosure, notes, and contact content fit without
horizontal overflow. Chapter selection updates after native anchor clicks, and
the reading progress reaches 100 percent at the end. The light/dark button changes
its accessible label and retains the selected theme after reload. The project
disclosure opens through the keyboard with Enter.

Anchor testing found that root scroll padding and section scroll margins were
being added together, leaving the previous chapter selected after navigation.
Section scroll margins are now zero; the root scroll padding provides the header
clearance. Desktop and mobile chapter navigation were rechecked after that change.
A 640 x 320 landscape check then exposed a reading threshold above the anchor
position. The tracking threshold now includes the resolved scroll padding, and
the Work chapter was confirmed active after navigation at that size.

The 0D dimension navigation was also checked at 320 px: all three destination
links fit and Follow 1D opens the correct page. Contact download links point to the
existing vCard and text profile with the supplied name and email. A browser file
download could not be confirmed because the browser download operation stalled;
the served file content is checked separately over localhost HTTP. Mail links were
inspected without sending email.

Screenshots: `docs/screenshots/1d-desktop.jpg` and
`docs/screenshots/1d-mobile.jpg`.
