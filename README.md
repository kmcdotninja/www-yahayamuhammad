# Yahaya Muhammad — Portfolio

Personal portfolio site. A handful of work case studies, a playground of in-between experiments, and some notes. Live at [creative-portfolio-orpin.vercel.app](https://creative-portfolio-orpin.vercel.app/).

## Stack

- **React 19** + **Vite 8** — SPA, custom history-based router (`src/lib/router.js`)
- **GSAP** + **Lenis** — scroll-driven reveal animations and smooth scrolling
- **react-three-fiber** + **three.js** — the 3D model on the home hero
- **snd-lib** — UI sound effects
- **Vercel** — hosting (SPA rewrite in `vercel.json`)

No CSS framework — plain CSS variables for theming, scoped per-component stylesheets.

## Develop

```bash
npm install
npm run dev      # vite dev server
npm run build    # production build → dist/
npm run preview  # serve the built bundle
npm run lint     # eslint
```

## Routes

| Path | Page |
|---|---|
| `/` | Hero + Works grid + Footer |
| `/playground` | Bits and experiments |
| `/note` | Manifesto / writing |
| anything else | Custom 404 |

All routes are client-side. `vercel.json` rewrites every path to `index.html` so direct URL hits and refreshes load the SPA instead of Vercel's default 404.

## Project layout

```
src/
  components/    UI components (one .jsx + one .css per piece)
  hooks/         useTheme, useScrollAnimations, useSnd, useReducedMotion
  lib/           router.js (history API + smooth scroll), lenisStore.js
  App.jsx        Route switch + page-transition orchestration
  main.jsx       Entry
public/          Static assets (images, sounds, 3D model, favicon, og preview)
```

## Notes for future me

- **Theme.** Tokens live in `src/hooks/useTheme.js` (LIGHT / DARK). `data-theme` is set on `<html>`.
- **Scroll lock.** The mobile menu shifts `<body>` with `position: fixed` to lock scroll. GSAP ScrollTrigger's `toggleActions: 'play none none reverse'` will fade reveal items out when the body moves — change either the lock approach or the toggleActions if that becomes a problem.
- **OG image.** `public/preview.png` is referenced as an absolute URL in `index.html` because some social scrapers reject relative paths. Update the URL there if the domain changes.
