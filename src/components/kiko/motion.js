import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../hooks/useOnScreen.js'

// Small motion kit for Kiko's animated cards (Peekaboo, KikoIcon): curves,
// a damped spring and a loop clock that only runs while the card is on screen.

// CSS-style cubic-bezier(x1, y1, x2, y2) as a function of progress 0..1
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x
      const d = dx(t)
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break
      t -= e / d
    }
    // bisection fallback for flat slopes
    if (Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0
      let hi = 1
      t = x
      for (let i = 0; i < 30; i++) {
        if (sx(t) < x) lo = t
        else hi = t
        t = (lo + hi) / 2
      }
    }
    return sy(t)
  }
}

// a damped spring from 0 to 1 over `dur` seconds of progress p (0..1).
// zeta < 1 gives one soft overshoot; no audible wobble at zeta >= 0.7
export function spring(zeta = 0.78, turns = 1.1) {
  const w = (turns * 2 * Math.PI)
  const wd = w * Math.sqrt(1 - zeta * zeta)
  const end = (p) => 1 - Math.exp(-zeta * w * p) * (Math.cos(wd * p) + ((zeta * w) / wd) * Math.sin(wd * p))
  const e1 = end(1)
  // normalise so p = 1 lands exactly on 1 (the residue is tiny and eased out)
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : end(p) + (1 - e1) * p * p * p)
}

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a, b, p) => a + (b - a) * p
// progress of t through [a, b]
export const seg = (t, a, b) => clamp01((t - a) / (b - a))

// keyframe track: [[t, value, ease?], ...] -- ease shapes the segment that ends at that key
export function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, ease] = keys[i]
      if (t <= t1) {
        const [t0, v0] = keys[i - 1]
        const p = (t - t0) / (t1 - t0)
        return lerp(v0, v1, ease ? ease(p) : p)
      }
    }
    return keys[keys.length - 1][1]
  }
}

// Runs draw(t) every frame, t = seconds into a loop of `period`, while the
// element is on screen. Off screen it pauses; back within a couple of seconds
// it carries on, back after longer it starts again from the top.
// Reduced motion: draw(staticT) once. Images inside `ref` are decoded before
// the first frame, so nothing pops in. Returns { near (load the images now), on }.
export function useLoop(ref, period, draw, staticT) {
  const [near, setNear] = useState(false)
  const [on, setOn] = useState(false)
  const drawRef = useRef(draw)
  const clock = useRef({ t: 0, offAt: 0 })
  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const a = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '800px 0px' })
    const b = new IntersectionObserver(([e]) => setOn(e.isIntersecting))
    a.observe(el)
    b.observe(el)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el || !near) return undefined
    let raf = 0
    let dead = false
    const c = clock.current
    const imgs = [...el.querySelectorAll('img')]
    Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null))).then(() => {
      if (dead) return
      if (prefersReducedMotion()) {
        drawRef.current(staticT)
        return
      }
      if (!on) {
        drawRef.current(c.t % period)
        return
      }
      if (c.offAt && performance.now() - c.offAt > 2000) c.t = 0
      c.offAt = 0
      let last = 0
      const tick = (now) => {
        if (dead) return
        if (last) c.t += Math.min(0.1, (now - last) / 1000)
        last = now
        drawRef.current(c.t % period)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      if (on) c.offAt = performance.now()
    }
  }, [ref, near, on, period, staticT])

  return { near, on }
}
