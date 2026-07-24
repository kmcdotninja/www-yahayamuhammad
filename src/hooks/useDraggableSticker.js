import { useEffect } from 'react'

// Makes a decorative sticker drag-positionable.
//
// The offset is written to --dx / --dy custom properties rather than to
// `transform` directly, so the sticker's resting lean (--rot, set per sticker in
// CSS) survives a drag instead of being overwritten.
//
// The starting offset is read back off the element at pointerdown rather than
// tracked from zero, because useStickerScatter has usually already written an
// offset by then — reading it keeps the two from fighting (otherwise the first
// drag would snap the sticker back to its stylesheet position).
export function useDraggableSticker(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const readOffset = () => {
      const cs = getComputedStyle(el)
      return {
        x: parseFloat(cs.getPropertyValue('--dx')) || 0,
        y: parseFloat(cs.getPropertyValue('--dy')) || 0,
      }
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
      const o = readOffset()
      baseX = o.x
      baseY = o.y
      pointerId = e.pointerId
      el.setPointerCapture?.(e.pointerId)
      el.classList.add('is-dragging')
      // Stop the browser's native image drag from hijacking the gesture.
      e.preventDefault()
    }

    const onMove = (e) => {
      if (!dragging) return
      el.style.setProperty('--dx', `${baseX + (e.clientX - startX)}px`)
      el.style.setProperty('--dy', `${baseY + (e.clientY - startY)}px`)
    }

    const onUp = () => {
      if (!dragging) return
      dragging = false
      if (pointerId != null) el.releasePointerCapture?.(pointerId)
      pointerId = null
      el.classList.remove('is-dragging')
    }

    const onDragStart = (e) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('dragstart', onDragStart)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('dragstart', onDragStart)
      el.classList.remove('is-dragging')
    }
  }, [ref])
}
