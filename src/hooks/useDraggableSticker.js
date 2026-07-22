import { useEffect } from 'react'

// Makes a decorative sticker drag-positionable.
//
// The offset is written to --dx / --dy custom properties rather than to
// `transform` directly, so the sticker's resting lean (--rot, set per sticker in
// CSS) survives a drag instead of being overwritten. Where you drop it is
// remembered in localStorage, so an arrangement you like is still there after a
// reload — and in dev the drop also logs paste-ready `top`/`left` values so a
// position can be baked back into the stylesheet. Double-click resets.
export function useDraggableSticker(ref, key) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const storeKey = `sticker:${key}`
    let dx = 0
    let dy = 0

    const apply = () => {
      el.style.setProperty('--dx', `${dx}px`)
      el.style.setProperty('--dy', `${dy}px`)
    }

    // Restore a previously dragged position.
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || 'null')
      if (saved && Number.isFinite(saved.dx) && Number.isFinite(saved.dy)) {
        dx = saved.dx
        dy = saved.dy
        apply()
      }
    } catch {
      /* storage unavailable (private mode) — just start from the CSS position */
    }

    let dragging = false
    let startX = 0
    let startY = 0
    let baseX = 0
    let baseY = 0
    let pointerId = null

    const onDown = (e) => {
      dragging = true
      startX = e.clientX
      startY = e.clientY
      baseX = dx
      baseY = dy
      pointerId = e.pointerId
      el.setPointerCapture?.(e.pointerId)
      el.classList.add('is-dragging')
      // Stop the browser's native image drag from hijacking the gesture.
      e.preventDefault()
    }

    const onMove = (e) => {
      if (!dragging) return
      dx = baseX + (e.clientX - startX)
      dy = baseY + (e.clientY - startY)
      apply()
    }

    const onUp = () => {
      if (!dragging) return
      dragging = false
      if (pointerId != null) el.releasePointerCapture?.(pointerId)
      pointerId = null
      el.classList.remove('is-dragging')

      try {
        localStorage.setItem(storeKey, JSON.stringify({ dx, dy }))
      } catch {
        /* ignore */
      }

      if (import.meta.env.DEV) {
        // `left`/`top` resolve to used pixel values even when the rule sets
        // `right`, and neither is affected by the transform — so the CSS
        // position plus the drag delta is exactly where it now sits.
        const cs = getComputedStyle(el)
        const left = Math.round((parseFloat(cs.left) || 0) + dx)
        const top = Math.round((parseFloat(cs.top) || 0) + dy)
        console.log(
          `[sticker:${key}] moved ${Math.round(dx)}px, ${Math.round(dy)}px → top: ${top}px; left: ${left}px;`,
        )
      }
    }

    const onDoubleClick = () => {
      dx = 0
      dy = 0
      apply()
      try {
        localStorage.removeItem(storeKey)
      } catch {
        /* ignore */
      }
      if (import.meta.env.DEV) console.log(`[sticker:${key}] reset to its CSS position`)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('dblclick', onDoubleClick)
    el.addEventListener('dragstart', (e) => e.preventDefault())

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('dblclick', onDoubleClick)
      el.classList.remove('is-dragging')
    }
  }, [ref, key])
}
