import { useEffect } from 'react'

// Re-scatters the hero stickers on every load, so the collage is arranged a
// little differently each visit.
//
// Placement is rejection-sampled against the things a sticker must not cover —
// the headline's own line boxes, the bio/scroll row, and the top strip the nav
// sits in — plus the stickers already placed this pass. Measuring the real boxes
// (rather than hard-coding safe rectangles) means this keeps working when the
// headline copy, its line breaks or the hero height change.
//
// The result is written to --dx/--dy, the same custom properties the drag hook
// uses, so a sticker can still be picked up and moved from wherever it landed.
// If no clear spot turns up, the sticker simply keeps its stylesheet position.

const GAP = 14 // breathing room around obstacles and between stickers
const NAV_SAFE = 118 // top strip reserved for the nav pill
const TRIES = 150

const intersects = (a, b) =>
  a.right + GAP > b.left && a.left - GAP < b.right && a.bottom + GAP > b.top && a.top - GAP < b.bottom

export function useStickerScatter(sectionRef) {
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const scatter = () => {
      const stickers = [...section.querySelectorAll('.introC__sticker')].filter(
        (el) => getComputedStyle(el).display !== 'none',
      )
      if (!stickers.length) return

      const sec = section.getBoundingClientRect()

      // Obstacles: the headline's line boxes and the bottom row.
      //
      // Each line is measured from two sources on purpose. RevealHeadline slides
      // .hl-line__inner up from below over ~1.3s, so mid-animation its rect says
      // where the text *is*, not where it lands — reading the vertical extent
      // from the (untransformed) .hl-line mask instead gives the final position
      // straight away. The horizontal extent still comes from a Range over the
      // text, because the mask is block-level and would otherwise reserve the
      // whole column width instead of just the glyphs. The reveal only animates
      // Y, so the Range's left/right are correct even while it's playing.
      const keepOut = []
      section.querySelectorAll('.introC__big .hl-line').forEach((line) => {
        const inner = line.querySelector('.hl-line__inner') || line
        const mask = line.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(inner)
        const ink = range.getBoundingClientRect()
        keepOut.push({
          left: ink.left,
          right: ink.right,
          top: mask.top,
          bottom: mask.bottom,
        })
      })
      const about = section.querySelector('.introC__about')
      if (about) keepOut.push(about.getBoundingClientRect())

      const placed = []
      const minY = sec.top + NAV_SAFE

      stickers.forEach((el) => {
        // Measure at the stylesheet position so the offset is relative to it.
        el.style.setProperty('--dx', '0px')
        el.style.setProperty('--dy', '0px')
        const base = el.getBoundingClientRect()

        const spanX = sec.width - base.width - GAP * 2
        const spanY = sec.bottom - minY - base.height - GAP
        if (spanX <= 0 || spanY <= 0) {
          placed.push(base)
          return
        }

        let found = null
        for (let i = 0; i < TRIES; i++) {
          const left = sec.left + GAP + Math.random() * spanX
          const top = minY + Math.random() * spanY
          const box = { left, top, right: left + base.width, bottom: top + base.height }
          if (keepOut.some((k) => intersects(box, k))) continue
          if (placed.some((p) => intersects(box, p))) continue
          found = box
          break
        }

        if (found) {
          el.style.setProperty('--dx', `${Math.round(found.left - base.left)}px`)
          el.style.setProperty('--dy', `${Math.round(found.top - base.top)}px`)
          placed.push(found)
        } else {
          // Nowhere clear — leave it where the stylesheet put it.
          placed.push(base)
        }
      })
    }

    // Wait for the webfont before measuring: the headline's boxes shift when
    // Jaro swaps in, and scattering against the fallback metrics would leave
    // stickers sitting on the text.
    let raf = requestAnimationFrame(scatter)
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) scatter()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [sectionRef])
}
