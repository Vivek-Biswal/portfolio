# Vivek's 0D portfolio

The default homepage is a standalone HTML portfolio with a small shared stylesheet.
The previous React/Three.js experience is available at `/3d/`. Its source stays in
`src/`; the 0D pages do not import it.

## Pages and editing

| URL | Source | Content |
| --- | --- | --- |
| `/` | `index.html` | Introduction, portrait, About, selected work, notes, and contact |
| `/work/dimensional-portfolio.html` | `work/dimensional-portfolio.html` | Portfolio project case study |
| `/work/notes.html` | `work/notes.html` | Draft design notes |
| `/work/now.html` | `work/now.html` | Current focus |
| `/1d/` | `1d/index.html` | Along a line |
| `/2d/` | `2d/index.html` | VivekOS pixel desktop |
| `/3d/` | `3d/index.html` → `src/main.tsx` | Existing experimental 3D version |

Edit the HTML directly to change the bio or add projects. The current bio and notes
are drafts written for Vivek. Only the portfolio itself is listed as a project;
employment, education, and social handles have not been invented. 1D is available
at `/1d/`; the 2D pixel desktop is available at `/2d/`.

Shared styles are in `src/zero/zero.css`. The portrait, favicon, and project image
are in `public/0d/`. The project image shows an earlier avatar iteration and is
captioned accordingly. The 3D prototype retains the original project's credits.

## Contact

The email links open the visitor's email application and use
`vivekbiswal.dev@gmail.com`. There is no contact form or message-delivery backend.
`public/0d/vivek-biswal.vcf` is a downloadable contact card.
`public/0d/vivek-biswal.txt` is a short draft profile, not a credentials-based résumé.
Update both downloads if the name, email, or bio changes.

## Run and build

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

`vite.config.ts` lists all seven HTML entries. The build emits the four 0D pages
with only a stylesheet; React, Three.js, and animation scripts belong to `/3d/`.
Publish the complete `dist/` directory on a static host to preserve both versions.
The site currently assumes it is hosted at the domain root.

## Verification

- Production build passes; existing warnings come from the 3D dependencies and bundle sizes.
- Browser review covers desktop, 390px and 320px mobile layouts, page links,
  section anchors, native expandable details, keyboard navigation, and downloads.
- A production HTML inspection confirms the 0D pages have no script tags or
  JavaScript module preloads. A JavaScript-disabled browser session was not available.
- Screenshots are in `docs/screenshots/0d-desktop.jpg` and `0d-mobile.jpg`.
