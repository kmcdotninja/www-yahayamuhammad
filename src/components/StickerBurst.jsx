import { useCallback, useEffect, useRef } from 'react'
import './StickerBurst.css'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

// An Instagram-Live-style stream of stickers rising off an inline link.
//
// Each sticker is its own element with a randomised drift, rotation, size and
// duration written in as CSS custom properties, so the motion is a CSS animation
// the compositor owns — no per-frame JS, and any number of them can be in the
// air at once without costing a thing. JS only spawns and reaps.
//
// They rise from a little below the link and are pulled sideways along a curve,
// which is what gives the effect its lightness: a straight vertical float reads
// as a loading spinner, an arc reads as something let go of.

const SPAWN_MS = 140 // one sticker roughly seven times a second while hovered
const LIFE_MS = 2100 // matches the CSS animation; the node is reaped after it
const MAX_LIVE = 14 // ceiling, so a pointer parked on the link can't pile up

const rand = (min, max) => min + Math.random() * (max - min)

export default function StickerBurst({ src, children, className = '' }) {
  const hostRef = useRef(null)
  const timerRef = useRef(0)
  const liveRef = useRef(0)
  const reduced = useReducedMotion()

  const pop = useCallback(() => {
    const host = hostRef.current
    if (!host || liveRef.current >= MAX_LIVE) return

    const el = document.createElement('img')
    el.src = src
    el.alt = ''
    el.setAttribute('aria-hidden', 'true')
    el.className = 'burst__bit'
    // Odd numbers on purpose: anything regular reads as a machine.
    el.style.setProperty('--x', `${rand(-18, 18).toFixed(1)}px`)
    el.style.setProperty('--drift', `${rand(-58, 58).toFixed(1)}px`)
    el.style.setProperty('--tilt', `${rand(-38, 38).toFixed(1)}deg`)
    // Big enough that the sticker reads as the sticker. It is a dark body with a
    // white die-cut edge, so below ~20px on a near-black page all that survives
    // is the outline and it looks like a smudge.
    el.style.setProperty('--size', `${rand(24, 42).toFixed(1)}px`)
    el.style.setProperty('--rise', `${rand(96, 150).toFixed(0)}px`)
    el.style.setProperty('--life', `${rand(LIFE_MS * 0.75, LIFE_MS).toFixed(0)}ms`)

    liveRef.current += 1
    el.addEventListener(
      'animationend',
      () => {
        el.remove()
        liveRef.current -= 1
      },
      { once: true },
    )
    host.appendChild(el)
  }, [src])

  const start = useCallback(() => {
    if (reduced || timerRef.current) return
    pop() // the first one lands immediately — waiting a beat feels broken
    timerRef.current = window.setInterval(pop, SPAWN_MS)
  }, [pop, reduced])

  const stop = useCallback(() => {
    window.clearInterval(timerRef.current)
    timerRef.current = 0
    // Anything already airborne is left to finish its own flight rather than
    // being cut off — the stream stops, it doesn't vanish.
  }, [])

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  return (
    <span className={`burst ${className}`.trim()}>
      <span
        className="burst__stage"
        ref={hostRef}
        aria-hidden="true"
        // The stickers are decoration over the top of the page; they must never
        // sit between a pointer and the link they are celebrating.
      />
      <span
        className="burst__trigger"
        onPointerEnter={(e) => e.pointerType === 'mouse' && start()}
        onPointerLeave={stop}
        onPointerCancel={stop}
        // Touch has no hover, so a tap gets one burst on the way to following
        // the link.
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          pop()
          window.setTimeout(pop, SPAWN_MS)
          window.setTimeout(pop, SPAWN_MS * 2)
        }}
        onFocusCapture={start}
        onBlurCapture={stop}
      >
        {children}
      </span>
    </span>
  )
}
