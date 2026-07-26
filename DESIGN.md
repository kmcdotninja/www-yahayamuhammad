# Design System — Yahaya Muhammad Portfolio

The single reference for how this portfolio looks and behaves. **Tokens are law:**
consume the CSS variables and follow the rules below rather than reinventing
values. Aesthetic in one line: *dark-first, oversized confident type, playful
physics, restrained motion.*

---

## 1. Design Tokens

All tokens are CSS custom properties on `:root` in [`src/index.css`](src/index.css).
The theme tokens (`--bg`, `--text`, …) are **set from JS** by
[`src/hooks/useTheme.js`](src/hooks/useTheme.js) — it writes the light/dark values
onto the root element and sets `data-theme`. Everything else is static in CSS.

### Color (theme-aware — never hardcode these)

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0a0a0a` | `#f5f3ee` |
| `--text` | `#e6e3dc` | `#0a0a0a` |
| `--text-dim` | `#8a8780` | `#5a5854` |
| `--text-muted` | `#5a5854` | `#9a9a96` |
| `--border` | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.12)` |
| `--pill-border` | `rgba(255,255,255,0.35)` | `rgba(0,0,0,0.4)` |

### Recurring literals (intentional, theme-independent)

These are deliberately fixed regardless of theme — they belong to physical
"objects" (stickers, pills, polaroids), not the page surface.

| Value | Meaning |
|---|---|
| `#f5f3ee` | Cream — sticker/pill/polaroid card surface, primary buttons |
| `#0a0a0a` / `#000` | Ink — text on cream, sticker fill |
| `#fff` | Paper — sticker die-cut contour, on-dark button hover |
| `#14120d` | Near-black pill (the sticker input) |

### Layout

| Token | Value | Use |
|---|---|---|
| `--rail` | `clamp(16px, 2.4vw, 32px)` | The page's vertical guide rails (`.page::before/::after`) |
| `--pad` | `clamp(20px, 3vw, 48px)` | Section horizontal padding; content left-aligns to this |

### Type

| Token | Stack |
|---|---|
| `--sans` | `'BDO Grotesk', 'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif` |
| `--display` | `'Jaro', 'Helvetica Neue', Helvetica, Arial, sans-serif` |
| `--serif` | alias of `--display` |

### Cursors (custom SVGs, white-fill + black-stroke so they read on both themes)

`--cursor-default`, `--cursor-pointer`, `--cursor-grab`, `--cursor-grabbing` —
`url(...) hotspotX hotspotY, systemFallback`. Interactive elements use
`cursor: var(--cursor-pointer)`.

---

## 2. Typography

- **Display / headings — Jaro** (`var(--display)`). Self-hosted latin subset
  (`/fonts/jaro/jaro-latin.woff2`), preloaded in `index.html`, `font-display: swap`.
  Very heavy, geometric, **always UPPERCASE** for display.
  - **Tracking is fixed: `letter-spacing: -0.02em` on _every_ Jaro block.** It's
    relative (em), so the tightness stays proportional at any size.
  - On dark surfaces Jaro renders **`#fff`** (see §5 Don'ts). The die-cut text
    sticker is the one exception: black fill + white contour.
- **Body / UI — BDO Grotesk** (`var(--sans)`). Weights self-hosted in
  `/fonts/bdo-grotesk/`. Default page font.
- Rendering: `text-rendering: optimizeLegibility`, `-webkit-font-smoothing:
  antialiased`, `font-synthesis: none` (set on `:root`).

### Sizing patterns

- Heroes/statements: locked large px on desktop (e.g. `112px`), `clamp()` down for
  mobile. The mobile hero headline is `15vw` at ≤760px.
- Line-height ~`1.02` for display, ~`1.5` for body. Bio copy is `18px`.

---

## 3. Layout & Responsive

- Content left-aligns to the `--pad` rail; the page has vertical guide rails at
  `--rail` (`.page::before/::after`, `z-index: 4`). Full-bleed elements that cross
  a rail must sit **above** it (see the hero stickers at `z-index: 7`).
- **Horizontal lines cross the rails (form a `+`).** Every section divider or
  horizontal rule is full-bleed — `width: 100vw`, centered — so it passes through
  both vertical guide rails and reads as a `+` at each intersection, matching
  `.hr-full`, `.footer::before`, and the nav border. Do **not** clip a horizontal
  line to the `--pad` content box. Two equivalent recipes:
  - **Block rule:** `width:100vw; margin-left:50%; transform:translateX(-50%)`
    (this is `.hr-full`).
  - **Row separator:** an absolute `::before`/`::after` on a `position:relative`
    row — `left:50%; transform:translateX(-50%); width:100vw; height:1px;
    background:var(--border)`.

  The global `overflow-x:hidden` on `html,body` clips the viewport-wide bleed, so
  these never introduce horizontal scroll. Both the line and the rail use
  `var(--border)`, so the crossing pixel reads as one clean `+`.
- **Breakpoints in use:** `1180` (thin the sticker pile), `1024` (nav → drawer),
  `901` (**app swaps desktop `HeroCentered` → mobile `Hero`**), `900` (mobile
  sticker sizes), `760` (phone headline), `700`, `600`, `480`.
- Two hero components: `HeroCentered` (`.introC`, desktop ≥901px) and `Hero`
  (`.intro`, mobile ≤900px). They share `HeroStickers` + `useStickerPhysics`.

---

## 4. Motion

- **Always respect `prefers-reduced-motion`.** `index.css` disables animations
  globally under it; JS effects check `useReducedMotion()` and render final state.
- Scroll reveals: GSAP + ScrollTrigger, driven through Lenis smooth-scroll
  (`lenis.on('scroll', ScrollTrigger.update)`). `[data-reveal]`,
  `[data-reveal-stagger]`, `[data-reveal-card]` are the reveal hooks.
- **Hero physics stickers** ([`useStickerPhysics.js`](src/hooks/useStickerPhysics.js)):
  a hand-rolled solver — stickers drop in, bounce off the four walls, collide, and
  are grab-and-throwable. Positions are driven by an inline `transform` each frame
  (`translate3d` for GPU compositing). Wall/floor contact uses each sticker's
  **rotated** extents so a tilted corner never crosses the bottom line. The typed
  input pill is a stable "platform" the pile rests on; typed text stickers
  disintegrate into an "add-to-cart" pixel stream after 6s.
- Restraint: at most one "show-off" animation per view; motion confirms or guides,
  never decorates for its own sake.

---

## 5. Do & Don't

### ✅ Do
- **Use tokens.** Colors → `var(--bg)/--text/--border/…`; spacing → `var(--pad)/--rail`;
  fonts → `var(--sans)/--display`; cursors → `var(--cursor-*)`.
- **Give every Jaro (`--display`) block `letter-spacing: -0.02em`** and set it
  UPPERCASE.
- **Render Jaro as `#fff` on dark backgrounds** (use `[data-theme='light']`
  overrides for the light swap where a token won't do).
- **Left-align to the `--pad` rail**; keep the vertical rails unbroken or put
  full-bleed art above them.
- **Design mobile-first** and reuse the established breakpoints above.
- **Respect `prefers-reduced-motion`** in both CSS and JS.
- **Keep both themes correct** — verify dark and light after any color work.
- Use `cursor: var(--cursor-pointer)` on interactive elements.

### ❌ Don't
- **Don't hardcode theme colors** — no raw `#0a0a0a`/`#e6e3dc`/border rgba in place
  of the tokens. (The fixed literals in §1 for stickers/pills are the only
  intentional exceptions.)
- **Don't use Jaro without the `-0.02em` tracking**, and don't set Jaro display
  text to `var(--text)` on dark — it must be `#fff`.
- **Don't put borders/outlines on images.** No `border`/`outline` on `<img>` or
  photo cards — ever.
- **Don't block first paint on fonts** — keep `font-display: swap`; Jaro is
  preloaded so the heading shows instantly.
- **Don't animate without a reduced-motion fallback**, and don't stack multiple
  attention-grabbing animations in one view.
- **Don't drive scroll-linked animation off `window.scrollTo`** — Lenis owns the
  scroll; use its scroll events / real wheel input.
