# SEO

Working reference for the portfolio's search presence: what the positioning is,
where every piece of metadata physically lives, what to touch when the copy
changes, and the ranked list of things still worth fixing.

Domain: `https://yahayamuhammad.com`

---

## 1. Positioning

**Primary target term: `product design engineer`.**

This is the main target and the sell pitch. Everything below should reinforce
one idea: *someone who designs **and** builds — takes products from the canvas
all the way into production code.* That hybrid is the differentiator; a plain
"product designer" or "UX designer" framing throws it away.

| | |
|---|---|
| **Primary term** | product design engineer |
| **Secondary** | design engineer · product design engineer Nigeria · design to code · Figma to code |
| **Brand** | Yahaya Muhammad · kmcdotninja |
| **Pitch line** | Designs, builds and ships products from canvas to code |
| **Location** | Kaduna, Nigeria |
| **Deliberately dropped** | "UX Designer" as a *job title* (still kept in `knowsAbout` as a skill) |

**Canonical copy** — keep these identical wherever they appear:

- **Title (home):** `Product Design Engineer — Yahaya Muhammad`
- **Description (home):** `Product design engineer who designs, builds and ships products from canvas to code. Based in Nigeria — case studies across edtech, fintech and developer tools.`

Case-study domains are **edtech (Kutuby), fintech (Groq), developer tools
(Waffle)**. Don't claim healthcare in descriptions — no public case study
supports it. (It's retained in `knowsAbout` as an area of expertise.)

---

## 2. Where the SEO lives

Five places. Changing the pitch means touching all five.

| File | Owns | Notes |
|---|---|---|
| [index.html](index.html) | `<title>`, description, keywords, canonical, robots, all Open Graph + Twitter tags, **4 JSON-LD blocks** | What crawlers and social scrapers read **first** — and, for `/about` + `/playground`, all they read (see §5 P1) |
| [src/lib/seo.js](src/lib/seo.js) | Per-route `title` / `description`, applied client-side | `ROUTE_SEO` map + `applySEO()` patches title, description, canonical, OG and Twitter on navigation |
| [public/sitemap.xml](public/sitemap.xml) | The 3 indexed URLs + OG image title/caption | Hand-maintained |
| [public/robots.txt](public/robots.txt) | Crawl rules + sitemap pointer | Fine as-is |
| Page `<h1>`s | The one real semantic heading per page | `sr-only` in [Hero.jsx](src/components/Hero.jsx), [HeroCentered.jsx](src/components/HeroCentered.jsx), [AboutPage.jsx](src/components/AboutPage.jsx) |

### The four JSON-LD blocks in `index.html`

1. **Person** (`#person`) — `jobTitle`, `description`, `knowsAbout`, `worksFor`,
   `memberOf`, `sameAs`, address. The most important block for a personal brand.
2. **WebSite** (`#website`) — `alternateName`, authored/published by `#person`.
3. **ProfilePage** (`#profilepage`) — `mainEntity` → `#person`.
4. **Organization** (`#fof-kano`) — Friends of Figma, Kano.

> **Note on headings:** the big visible headline is an `aria-hidden` `<p>` (it's
> animated per-line by `RevealHeadline`). The real `<h1>` on each page is
> `sr-only` — invisible but fully counted by search engines. So the `<h1>` text
> is pure SEO surface: keep the positioning line in it.

---

## 3. Checklist: changing the pitch

When the title or description changes, update **all** of these or they drift:

- [ ] `index.html` → `<title>`
- [ ] `index.html` → `meta[name=description]`
- [ ] `index.html` → `meta[property="og:title"]` + `og:description`
- [ ] `index.html` → `meta[name="twitter:title"]` + `twitter:description`
- [ ] `index.html` → `og:image:alt` + `twitter:image:alt`
- [ ] `index.html` → Person JSON-LD `description` (and `jobTitle` if the role changed)
- [ ] `index.html` → ProfilePage JSON-LD `name`, WebSite `alternateName`
- [ ] `src/lib/seo.js` → `ROUTE_SEO['/']` (**must match `index.html` exactly**)
- [ ] `src/lib/seo.js` → `/about` and `/playground` entries
- [ ] `public/sitemap.xml` → image title/caption
- [ ] `sr-only` `<h1>` in both heroes + About page

Then run the verification in §6.

---

## 4. What's already solid

Don't regress these:

- **Robots + indexing** — `index, follow, max-image-preview:large, max-snippet:-1`.
- **Canonical tag** present; `robots.txt` points at the sitemap.
- **Rich structured data** — 4 valid JSON-LD blocks, cross-linked by `@id`
  (Person ← WebSite / ProfilePage / Organization). This is well above what most
  portfolios ship and is what earns a knowledge-panel-style result for a name.
- **`sameAs`** covers LinkedIn, X, GitHub, Instagram — the strongest entity
  signal for a personal brand.
- **OG image** is a real 1200×630 PNG (34 KB) with declared `width`/`height`,
  `secure_url` and `type`. `twitter:card` is `summary_large_image`.
- **Core Web Vitals groundwork** — display font self-hosted and `preload`ed,
  body fonts non-blocking with `display=swap`, immutable cache headers on
  assets, images served as AVIF via `<picture>`, route-level code splitting.
- **Analytics** — Vercel Analytics + Speed Insights are wired.

---

## 5. Gaps, ranked by impact

### P1 — `/about` and `/playground` serve the home page's metadata 🔴

**The single biggest issue.** [vercel.json](vercel.json) rewrites
`/(.*)` → `/index.html`, and the build emits exactly one HTML file:

```bash
find dist -name "*.html"     # -> dist/index.html only
```

So every route returns the *home* `<title>`/description/OG tags. `applySEO()`
fixes it after React mounts — fine for Googlebot (it renders JS), but **social
scrapers do not execute JS**. Sharing an `/about` or `/playground` link on
X, LinkedIn, WhatsApp, Slack or iMessage shows the *home* card, and those routes
have no distinct metadata in the initial HTML for crawlers that don't render.

**Fix:** prerender the three routes to static HTML at build time, each with its
own tags baked in, then narrow the rewrite so real files win before the SPA
fallback. Options, cheapest first:

1. A tiny post-build Node script: read `dist/index.html`, string-replace the
   title/description/OG/canonical per route using `ROUTE_SEO`, write
   `dist/about/index.html` and `dist/playground/index.html`. ~30 lines, no new
   dependency, and `ROUTE_SEO` stays the single source of truth.
2. `vite-plugin-prerender` / `react-snap` — heavier, also renders body content.

Then set rewrites to only catch what isn't a real file. **This alone is worth
more than every other item on this list.**

### P2 — No structured data for the case studies 🟠

The projects (Kutuby, Groq, Waffle) are the substance of the site but have zero
schema. Add a `CreativeWork` (or `Article`) block per project with `name`,
`description`, `image`, `author` → `#person`, and `about`/`keywords`. This is
what makes the work itself eligible for rich results rather than just the
person. Project data already lives in [src/data.js](src/data.js), so the blocks
can be generated rather than hand-written.

### P3 — Weak image alt text 🟠

[Works2.jsx](src/components/Works2.jsx#L76) uses `alt={`${name} ${i + 1}`}` →
*"Kutuby 1"*, *"Kutuby 2"*. That's near-useless for image search and for screen
readers. Add a real per-image caption/alt to the `images` arrays in `data.js`
and use it. Image search is a genuine traffic source for design portfolios.

### P4 — The target term barely appears in visible body copy 🟡

"Product design engineer" is in the metadata and the `sr-only` `<h1>`, but the
visible page text says *"Design, build and ship products from canvas to code"*
and *"Currently designing at Kutuby…"*. Search engines weight visible on-page
content heavily. Work the phrase naturally into the About prose and/or the hero
bio so the page actually reads as being about a product design engineer.

### P5 — Sitemap has no `<lastmod>` 🟡

Add `<lastmod>` per URL (and regenerate it on build rather than by hand) so
crawlers know when to recrawl. Also add `/playground` images if that page is
meant to rank in image search.

### P6 — Off-page is the real lever for a generic term 🟡

`product design engineer` is a competitive non-brand term; on-page work alone
won't win it. What moves it: consistent title on LinkedIn/X/GitHub bios (they
feed the `sameAs` entity graph), writing that earns links, Figma Community
posts, conference/meetup pages linking back. Keep the role string **identical**
everywhere — inconsistent titles dilute the entity.

### P7 — Minor / optional 🟢

- `meta[name=keywords]` is ignored by Google. Harmless; keep for other engines
  or drop.
- Add `BreadcrumbList` schema once there are deeper URLs than the current three.
- Consider per-project URLs (`/work/kutuby`) — currently case studies open in a
  drawer with no URL, so they can't rank or be linked individually. This is a
  **large** change but the highest-ceiling one for long-tail traffic.

---

## 6. Verifying a change

```bash
# 1. All JSON-LD blocks still parse
python3 -c "
import re,json,io
s=io.open('index.html',encoding='utf-8').read()
for i,b in enumerate(re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', s, re.S)):
    d=json.loads(b); print(f'block {i+1}: valid ({d.get(\"@type\")})')
"

# 2. Home title/description match between index.html and seo.js
grep -o 'Product Design Engineer — Yahaya Muhammad' index.html src/lib/seo.js

# 3. No stale role strings anywhere
grep -rn "UX Designer" src index.html public

# 4. Build is clean
npm run build
```

External checks worth running after deploying:

- **Google Rich Results Test** — validates the JSON-LD as Google parses it.
- **Schema.org validator** — catches vocabulary mistakes the JSON parse won't.
- **Google Search Console** — submit the sitemap; watch Coverage for pages
  indexed with the *wrong* title (the P1 symptom) and Performance for whether
  `product design engineer` actually starts drawing impressions.
- **opengraph.xyz / X Card Validator** — paste an `/about` URL. Until P1 is
  fixed this will show the **home** card; that's the regression test for it.

---

## 7. Log

| Date | Change |
|---|---|
| 2026-07 | Repositioned from "Product Designer & UX Designer" to **Product Design Engineer** as the primary target and pitch across all metadata, JSON-LD, sitemap and `<h1>`s. Corrected the case-study domain claim from "healthcare, education and brand" to the accurate "edtech, fintech and developer tools". Added `Product Design Engineering` / `Design Engineering` / `Prototyping` / `Front-End Development` to `knowsAbout`. |
