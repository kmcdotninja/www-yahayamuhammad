// Registry that powers the live Design Panel (src/components/DesignPanel.jsx).
// Each token lists where it lives so the exported "implement this" prompt can
// point Claude at the right file. Defaults mirror the real values in
// src/index.css and src/hooks/useTheme.js — keep them in sync if those change.

// Theme-aware colours are defined in useTheme.js (LIGHT / DARK maps); everything
// else is a static token in index.css.

export const TOKEN_GROUPS = [
  {
    id: 'colors',
    label: 'Colors',
    themed: true,
    file: 'src/hooks/useTheme.js',
    fileNote: 'edit the DARK / LIGHT maps',
    tokens: [
      { name: '--bg', label: 'Background', kind: 'color',
        defaults: { dark: '#0a0a0a', light: '#f5f3ee' } },
      { name: '--text', label: 'Text', kind: 'color',
        defaults: { dark: '#e6e3dc', light: '#0a0a0a' } },
      { name: '--text-dim', label: 'Text · dim', kind: 'color',
        defaults: { dark: '#8a8780', light: '#5a5854' } },
      { name: '--text-muted', label: 'Text · muted', kind: 'color',
        defaults: { dark: '#5a5854', light: '#9a9a96' } },
      { name: '--border', label: 'Border', kind: 'text',
        defaults: { dark: 'rgba(255,255,255,0.12)', light: 'rgba(0,0,0,0.12)' } },
      { name: '--pill-border', label: 'Pill border', kind: 'text',
        defaults: { dark: 'rgba(255,255,255,0.35)', light: 'rgba(0,0,0,0.4)' } },
    ],
  },
  {
    id: 'type',
    label: 'Typography',
    file: 'src/index.css',
    tokens: [
      { name: '--display', label: 'Display font', kind: 'text',
        default: "'Jaro', 'Helvetica Neue', Helvetica, Arial, sans-serif" },
      { name: '--sans', label: 'Body font', kind: 'text',
        default: "'BDO Grotesk', 'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" },
      { name: '--fs-hero', label: 'Hero size', kind: 'text',
        default: 'clamp(92px, 11.6vw, 112px)',
        note: 'responsive — also set at ≤900 / ≤760 in index.css media queries' },
      { name: '--fs-h2', label: 'Section-title size', kind: 'text',
        default: 'clamp(53px, 6.4vw, 68px)' },
      { name: '--fs-h3', label: 'Card / role title', kind: 'text',
        default: 'clamp(20px, 1.8vw, 28px)' },
      { name: '--fs-body', label: 'Body / paragraph', kind: 'text',
        default: 'clamp(18px, 1.4vw, 24px)' },
      { name: '--fs-caption', label: 'Caption / meta', kind: 'text',
        default: '16px', note: '14px only for special cases' },
      { name: '--lh-hero', label: 'Hero line-height', kind: 'range',
        min: 0.7, max: 1.4, step: 0.01, default: '1.02' },
      { name: '--ls-display', label: 'Display tracking', kind: 'range',
        min: -0.08, max: 0.08, step: 0.005, unit: 'em', default: '-0.02em' },
    ],
  },
  {
    id: 'layout',
    label: 'Layout',
    file: 'src/index.css',
    tokens: [
      { name: '--rail', label: 'Rail inset', kind: 'text', default: 'clamp(16px, 2.4vw, 32px)' },
      { name: '--pad', label: 'Section padding', kind: 'text', default: 'clamp(20px, 3vw, 48px)' },
    ],
  },
]

export function defaultFor(token, theme) {
  return token.themed ? token.defaults[theme] : token.default
}

// Storage key so a token's override is remembered per theme (colours) or once.
export function keyFor(token, theme) {
  return token.themed ? `${token.name}@${theme}` : token.name
}
