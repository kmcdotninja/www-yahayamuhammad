import { useLayoutEffect } from 'react'

// The masonry for the /v2 and /v3 feeds. Every tile keeps its exact size and
// shape (nothing is stretched, cropped or padded); what the layout chooses is
// the order and the place of each tile:
//   - a wide tile (two columns) goes only where the two columns it spans end
//     level, single tiles going first until two do
//   - colours are kept apart: a tile isn't set right under or beside one of the
//     same colour family (data-tone, or measured from the image itself), nor
//     right under or beside a tile from the same project
// It tries a few hundred deals (each a little shuffled, all deterministic) and
// keeps the one with the fewest and smallest gaps, the most even column ends
// and the fewest colour clashes. The list order is only where every deal starts.
// The layout is positions only, so the DOM order (and reading order) stays.
// Children: data-wide="1" spans two columns; data-tone a colour family;
// data-project the tile's project. With `smartWide` (the /v3 feed), every
// landscape piece is free to go one column or two: each deal decides, taking
// two where the pair is level (a wide shot reads best wide) and one where that
// keeps the grid tight.
const TRIES = 400       // deals tried per layout
const LOOK = 6          // how far ahead in the list a tile may be taken
const LEVEL = 4         // two columns this close (px) count as level
const LANDSCAPE = 1.2   // smartWide: wider than tall by this much may go wide

// a colour family from an average colour ('light': whites, greys and creams,
// the background most tiles share, so it counts for less)
function family([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  const s = mx === mn ? 0 : (mx - mn) / (l < 128 ? mx + mn : 510 - mx - mn)
  if (l < 70) return 'dark'
  if (s < 0.2 || l > 225) return 'light'
  let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn)
  h = (h * 60 + 360) % 360
  return h < 15 || h >= 340 ? 'red' : h < 45 ? 'orange' : h < 70 ? 'yellow' : h < 170 ? 'green' : h < 200 ? 'cyan' : h < 250 ? 'blue' : h < 290 ? 'violet' : 'pink'
}
const tones = new WeakMap()
function toneOf(img) {
  if (tones.has(img)) return tones.get(img)
  if (!img.complete || !img.naturalWidth) return ''
  let t = ''
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(img, 0, 0, 16, 16)
    const d = x.getImageData(0, 0, 16, 16).data
    const m = [0, 0, 0]
    for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2] }
    t = family(m.map((v) => v / 256))
  } catch { /* unreadable: no colour */ }
  tones.set(img, t)
  return t
}

// a small seeded random, so the same tiles always get the same layout
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

// one deal: tiles in, placements and a score out (lower is better)
function deal(tiles, n, g, rand, noise) {
  const col = new Array(n).fill(0)
  const last = new Array(n).fill(null)
  const placed = []
  let holes = 0, clashes = 0
  const span = (t) => (t.wide ? 2 : 1)
  // a flexible tile as it would go: wide (its wide height) or single
  const as = (t, wide) => (t.flex ? { ...t, wide, h: wide ? t.hw : t.hs } : t)
  const same = (a, b) => (a && b && a.tone && a.tone === b.tone ? (a.tone === 'light' ? 1 : 3) : 0)
  const clash = (t, c, top) => {
    let p = 0
    for (let k = c; k < c + span(t); k++) { p += same(t, last[k]); if (last[k] && last[k].project === t.project) p += 1.5 }
    for (const k of [c - 1, c + span(t)]) {
      if (k < 0 || k >= n) continue
      for (let i = placed.length - 1, seen = 0; i >= 0 && seen < 6; i--) {
        const o = placed[i]
        if (o.c > k || k >= o.c + span(o)) continue
        seen++
        if (o.top < top + t.h && o.top + o.h > top) p += same(t, o) * 0.8 + (o.project === t.project ? 1 : 0)
      }
    }
    return p
  }
  const pairs = () => {
    let best = null
    for (let k = 0; k < n - 1; k++) {
      const gap = Math.abs(col[k] - col[k + 1]), top = Math.max(col[k], col[k + 1])
      if (!best || gap < best.gap - 0.5 || (Math.abs(gap - best.gap) < 0.5 && top < best.top)) best = { c: k, gap, top }
    }
    return best
  }

  const queue = tiles.slice()
  while (queue.length) {
    const lowest = col.indexOf(Math.min(...col))
    const pair = n > 1 ? pairs() : null
    const singles = queue.some((t, j) => j < LOOK && !t.wide)
    let pick = -1, score = Infinity, how = null
    for (let j = 0; j < Math.min(LOOK, queue.length); j++) {
      const q = queue[j]
      // a flexible tile is weighed both ways; a fixed one only its own way
      const ways = q.flex ? [as(q, true), as(q, false)] : [q]
      for (const t of ways) {
        // a wide tile waits for a level pair while there are singles to place
        if (t.wide && pair.gap > LEVEL && (singles || q.flex)) continue
        const c = t.wide ? pair.c : lowest
        const top = t.wide ? pair.top : col[c]
        // a landscape piece prefers going wide where it can
        const sc = clash(t, c, top) + j * 0.4 + (t.wide ? pair.gap / 10 : 0) - (q.flex && t.wide ? 1.2 : 0) + rand() * noise
        if (sc < score) { score = sc; pick = j; how = t }
      }
    }
    if (pick < 0) { pick = 0; how = queue[0].flex ? as(queue[0], false) : queue[0] }
    queue.splice(pick, 1)
    const t = how
    const c = t.wide ? pair.c : lowest
    const top = t.wide ? pair.top : col[c]
    for (let k = c; k < c + span(t); k++) { holes += top - col[k]; col[k] = top + t.h + g; last[k] = t }
    clashes += clash(t, c, top)
    placed.push({ ...t, c, top })
  }
  const end = Math.max(...col), spread = col.reduce((a, v) => a + (end - v), 0)
  return { placed, col, holes, spread, score: holes * 4 + spread + clashes * 40 }
}

export function useMosaic(ref, columnsFor, { smartWide = false } = {}) {
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return undefined
    let raf = 0

    const layout = () => {
      raf = 0
      const items = [...box.children]
      const pad = parseFloat(getComputedStyle(box).paddingLeft)
      const w = box.clientWidth - pad * 2
      const n = columnsFor(innerWidth)
      if (n === 1) {
        box.style.height = ''
        items.forEach((el) => { el.dataset.w = '1'; el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.width = '' })
        return
      }
      const g = n >= 3 ? Math.min(14, Math.max(8, innerWidth / 100)) : 10
      const cw = (w - g * (n - 1)) / n

      // size every tile to its width, then read its own height (a flexible
      // one at both widths)
      const tiles = items.map((el, i) => {
        // at two columns a wide tile would be the whole row: it goes in as a single
        const wide = el.dataset.wide === '1' && n >= 3
        el.style.position = 'absolute'
        el.style.margin = '0'
        const img = el.querySelector('img'), vid = el.querySelector('video')
        const ar = img?.naturalWidth ? img.naturalWidth / img.naturalHeight : vid?.videoWidth ? vid.videoWidth / vid.videoHeight : 0
        const flex = smartWide && n >= 3 && !wide && el.dataset.wide !== 'never' && ar >= LANDSCAPE
        let hw = 0, hs = 0
        if (flex) {
          el.dataset.w = '2'; el.style.width = `${cw * 2 + g}px`; hw = el.offsetHeight
          el.dataset.w = '1'; el.style.width = `${cw}px`; hs = el.offsetHeight
        } else { el.dataset.w = wide ? '2' : '1'; el.style.width = `${wide ? cw * 2 + g : cw}px` }
        return { i, el, wide, flex, hw, hs, project: el.dataset.project || '', tone: el.dataset.tone || (img ? toneOf(img) : '') }
      })
      tiles.forEach((t) => { if (!t.flex) t.h = t.el.offsetHeight })

      // the first deal follows the list as closely as it can (no noise); the
      // rest shuffle a little
      let best = null
      for (let k = 0; k < TRIES; k++) {
        const d = deal(tiles, n, g, rng(k * 7919 + tiles.length), k === 0 ? 0 : 1.5 + (k % 5))
        if (!best || d.score < best.score) best = d
      }
      best.placed.forEach((t) => {
        t.el.style.width = `${t.wide ? cw * 2 + g : cw}px`
        t.el.dataset.w = t.wide ? '2' : '1'   // the width it got (the CSS shapes an iPad by it)
        t.el.style.left = `${pad + t.c * (cw + g)}px`
        t.el.style.top = `${t.top}px`
      })
      box.style.height = `${Math.max(...best.col) - g}px`
      box.dataset.holes = Math.round(best.holes)
      box.dataset.spread = Math.round(best.spread)
    }

    const queue = () => { if (!raf) raf = requestAnimationFrame(layout) }
    layout()
    // images and clips settle their heights as they load: lay out again
    const media = [...box.querySelectorAll('img, video')]
    media.forEach((m) => m.addEventListener(m.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', queue))
    addEventListener('resize', queue)
    return () => {
      media.forEach((m) => m.removeEventListener(m.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', queue))
      removeEventListener('resize', queue)
      cancelAnimationFrame(raf)
    }
  }, [ref, columnsFor, smartWide])
}
