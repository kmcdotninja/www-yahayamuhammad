import { useEffect, useRef, useState } from 'react'
import './NewInKiko.css'
import { prefersReducedMotion } from '../../hooks/useOnScreen.js'
import { bezier, spring, seg, clamp01 } from './motion.js'
import { bakeCycle, PILLS, PILL_H, PAD, inkOf } from './pillWorld.js'

// New in Kiko. Moment 1: "New in Kiko" and a cyan "v1.6" block pop in on a
// soft spring and hold. Moment 2: the title lifts away and the fifteen things
// a child does in Kiko fall in as capsules, pile up, hold, then the floor goes
// and they fall out; the title comes back. ~7 s, seamless.
//
// The fall is real rigid-body physics (matter-js, pillWorld.js): each pill a
// capsule body the size of its DOM pill, run at a fixed 60 Hz step. The cycle
// is computed once in the browser, a few steps per frame while the title
// shows, and then played by time (so 60 and 120 Hz screens see the same
// motion; between steps it interpolates). The DOM pills are moved with
// transforms, so the text stays crisp.
//
// Runs only while on screen (back on screen it starts from the title);
// reduced motion shows the settled pile, still.
//
// Props: className, label (the accessible description).

const T_PILLS = 1.6 // s: the first pill is dropped
const popIn = spring(0.68, 1.05)
const liftEase = bezier(0.55, 0, 0.8, 0.4)

const LABEL =
  'New in Kiko, version 1.6: Arabic letters, games (Trace, Run, Fit, Catch, Pop), numbers, counting, stories, listening, Game Time, dressing up Kiko, earning coins and levelling up'

export default function NewInKiko({ className = '', label = LABEL }) {
  const root = useRef(null)
  const title = useRef(null)
  const word = useRef(null)
  const ver = useRef(null)
  const pills = useRef([])
  const [near, setNear] = useState(false)
  const [on, setOn] = useState(false)
  const cycle = useRef(null) // the baked cycle, kept across visits

  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    const a = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    const b = new IntersectionObserver(([e]) => setOn(e.isIntersecting), {
      rootMargin: '40px 0px',
    })
    a.observe(el)
    b.observe(el)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [])

  // fonts in, pills measured, matter-js loaded, the cycle baked (once)
  const [widths, setWidths] = useState(null)
  useEffect(() => {
    if (!near || cycle.current) return undefined
    let dead = false
    let raf = 0
    const el = root.current
    const fonts = document.fonts
      ? Promise.all([document.fonts.load('900 58px "SF Pro Rounded Kiko"').catch(() => {}), document.fonts.ready])
      : Promise.resolve()
    Promise.all([import('matter-js'), fonts]).then(([{ default: Matter }]) => {
      if (dead || !el) return
      // measure each label (card units); keep the search's widths unless the
      // font came out different (then the bodies take the measured size)
      const k = el.clientWidth / 1000 || 1
      const measured = PILLS.map((p, i) => {
        // layout width (unaffected by the pill's rotation)
        const t = pills.current[i]?.firstChild
        return t?.offsetWidth ? t.offsetWidth / k + 2 * PAD : p[2]
      })
      const off = measured.some((m, i) => Math.abs(m - PILLS[i][2]) / PILLS[i][2] > 0.03)
      const widths = off ? measured.map((m) => Math.round(m)) : PILLS.map((p) => p[2])
      const gen = bakeCycle(Matter, { widths })
      const run = () => {
        if (dead) return
        const t0 = performance.now()
        let r = gen.next()
        while (!r.done && performance.now() - t0 < 8) r = gen.next()
        if (r.done) {
          cycle.current = { ...r.value, widths }
          el.dataset.seed = `${r.value.seed}${off ? ' measured' : ''}`
          setWidths(widths)
        } else raf = requestAnimationFrame(run)
      }
      raf = requestAnimationFrame(run)
    })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
    }
  }, [near])

  // the loop (reduced motion: redrawn once the pile is baked; otherwise the
  // bake finishing doesn't restart the round, tick reads it from the ref)
  const stillPile = prefersReducedMotion() ? widths : null
  useEffect(() => {
    const el = root.current
    if (!el || !near) return undefined
    let k = el.clientWidth / 1000
    const ro = new ResizeObserver(() => {
      k = el.clientWidth / 1000
    })
    ro.observe(el)

    const drawTitle = (t) => {
      const a = popIn(seg(t, 0, 0.62))
      const b = popIn(seg(t, 0.12, 0.74))
      const u = liftEase(seg(t, 1.42, 1.78))
      title.current.style.opacity = String(1 - u)
      title.current.style.transform = `translate3d(0, ${(-u * 14).toFixed(3)}%, 0)`
      word.current.style.opacity = String(clamp01(a * 2.2))
      word.current.style.transform = `translate3d(0, ${((1 - a) * 4).toFixed(3)}cqw, 0) scale(${(0.6 + 0.4 * a).toFixed(4)})`
      ver.current.style.opacity = String(clamp01(b * 2.2))
      ver.current.style.transform = `translate3d(0, ${((1 - b) * 4).toFixed(3)}cqw, 0) scale(${(0.5 + 0.5 * b).toFixed(4)}) rotate(${((1 - b) * -8).toFixed(3)}deg)`
    }
    const drawPills = (f) => {
      const c = cycle.current
      const show = c && f >= 0 && f <= c.count - 1
      const i0 = show ? Math.floor(f) : 0
      const i1 = show ? Math.min(c.count - 1, i0 + 1) : 0
      const p = f - i0
      const A = show && c.frames[i0]
      const B = show && c.frames[i1]
      PILLS.forEach((_, i) => {
        const node = pills.current[i]
        if (!node) return
        if (!show) {
          if (node.style.visibility !== 'hidden') node.style.visibility = 'hidden'
          return
        }
        const x = A[i * 3] + (B[i * 3] - A[i * 3]) * p
        const y = A[i * 3 + 1] + (B[i * 3 + 1] - A[i * 3 + 1]) * p
        const r = A[i * 3 + 2] + (B[i * 3 + 2] - A[i * 3 + 2]) * p
        const w = c.widths[i]
        // still above the card: nothing to draw
        if (y < -w / 2 - 20 || y > 1250 + w / 2 + 20) {
          if (node.style.visibility !== 'hidden') node.style.visibility = 'hidden'
          return
        }
        if (node.style.visibility !== 'visible') node.style.visibility = 'visible'
        node.style.transform = `translate3d(${((x - w / 2) * k).toFixed(2)}px, ${((y - PILL_H / 2) * k).toFixed(2)}px, 0) rotate(${r.toFixed(4)}rad)`
      })
    }

    // reduced motion: the settled pile, still (drawn once it is baked)
    if (prefersReducedMotion()) {
      title.current.style.opacity = '0'
      if (stillPile) drawPills(cycle.current.drop - 1)
      return () => ro.disconnect()
    }
    if (!on) return () => ro.disconnect()

    let raf = 0
    let last = 0
    let t = 0
    let looped = false
    const tick = (now) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0 // after a stall, don't race to catch up
      last = now
      const c = cycle.current
      t += dt
      // not baked yet (a slow phone): the title holds until it is
      if (!c && t > 1.36) t = 1.36
      const period = c ? T_PILLS + (c.out + 1) / 60 : Infinity
      if (t >= period) {
        t -= period
        looped = true
      }
      drawTitle(t)
      let f = (t - T_PILLS) * 60 - 1
      // the last pills of the round before still leaving while the title returns
      if (f < 0 && looped && c) f = (t + period - T_PILLS) * 60 - 1
      drawPills(f)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [near, on, stillPile])

  return (
    <div ref={root} className={`nik ${className}`} role="img" aria-label={label}>
      <div className="nik__title" ref={title} aria-hidden="true">
        <span className="nik__new" ref={word}>
          New in Kiko
        </span>
        <span className="nik__ver" ref={ver}>
          v1.6
        </span>
      </div>
      {PILLS.map(([text, color, w], i) => (
        <span
          key={text}
          aria-hidden="true"
          className="nik__pill"
          ref={(node) => {
            pills.current[i] = node
          }}
          style={{
            width: `calc(var(--c) * ${widths ? widths[i] : w})`,
            height: `calc(var(--c) * ${PILL_H})`,
            background: color,
            color: inkOf(color),
          }}
        >
          <span>{text}</span>
        </span>
      ))}
    </div>
  )
}
