import { useLayoutEffect } from 'react'

// A real masonry for a project whose tiles mix heights and include a `wide`
// tile (two columns). Each tile keeps its natural height; tiles go one by one
// into the shortest column (a wide tile into the pair of neighbouring columns
// that's lowest; a `full` one across every column, below the tallest), so the
// columns end unevenly, as a masonry does. Columns
// follow the site's breakpoints: 3 above 900px, 2 above 600px, and on phones
// the tiles simply stack (no positioning at all).
export function useMasonry(ref, enabled) {
  useLayoutEffect(() => {
    const box = ref.current
    if (!enabled || !box) return undefined
    let raf = 0
    const layout = () => {
      raf = 0
      const items = [...box.children]
      const w = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2
      const pad = parseFloat(getComputedStyle(box).paddingLeft)
      const n = innerWidth > 900 ? 3 : innerWidth > 600 ? 2 : 1
      if (n === 1) {
        box.style.height = ''
        items.forEach((el) => { el.style.position = ''; el.style.left = ''; el.style.top = ''; el.style.width = '' })
        return
      }
      const g = n === 3 ? Math.min(14, Math.max(8, innerWidth / 100)) : 10
      const cw = (w - g * (n - 1)) / n
      const h = new Array(n).fill(0)
      items.forEach((el) => {
        const full = el.dataset.wide === 'full'
        const wide = full || el.dataset.wide === '1'
        const span = full ? n : wide ? Math.min(2, n) : 1
        el.style.position = 'absolute'
        el.style.width = `${cw * span + g * (span - 1)}px`
        el.style.margin = '0'
        let c = 0
        let top = Infinity
        for (let k = 0; k <= n - span; k++) {
          const t = Math.max(...h.slice(k, k + span))
          if (t < top - 0.5) { top = t; c = k }
        }
        el.style.left = `${pad + c * (cw + g)}px`
        el.style.top = `${top}px`
        const eh = el.offsetHeight
        for (let k = c; k < c + span; k++) h[k] = top + eh + g
      })
      box.style.height = `${Math.max(...h) - g}px`
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(layout) }
    layout()
    const ro = new ResizeObserver(queue)
    ro.observe(box)
    ;[...box.children].forEach((el) => ro.observe(el))
    addEventListener('resize', queue)
    return () => { ro.disconnect(); removeEventListener('resize', queue); cancelAnimationFrame(raf) }
  }, [ref, enabled])
}
