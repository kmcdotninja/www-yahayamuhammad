---
name: portfolio-design
description: Design-system rules for the Yahaya Muhammad portfolio — the design tokens (colors, spacing, fonts, cursors), typography rules (Jaro tracking + casing), theming, motion, and the dos & don'ts. Load this before any visual/CSS/component work in this repo (styling, colors, type, layout, animation, the hero physics stickers) so edits stay on-system.
---

# Portfolio Design System — working rules

Full reference: [`DESIGN.md`](../../../DESIGN.md). This skill is the short,
actionable version. **Tokens are law** — consume the CSS variables, don't invent
values.

## Tokens (never hardcode these)
- **Color (theme-aware, set from JS in `src/hooks/useTheme.js`):** `--bg`,
  `--text`, `--text-dim`, `--text-muted`, `--border`, `--pill-border`.
  Dark is default (`--bg: #0a0a0a`, `--text: #e6e3dc`); light swaps them
  (`--bg: #f5f3ee`, `--text: #0a0a0a`).
- **Layout:** `--rail` (guide rails), `--pad` (section side padding; content
  left-aligns to it).
- **Type:** `--display` = Jaro; `--sans` = BDO Grotesk; `--serif` aliases display.
- **Cursors:** `--cursor-default/-pointer/-grab/-grabbing`.
- **Intentional fixed literals** (physical objects, not the page surface):
  `#f5f3ee` cream cards/pills/buttons, `#fff` sticker contour, `#000/#0a0a0a` ink,
  `#14120d` input pill. These stay fixed across themes.

## Typography rules
- **Jaro (`var(--display)`) is UPPERCASE and always `letter-spacing: -0.02em`** —
  on every block that sets `font-family: var(--display)`. It's em-based so the
  tracking is proportional at any size.
- **On dark backgrounds, Jaro text is `#fff`** (not `var(--text)`); use a
  `[data-theme='light']` override for the light swap. Sole exception: the die-cut
  text sticker (black fill + white contour).
- Body/UI is BDO Grotesk (`var(--sans)`). Keep `font-display: swap`; Jaro is
  preloaded — never block first paint on fonts.

## Layout & responsive
- Left-align to the `--pad` rail; keep the vertical rails (`.page::before/::after`,
  z-index 4) unbroken, or put full-bleed art above them.
- Breakpoints in use: `1180` (thin sticker pile), `1024` (nav→drawer), **`901`
  (app swaps desktop `HeroCentered`→mobile `Hero`)**, `900`, `760`, `700`, `600`,
  `480`. Design mobile-first.

## Motion
- **Always honor `prefers-reduced-motion`** — in CSS and via `useReducedMotion()`.
- Scroll reveals use GSAP + ScrollTrigger through **Lenis** smooth-scroll; don't
  drive scroll-linked animation from `window.scrollTo` (Lenis owns scroll — use
  its events / real wheel input when testing).
- Hero stickers: `useStickerPhysics.js` (hand-rolled solver, inline `translate3d`
  each frame, rotated-extent wall clamps). One "show-off" animation per view max.

## Don't
- Don't hardcode theme colors (use the tokens); don't use Jaro without `-0.02em`
  or as `var(--text)` on dark.
- **Don't put borders/outlines on images** (`<img>` / photo cards) — ever.
- Don't ship animation without a reduced-motion fallback; don't stack multiple
  attention-grabbing animations in one view.
- Verify **both** light and dark themes after any color change.
