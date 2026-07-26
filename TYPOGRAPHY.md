# Typography System — Yahaya Muhammad Portfolio

> **How to use this file.** This is the editable source of truth for type on the
> site. Edit the **values** in the "Proposed scale" tables below (Section 3), then
> I implement: add the tokens to `src/index.css` and swap every selector in the
> "Implementation map" (Section 5) to consume them. Nothing here is live until
> implemented — Section 4 is the current (pre-system) audit for reference.
>
> Companion docs: [`DESIGN.md`](DESIGN.md) (whole design system),
> [`.claude/skills/portfolio-design`](.claude/skills/portfolio-design/SKILL.md).

---

## 1. Fonts

| Role | Family | Token | Weights in use | Notes |
|---|---|---|---|---|
| **Display** | **Jaro** | `--display` | 400 only | Headings, hero, wordmarks, big statements. Always **UPPERCASE**, `letter-spacing: -0.02em`, `#fff` on dark. Self-hosted, preloaded. |
| **Body / UI** | **BDO Grotesk** | `--sans` | 400 / 500 / 600 | Body copy, labels, buttons, nav pills. Self-hosted. |
| **Label / ticker** | **Doto** | `--font-doto` *(new)* | 900 | "Label-printer" face for photo captions, commit ticker, dates. UPPERCASE, wide tracking. Loaded from Google Fonts. Currently hardcoded as `'Doto'` — propose a token. |

**Rule:** never hardcode a family — always a token. (Audit found raw `'Jaro'`,
`'BDO Grotesk'`, `'Doto'` in a few files; Section 5 lists them.)

---

## 2. Principles

- **One scale, few steps.** A heading size should come from a token, not a fresh
  `clamp()`. If two headings look the same size, they share a token.
- **Display is Jaro, UPPERCASE, `-0.02em`, `#fff` on dark** (already a rule in the
  skill). Body is BDO Grotesk. Labels/captions are Doto.
- **Line-height is tokenised too** — display is tight (uppercase, no descenders),
  body is airy.
- **Page heroes are identical across pages** and responsive-matched to the home
  hero at every breakpoint (this is the current gap on mobile).

---

## 3. Proposed scale  ✏️ *(edit these values)*

### 3a. Display (Jaro) — `font-weight: 400`, UPPERCASE, `letter-spacing: var(--ls-display)`

| Token | Desktop | ≤900px | ≤760px | Line-height | Used by |
|---|---|---|---|---|---|
| `--fs-hero` | `clamp(92px, 11.6vw, 112px)` | `clamp(28px, 9vw, 72px)` | `15vw` | `--lh-hero` | Page hero: home, About, Playground |
| `--fs-display-xl` | `clamp(56px, 9vw, 144px)` | — | — | `--lh-display` | 404 title, Project-drawer "next project" |
| `--fs-display-lg` | `clamp(48px, 7.5vw, 108px)` | — | — | `--lh-display` | Project titles, drawer title, mobile-menu items |
| `--fs-h2` | `clamp(28px, 4vw, 56px)` | — | — | `--lh-heading` | Section titles ("Work Experience", "My Approach"), footer bio, drawer sections |
| `--fs-h3` | `clamp(20px, 2.2vw, 28px)` | — | — | `--lh-heading` | Sub / card titles |
| `--fs-wordmark` | `20px` | — | — | `--lh-tight` | Nav wordmark, mobile brand |

> `--fs-hero` is defined once as a responsive token (redefined at the two mobile
> breakpoints in `:root`) so **home, About and Playground match at every width** —
> including mobile, which is the current bug. The home hero itself is routed
> through the token (values above equal what it renders today, so no visual change
> to the home page).

### 3b. Body / UI (BDO Grotesk)

| Token | Size | Line-height | Weight | Used by |
|---|---|---|---|---|
| `--fs-body-lg` | `18px` | `--lh-body` | 400 | Lede, bio, lead paragraphs |
| `--fs-body` | `16px` | `--lh-body` | 400/500 | Default body, buttons, nav pills |
| `--fs-body-sm` | `15px` | `--lh-body` | 400 | Descriptions, secondary text |
| `--fs-caption` | `13px` | `--lh-snug` | 400/500 | Meta, table cells, footer legal |
| `--fs-micro` | `12px` | `--lh-tight` | 500 | Eyebrows, labels — UPPERCASE, `letter-spacing: var(--ls-micro)` |

*(Current body sizes span 11–22px in ~9 steps; this collapses them to 5. The 11px
and 22px one-offs get rounded into the nearest step — flag any you want kept.)*

### 3c. Label / ticker (Doto) — `font-weight: 900`, UPPERCASE

| Token | Size | Letter-spacing | Used by |
|---|---|---|---|
| `--fs-doto` | `13px` | `0.12em` | Photo captions (About gallery + portraits, ScrollReveal), commit ticker, dates |

### 3d. Shared line-height & tracking tokens

| Token | Value | Meaning |
|---|---|---|
| `--lh-hero` | `0.9` | Hero heading *(currently mixes 0.85 desktop / 1.02 mobile — pick one)* |
| `--lh-display` | `0.95` | Big statements |
| `--lh-heading` | `1.05` | Section / card titles |
| `--lh-snug` | `1.3` | Dense UI text |
| `--lh-body` | `1.55` | Body copy |
| `--lh-tight` | `1` | Single-line labels / wordmarks |
| `--ls-display` | `-0.02em` | All Jaro display |
| `--ls-micro` | `0.1em` | Uppercase micro labels |

---

## 4. Current audit  *(reference — what's live today)*

### Display / Jaro headings (22 selectors, pre-system)

| Selector | Size | LH | → proposed token |
|---|---|---|---|
| `HeroCentered .introC__big` | `var(--fs-hero)` | 0.85 | `--fs-hero` ✅ |
| `AboutPage2 .ab2__headline` | `var(--fs-hero)` | 0.85 | `--fs-hero` ✅ |
| `PlaygroundPage .pgp__title` | `var(--fs-hero)` | 0.85 | `--fs-hero` ✅ |
| `Hero .intro__big` (mobile hero) | `112px` / `clamp(28,9vw,72)` / `15vw` | **1.02** | `--fs-hero` ⚠️ route through token |
| `Works .project__title` | `clamp(56, 8.4vw, 100)` | 0.9 | `--fs-display-lg` |
| `NotFoundPage .nf__title` | `clamp(56, 9vw, 144)` | 0.95 | `--fs-display-xl` |
| `ProjectDrawer .pd__title` | `clamp(56, 7.5vw, 100)` | 0.95 | `--fs-display-lg` |
| `ProjectDrawer .pd__next-title` | `clamp(56, 7.5vw, 128)` | 0.95 | `--fs-display-xl` |
| `ProjectDrawer .pd__coming-soon-title` | `clamp(44, 7vw, 88)` | 1 | `--fs-display-lg` |
| `ProjectDrawer .pd__section-title` | `clamp(28, 3vw, 48)` | 1 | `--fs-h2` |
| `MobileMenu2 .mm2__item` | `clamp(54, 16vw, 88)` | 0.95 | `--fs-display-lg` |
| `Footer .footer-art__bio` | `56px` | 1.02 | `--fs-h2` |
| `AboutPage2 .ab2__work-title, .ab2__approach-title` | `clamp(30, 4.8vw, 68)` | 1.04 | `--fs-h2` |
| `ScrollReveal .sr__paragraph` (/about-old) | `clamp(40, 6.4vw, 112)` | 1.02 | `--fs-hero` or leave (parked page) |
| `Hero .intro__wordmark` | `20px` | — | `--fs-wordmark` |
| `MobileMenu2 .mm2__brand` | `20px` | — | `--fs-wordmark` |
| `Footer .footer-art__text` (YMD) | `calc(...)` full-bleed | 1 | *(bespoke — leave)* |
| `HeroStickers .hero-sticker--text` | `75px` | 1 | *(sticker art — leave)* |
| `CopyToast .copy-toast__title` | `20px` | 1.05 | `--fs-h3` |
| `Lightbox .lb__title` | `16px` | — | `--fs-body` |
| `CommitSticker .commit-sticker__head` | `13px` | 1 | *(sticker art — leave)* |

### Doto captions (4 selectors) — all → `--fs-doto`

`AboutPage2 .ab2__gallery-cap/.ab2__portrait-cap` (14px), `ScrollReveal
.sr__photo-cap` (13px), `CommitSticker .commit-sticker__label/date` (12px).
*(Slightly different sizes → unify to `--fs-doto` 13px, or keep per-context.)*

### Issues found
1. **Mobile hero mismatch** — `.intro__big` is a one-off (not `--fs-hero`) with a
   different line-height (1.02 vs 0.85). About/Playground are smaller than the home
   hero on phones. **← the reported bug.**
2. **5 near-duplicate "big statement" ramps** (100/128/144/88/56) → 2 tokens
   (`--fs-display-xl`, `--fs-display-lg`).
3. **Display line-height spans 0.85–1.05** with no system.
4. **Hardcoded families**: raw `'Jaro'`, `'BDO Grotesk'`, `'Doto'` (Section 5).
5. **Body sizes span 11–22px in ~9 steps** → 5 tokens.

---

## 5. Implementation map  *(what I change once you've edited §3)*

**Add tokens** to `:root` in `src/index.css` (§3 values) + two `@media` blocks that
redefine `--fs-hero` at `900` and `760`.

**Swap selectors to tokens:**
- `src/components/Hero.css` — `.intro__big` → `font-size: var(--fs-hero)` + `line-height: var(--lh-hero)`; delete its `@900`/`@760` font-size overrides (keep the `@760` margin). `.intro__wordmark` → `--fs-wordmark`.
- `src/components/HeroCentered.css` — `.introC__big` → `line-height: var(--lh-hero)` (size already tokenised).
- `src/components/AboutPage2.css` — headline → `--lh-hero`; `.ab2__work-title/.ab2__approach-title` → `--fs-h2`/`--lh-heading`; body/caption sizes → body tokens; Doto caps → `--fs-doto`.
- `src/components/PlaygroundPage.css` — `.pgp__title` → `--lh-hero`; `.pgp__sub` → `--fs-body-lg`.
- `src/components/Works.css` — `.project__title` → `--fs-display-lg`.
- `src/components/NotFoundPage.css` — `.nf__title` → `--fs-display-xl`.
- `src/components/ProjectDrawer.css` — `.pd__title`/`.pd__coming-soon-title` → `--fs-display-lg`; `.pd__next-title` → `--fs-display-xl`; `.pd__section-title` → `--fs-h2`.
- `src/components/MobileMenu2.css` — `.mm2__item` → `--fs-display-lg`; `.mm2__brand` → `--fs-wordmark`.
- `src/components/Footer.css` — `.footer-art__bio` → `--fs-h2`.
- `src/components/CopyToast.css` — `.copy-toast__title` → `--fs-h3`.
- **De-hardcode families** → tokens: `Loader.css` (`'BDO Grotesk'`), `MobileMenu2.css` (`'BDO Grotesk'`), `NotFoundPage.css` (`'BDO Grotesk'`), `CommitSticker.css` (`'BDO Grotesk'`), `HeroStickers.css` (`'Jaro'`), and the `'Doto'` usages → `--font-doto`.
- **Leave bespoke:** footer `YMD` wordmark, hero text-stickers, commit-sticker art.

**Verify:** build + screenshot home/About/Playground/404/drawer at desktop **and**
mobile, both themes; confirm all page heroes match at every breakpoint.
