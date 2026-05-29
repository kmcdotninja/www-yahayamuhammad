import { useMemo, useRef } from 'react'
import './CommitSticker.css'

const TILT_MAX = 11 // degrees of cursor-driven rotation

const RAW = typeof __LAST_COMMIT_DATE__ !== 'undefined' ? __LAST_COMMIT_DATE__ : null

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const GRID = 17
const LOGO = 5 // 5x5 cell area reserved for the centered favicon

// Deterministic per-cell intensity (0..4), mimicking a GitHub contribution
// heatmap. Cells inside the center logo pocket are skipped. A second
// independent pseudo-random pass picks a sparse subset of the
// higher-level cells to receive a soft glow — "spotlights" sprinkled
// across the heatmap so the grid feels alive instead of uniformly lit.
function buildCells() {
  const start = (GRID - LOGO) / 2
  const end = start + LOGO
  const inLogo = (c, r) => c >= start && c < end && r >= start && r < end

  const cells = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (inLogo(c, r)) continue
      const seed = Math.sin((c + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453
      const rand = seed - Math.floor(seed)
      let level = 0
      if (rand > 0.4) level = 1
      if (rand > 0.6) level = 2
      if (rand > 0.78) level = 3
      if (rand > 0.91) level = 4

      // Different prime offsets so the glow distribution doesn't track
      // the level distribution exactly — only level-2+ cells qualify so
      // glows never appear on empty cells.
      const gseed = Math.sin((c + 5) * 53.711 + (r + 3) * 17.917) * 91823.42
      const grand = gseed - Math.floor(gseed)
      const glow = level >= 2 && grand > 0.78

      cells.push({ c, r, level, glow })
    }
  }
  return cells
}

function GhIcon() {
  return (
    <svg
      className="commit-sticker__gh"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

export default function CommitSticker() {
  const date = RAW ? new Date(RAW) : null
  const cells = useMemo(buildCells, [])
  const ref = useRef(null)
  const rafRef = useRef(0)
  const pendingRef = useRef(null)
  const rectRef = useRef(null)
  const formatted = date && !Number.isNaN(date.getTime())
    ? dateFormatter.format(date).toUpperCase()
    : null

  // Coalesce pointermove updates to one paint per frame. We cache the
  // bounding rect on enter so the hot path skips the layout read on every
  // event — only one getBoundingClientRect per hover cycle.
  const flush = () => {
    rafRef.current = 0
    const el = ref.current
    const rect = rectRef.current
    const ev = pendingRef.current
    if (!el || !rect || !ev) return
    const px = (ev.x - rect.left) / rect.width
    const py = (ev.y - rect.top) / rect.height
    const rx = (0.5 - py) * (TILT_MAX * 2)
    const ry = (px - 0.5) * (TILT_MAX * 2)
    el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
    el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
  }

  const onEnter = (e) => {
    const el = ref.current
    if (!el) return
    rectRef.current = el.getBoundingClientRect()
    pendingRef.current = { x: e.clientX, y: e.clientY }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flush)
  }

  const onMove = (e) => {
    if (!rectRef.current) return
    pendingRef.current = { x: e.clientX, y: e.clientY }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flush)
  }

  const onLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    rectRef.current = null
    pendingRef.current = null
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--rx')
    el.style.removeProperty('--ry')
    el.style.removeProperty('--gx')
    el.style.removeProperty('--gy')
  }

  return (
    <div
      ref={ref}
      className="commit-sticker"
      role="img"
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={
        formatted
          ? `kmcdotninja — last commit ${formatted}`
          : 'kmcdotninja contribution grid'
      }
    >
      <span className="commit-sticker__sheen" aria-hidden="true" />
      <div className="commit-sticker__head">
        <GhIcon />
        <span>KMCDOTNINJA</span>
      </div>

      <div
        className="commit-sticker__qr"
        style={{ '--grid': GRID, '--logo': LOGO }}
        aria-hidden="true"
      >
        {cells.map(({ c, r, level, glow }) => (
          <span
            key={`${c}-${r}`}
            className={`commit-sticker__cell commit-sticker__cell--l${level}${
              glow ? ' commit-sticker__cell--glow' : ''
            }`}
            style={{
              '--c': c + 1,
              '--r': r + 1,
              '--d': `${((c + r) * 0.035).toFixed(2)}s`,
            }}
          />
        ))}

        <span className="commit-sticker__logo">
          <img
            src="/Commit%20Image.png"
            alt=""
            width="80"
            height="80"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
          />
        </span>
      </div>

      <div className="commit-sticker__foot">
        <span className="commit-sticker__label">LAST COMMIT</span>
        {formatted && <span className="commit-sticker__date">{formatted}</span>}
      </div>
    </div>
  )
}
