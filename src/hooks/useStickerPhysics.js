import { useLayoutEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion.js'

// Turns the hero stickers into physical objects: they drop in from above the
// top edge on every load, bounce off the four walls of the section, collide
// with each other, and can be grabbed and flung — the throw carries the
// pointer's velocity so a hard toss ricochets off the walls before settling.
//
// It's a small hand-rolled solver rather than a physics library: five bodies in
// a box is cheap, and a dependency (matter.js is ~85KB) isn't worth it on the
// home hero. Bodies are AABBs for wall contact and approximated as circles for
// body-to-body contact — plenty for stickers.
//
// Positions are driven entirely by an inline `transform` written each frame, so
// the CSS anchor rules (--pin/--brain/…) only decide the intrinsic size here;
// the solver owns the placement.

const GRAVITY = 3000 // px/s²
const WALL_BOUNCE = 0.62 // energy kept on a wall hit (0 = dead, 1 = perfect)
const BODY_BOUNCE = 0.4 // energy kept when two stickers collide
const WALL_FRICTION = 0.9 // tangential speed kept on a side/top hit
const FLOOR_FRICTION = 0.84 // horizontal speed kept per floor hit (drag to rest)
const AIR = 0.12 // linear drag per second
const SPIN_AIR = 0.9 // angular drag per second
const SPIN_FROM_SLIDE = 0.06 // floor sliding → roll
const MAX_SPEED = 3600 // clamp so a violent fling can't tunnel through a wall
const REST_SPEED = 14 // below this on the floor, start settling
const SLEEP_FRAMES = 22 // frames at rest before a body sleeps (stops jittering)
const SUBSTEPS = 2 // integration substeps per frame (wall stability)
const PLATFORM_SETTLE = 40 // input acts as a platform only once its bottom is this close to the floor

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const rand = (lo, hi) => lo + Math.random() * (hi - lo)

export function useStickerPhysics(sectionRef) {
  const reduced = useReducedMotion()
  // The live effect writes its spawn function here; the returned API forwards to
  // it so callers get a stable reference that survives the effect re-running.
  const spawnRef = useRef(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const els = [...section.querySelectorAll('.hero-sticker')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    )
    if (!els.length) return

    let W = section.clientWidth
    let H = section.clientHeight
    // Floor = the section's bottom edge (the horizontal divider line), so the
    // pile settles right down on that line rather than floating mid-hero.
    const FLOOR_INSET = 2 // sit a hair above the 1px border, not through it
    let floorY = H - FLOOR_INSET

    // Keep-out boxes: the bio blurb + the scroll link. Stickers rest on top of
    // these rather than covering the text (see the raised support surface in
    // integrate). Measured with a little padding so nothing sits flush on words.
    const OBSTACLE_PAD = 12
    const measureObstacles = () => {
      const secRect = section.getBoundingClientRect()
      return [...section.querySelectorAll('[data-sticker-keepout]')].map((el) => {
        const r = el.getBoundingClientRect()
        return {
          left: r.left - secRect.left - OBSTACLE_PAD,
          top: r.top - secRect.top - OBSTACLE_PAD,
          right: r.right - secRect.left + OBSTACLE_PAD,
          bottom: r.bottom - secRect.top + OBSTACLE_PAD,
        }
      })
    }
    let obstacles = measureObstacles()

    // Build a body from a sticker element. offsetWidth/Height are the laid-out
    // size and don't depend on the transform we're about to drive, so they're
    // safe to read now (and the size comes from CSS, not the yet-to-decode art).
    const makeBody = (el) => {
      el.style.left = '0px'
      el.style.top = '0px'
      el.style.right = 'auto'
      el.style.bottom = 'auto'
      el.style.margin = '0'
      el.style.transition = 'none'
      el.style.transformOrigin = '50% 50%'
      el.style.willChange = 'transform'
      el.style.backfaceVisibility = 'hidden' // keep the promoted layer stable
      const w = el.offsetWidth
      const h = el.offsetHeight
      return {
        el,
        w,
        h,
        hw: w / 2,
        hh: h / 2,
        r: Math.min(w, h) * 0.46, // collision circle radius
        // Upright bodies (the face, the input) never tumble — they self-right to
        // a small lean instead of resting at whatever angle they land.
        upright: el.hasAttribute('data-upright'),
        uprightTarget: 0,
        // The input pill is a platform: other stickers rest on TOP of it (never
        // over its face) so it stays clickable, and it doesn't bounce them.
        isInput: !!el.querySelector('input, textarea'),
        // Frozen bodies (the input while you're typing in it) don't move and act
        // immovable in collisions, so the pile can't shove them mid-type.
        frozen: false,
        cx: 0,
        cy: 0,
        vx: 0,
        vy: 0,
        angle: 0,
        spin: 0,
        enteredTop: false,
        dragging: false,
        sleeping: false,
        restFrames: 0,
        // throw estimation while dragging
        grabX: 0,
        grabY: 0,
        tvx: 0,
        tvy: 0,
      }
    }
    const bodies = els.map(makeBody)
    // The input pill acts as a platform the rest of the pile rests on.
    const inputBody = bodies.find((b) => b.isInput) || null
    // Text boxes created at runtime via spawnText — tracked so cleanup can
    // detach and remove them (the initial `els` are owned by React).
    const dynamicEls = []

    const spawn = (b, i) => {
      b.hw = b.w / 2
      b.hh = b.h / 2
      // Upright bodies settle to a subtle, per-load lean; everything else can
      // land at any angle.
      b.uprightTarget = b.upright ? rand(-7, 7) : 0
      if (reduced || b.isInput) {
        // The input starts already settled at the bottom — a stable, always-
        // reachable control that the rest of the pile rests on top of (it's
        // still draggable/tossable). Reduced-motion rests everything this way.
        b.cx = b.isInput
          ? clamp(W * 0.6, b.hw, W - b.hw)
          : clamp((W * (i + 1)) / (bodies.length + 1), b.hw, W - b.hw)
        b.cy = clamp(floorY - b.hh, b.hh, H - b.hh)
        b.vx = b.vy = b.spin = 0
        b.angle = b.upright ? b.uprightTarget : rand(-6, 6)
        b.enteredTop = true
        b.sleeping = true
      } else {
        b.cx = clamp(rand(b.hw, W - b.hw), b.hw, W - b.hw)
        // Stagger start heights above the top edge so they arrive in a loose
        // sequence rather than a single curtain.
        b.cy = -b.hh - rand(40, 40 + H * 0.7)
        b.vx = rand(-140, 140)
        b.vy = rand(0, 160)
        b.angle = b.upright ? b.uprightTarget : rand(-25, 25)
        b.spin = b.upright ? 0 : rand(-300, 300)
        b.enteredTop = false
        b.sleeping = false
      }
      b.restFrames = 0
    }
    bodies.forEach(spawn)

    const wake = (b) => {
      b.sleeping = false
      b.restFrames = 0
    }

    // Half-extents of a body's rotated bounding box: how far its farthest corner
    // reaches along x and y. Used for every wall/line contact so the visible
    // card — not an unrotated proxy — is what stays inside the box.
    const extents = (b) => {
      const rad = (b.angle * Math.PI) / 180
      const c = Math.abs(Math.cos(rad))
      const s = Math.abs(Math.sin(rad))
      return { ex: b.hw * c + b.hh * s, ey: b.hw * s + b.hh * c }
    }

    const integrate = (b, dt) => {
      if (b.dragging || b.sleeping || b.frozen) return
      const g = reduced ? 0 : GRAVITY
      b.vy += g * dt
      const drag = 1 - AIR * dt
      b.vx *= drag
      b.vy *= drag
      b.spin *= 1 - SPIN_AIR * dt

      // Clamp speed to stop a hard fling from tunnelling a wall in one step.
      const sp = Math.hypot(b.vx, b.vy)
      if (sp > MAX_SPEED) {
        b.vx *= MAX_SPEED / sp
        b.vy *= MAX_SPEED / sp
      }

      b.cx += b.vx * dt
      b.cy += b.vy * dt
      b.angle += b.spin * dt

      // Upright bodies (the face) don't spin — they continuously ease back to
      // their small resting lean, so no bounce or shove can leave one inverted.
      if (b.upright) {
        b.spin = 0
        b.angle += (b.uprightTarget - b.angle) * Math.min(1, dt * 7)
      }

      const bounce = reduced ? 0 : WALL_BOUNCE

      // Half-extents of the ROTATED card along each axis (how far its farthest
      // corner reaches). Colliding against these — not the unrotated hw/hh —
      // is what keeps a tilted sticker's corner from crossing a wall/the line.
      const { ex, ey } = extents(b)

      // Left / right walls
      if (b.cx - ex < 0) {
        b.cx = ex
        b.vx = -b.vx * bounce
        b.vy *= WALL_FRICTION
        wake(b)
      } else if (b.cx + ex > W) {
        b.cx = W - ex
        b.vx = -b.vx * bounce
        b.vy *= WALL_FRICTION
        wake(b)
      }

      // Top wall — only active once the body has fully dropped in, so the
      // initial fall from above isn't bounced back out.
      if (!b.enteredTop) {
        if (b.cy - ey >= 0) b.enteredTop = true
      } else if (b.cy - ey < 0) {
        b.cy = ey
        b.vy = -b.vy * bounce
        b.vx *= WALL_FRICTION
        wake(b)
      }

      // Support surface: the bottom line, but raised to the TOP of a keep-out
      // box (the bio / scroll text) wherever the body's width overlaps one — so
      // the pile settles on a ledge above the words instead of covering them.
      let supportY = floorY
      for (let k = 0; k < obstacles.length; k++) {
        const o = obstacles[k]
        if (b.cx + ex > o.left && b.cx - ex < o.right) supportY = Math.min(supportY, o.top)
      }
      // The input pill is a platform other stickers rest on top of — but ONLY
      // once it has settled near the floor. While it's still falling in from
      // above, it must not raise the support (that pinned stickers mid-air near
      // the top); collision alone handles it during the drop.
      if (
        inputBody &&
        b !== inputBody &&
        inputBody.cy + inputBody.hh > floorY - PLATFORM_SETTLE
      ) {
        const ie = extents(inputBody)
        const iLeft = inputBody.cx - ie.ex - OBSTACLE_PAD
        const iRight = inputBody.cx + ie.ex + OBSTACLE_PAD
        const iTop = inputBody.cy - ie.ey - OBSTACLE_PAD
        if (b.cx + ex > iLeft && b.cx - ex < iRight) supportY = Math.min(supportY, iTop)
      }
      if (b.cy + ey > supportY) {
        b.cy = supportY - ey
        b.vy = -b.vy * bounce
        b.vx *= FLOOR_FRICTION
        if (!b.upright) b.spin = b.spin * 0.6 - b.vx * SPIN_FROM_SLIDE
        // Settle: once slow on the floor, bleed off the last motion and sleep
        // so the pile doesn't shiver forever.
        if (Math.abs(b.vy) < REST_SPEED && Math.abs(b.vx) < REST_SPEED) {
          b.vx *= 0.7
          b.vy = 0
          if (Math.abs(b.vx) < 4 && Math.abs(b.spin) < 12) {
            b.restFrames++
            if (b.restFrames > SLEEP_FRAMES) {
              b.vx = 0
              b.spin = 0
              b.sleeping = true
            }
          } else {
            b.restFrames = 0
          }
        } else {
          b.restFrames = 0
        }
      }
    }

    // Body-to-body: circle approximation. A dragged body is treated as
    // immovable so you can shove the others around with it.
    const collide = (a, b) => {
      const dx = b.cx - a.cx
      const dy = b.cy - a.cy
      const min = a.r + b.r
      let dist = Math.hypot(dx, dy)
      if (dist >= min || dist === 0) return
      const nx = dx / dist
      const ny = dy / dist
      const overlap = min - dist
      // The input is an immovable platform: stickers bounce off / rest on it,
      // but it never gets shoved around (keeping its face reachable).
      const aMov = !a.dragging && !a.frozen && !a.isInput
      const bMov = !b.dragging && !b.frozen && !b.isInput
      if (!aMov && !bMov) return
      // Positional correction split by mobility.
      if (aMov && bMov) {
        a.cx -= nx * overlap * 0.5
        a.cy -= ny * overlap * 0.5
        b.cx += nx * overlap * 0.5
        b.cy += ny * overlap * 0.5
      } else if (aMov) {
        a.cx -= nx * overlap
        a.cy -= ny * overlap
      } else {
        b.cx += nx * overlap
        b.cy += ny * overlap
      }
      // Impulse along the normal if they're approaching.
      const rvx = b.vx - a.vx
      const rvy = b.vy - a.vy
      const vn = rvx * nx + rvy * ny
      if (vn > 0) return
      const j = -(1 + BODY_BOUNCE) * vn * 0.5
      if (aMov) {
        a.vx -= j * nx
        a.vy -= j * ny
        wake(a)
      }
      if (bMov) {
        b.vx += j * nx
        b.vy += j * ny
        wake(b)
      }
      const tangential = rvx * -ny + rvy * nx
      if (aMov && !a.upright) a.spin += tangential * 0.02
      if (bMov && !b.upright) b.spin -= tangential * 0.02
    }

    const render = (b) => {
      // translate3d (not translate) keeps each sticker on its own compositor
      // layer, so a move is a cheap GPU transform instead of repainting it and
      // the headline underneath it every frame — that repaint was the lag.
      b.el.style.transform = `translate3d(${(b.cx - b.hw).toFixed(2)}px, ${(
        b.cy - b.hh
      ).toFixed(2)}px, 0) rotate(${b.angle.toFixed(2)}deg)`
    }
    bodies.forEach(render)

    // ---- Drag + throw ----
    let dragged = null
    let lastT = 0

    const local = (e) => {
      const rect = section.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onDown = (e) => {
      // Clicks on the input's own controls focus/submit instead of dragging.
      if (e.target.closest?.('input, textarea, button, select, a')) return
      const b = bodies.find((body) => body.el === e.currentTarget)
      if (!b) return
      const p = local(e)
      dragged = b
      b.dragging = true
      b.sleeping = false
      b.grabX = b.cx - p.x
      b.grabY = b.cy - p.y
      b.tvx = 0
      b.tvy = 0
      lastT = performance.now()
      b.el.classList.add('is-dragging')
      b.el.setPointerCapture?.(e.pointerId)
      e.preventDefault()
    }

    const onMove = (e) => {
      if (!dragged) return
      const p = local(e)
      const { ex, ey } = extents(dragged)
      const nx = clamp(p.x + dragged.grabX, ex, W - ex)
      const ny = clamp(p.y + dragged.grabY, ey, H - ey)
      const now = performance.now()
      const dt = (now - lastT) / 1000
      if (dt > 0) {
        // Smoothed pointer velocity → becomes the throw on release.
        const ivx = (nx - dragged.cx) / dt
        const ivy = (ny - dragged.cy) / dt
        dragged.tvx = dragged.tvx * 0.6 + ivx * 0.4
        dragged.tvy = dragged.tvy * 0.6 + ivy * 0.4
      }
      lastT = now
      dragged.cx = nx
      dragged.cy = ny
    }

    const onUp = () => {
      if (!dragged) return
      const b = dragged
      b.dragging = false
      b.enteredTop = true
      b.vx = clamp(b.tvx, -MAX_SPEED, MAX_SPEED)
      b.vy = clamp(b.tvy, -MAX_SPEED, MAX_SPEED)
      if (!b.upright) b.spin += clamp(b.vx * 0.08, -420, 420)
      b.restFrames = 0
      b.el.classList.remove('is-dragging')
      dragged = null
    }

    els.forEach((el) => el.addEventListener('pointerdown', onDown))
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    // Spawn a text box into the pile — a real physics body that drops in,
    // bounces, and is draggable like any other sticker.
    const spawnText = (text) => {
      const t = String(text || '').trim().slice(0, 48)
      if (!t) return
      const el = document.createElement('div')
      el.className = 'hero-sticker hero-sticker--text'
      el.setAttribute('aria-hidden', 'true')
      el.textContent = t
      section.appendChild(el)
      const b = makeBody(el)
      spawn(b, bodies.length)
      bodies.push(b)
      dynamicEls.push(el)
      el.addEventListener('pointerdown', onDown)
      render(b) // place at its spawn point before the next frame (no 0,0 flash)
      if (!started) start() // in case the drop was still gated on decode
    }
    spawnRef.current = spawnText

    // Freeze a body while you're typing in its input, so the pile can't drift or
    // shove it away mid-type; releasing focus lets it be knocked around again.
    const freezeHandlers = []
    els.forEach((el) => {
      const input = el.querySelector('input, textarea')
      if (!input) return
      const b = bodies.find((body) => body.el === el)
      if (!b) return
      const onFocus = () => {
        b.frozen = true
        b.vx = b.vy = b.spin = 0
      }
      const onBlur = () => {
        b.frozen = false
        b.restFrames = 0
      }
      input.addEventListener('focus', onFocus)
      input.addEventListener('blur', onBlur)
      freezeHandlers.push([input, onFocus, onBlur])
    })

    const onResize = () => {
      W = section.clientWidth
      H = section.clientHeight
      floorY = H - FLOOR_INSET
      obstacles = measureObstacles()
      bodies.forEach((b) => {
        b.cx = clamp(b.cx, b.hw, W - b.hw)
        b.cy = clamp(b.cy, b.hh, H - b.hh)
      })
    }
    window.addEventListener('resize', onResize)
    // The bio uses a web font (Instrument Sans); its box shifts when that swaps
    // in, so re-measure the keep-out zones once fonts are ready.
    document.fonts?.ready.then(() => {
      obstacles = measureObstacles()
    })

    // ---- Loop ----
    let raf = 0
    let prev = 0
    const frame = (now) => {
      let dt = (now - prev) / 1000
      prev = now
      if (dt > 0.05) dt = 0.05 // clamp after a tab switch / long frame
      const sdt = dt / SUBSTEPS
      for (let s = 0; s < SUBSTEPS; s++) {
        for (let i = 0; i < bodies.length; i++) integrate(bodies[i], sdt)
        for (let i = 0; i < bodies.length; i++)
          for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j])
      }
      for (let i = 0; i < bodies.length; i++) render(bodies[i])
      raf = requestAnimationFrame(frame)
    }

    // Hold the drop until the sticker art has decoded, so the browser isn't
    // rasterizing heavy SVGs (the traced portrait especially) on the same
    // frames the fall animates — that decode contention is what stutters the
    // first second. The stickers wait off-screen above the top edge until then,
    // so nothing visibly freezes; a short timeout caps the wait for slow assets.
    let started = false
    const start = () => {
      if (started) return
      started = true
      clearTimeout(startTimer)
      prev = performance.now() // reset so the first dt isn't the whole decode wait
      raf = requestAnimationFrame(frame)
    }
    Promise.allSettled(els.map((el) => (el.decode ? el.decode() : Promise.resolve()))).then(
      start,
    )
    const startTimer = setTimeout(start, 300)

    return () => {
      started = true // no-op a late decode callback after unmount
      spawnRef.current = null
      clearTimeout(startTimer)
      cancelAnimationFrame(raf)
      els.forEach((el) => el.removeEventListener('pointerdown', onDown))
      dynamicEls.forEach((el) => {
        el.removeEventListener('pointerdown', onDown)
        el.remove()
      })
      freezeHandlers.forEach(([input, f, g]) => {
        input.removeEventListener('focus', f)
        input.removeEventListener('blur', g)
      })
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('resize', onResize)
      els.forEach((el) => el.classList.remove('is-dragging'))
    }
  }, [sectionRef, reduced])

  // Stable API — forwards to the live effect's spawnText via the ref.
  return useMemo(() => ({ spawnText: (text) => spawnRef.current?.(text) }), [])
}
