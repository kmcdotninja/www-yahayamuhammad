// The "New in Kiko" pill pile: a real rigid-body world (matter-js), in card
// units (the card is 1000 wide x 1250 tall). Pure and deterministic: the same
// seed, the same widths and the same fixed 60 Hz steps give the same fall every
// time, so the settled pile looks the way it was chosen to (the seed was picked
// by an offline search that also checked the pile survives tiny perturbations,
// so a browser whose Math differs in the last bit still lands a good pile).
// Used by NewInKiko.jsx and by the offline seed search.

export const W = 1000
export const H = 1250
export const PILL_H = 112
export const FONT = 58 // the label size, card units
export const PAD = 38 // label padding each side, card units
export const STEP_MS = 1000 / 60

// Kiko's sticker colours (Brand page: social.js STICKERS / Mockups.jsx STK) and
// one dark pill, white text on it.
export const CYAN = '#50d2ed'
export const PINK = '#f7a8e0'
export const LILAC = '#b9a3f5'
export const YELLOW = '#ffd166'
export const MINT = '#5ef0a6'
export const DARK = '#121314'
export const INK = '#0c0e0f'
export const inkOf = (color) => (color === DARK ? '#fff' : INK)

// What a child does in Kiko (all in v1.6), in drop order. Colours were given
// by the search from the settled pile's contacts, so no two touching pills
// share one. The width is the label in SF Pro Rounded Heavy 58 (Kiko's web
// file, measured in the browser) + padding; the component re-measures it once
// the font is in.
export const PILLS = [
  ['Arabic Letters', CYAN, 449],
  ['Dress up Kiko', LILAC, 434],
  ['Game Time', PINK, 372],
  ['Earn coins', PINK, 349],
  ['Numbers', YELLOW, 320],
  ['Level up', DARK, 293],
  ['Games', LILAC, 262],
  ['Stories', MINT, 265],
  ['Trace', YELLOW, 225],
  ['Catch', CYAN, 236],
  ['Listen', PINK, 238],
  ['Count', YELLOW, 239],
  ['Pop', MINT, 179],
  ['Run', CYAN, 181],
  ['Fit', LILAC, 142],
]

// the seeds picked by the search (pills/search.mjs over 2000 seeds): a composed
// dome in the lower half, every word within ~36 deg of level, settled in ~3.5 s,
// and the same pile when nudged by 1e-4..1e-2 units. The first is the one; the
// others are spares in case a browser's maths lands the first one badly.
export const SEEDS = [1523, 49, 395, 956]
export const SEED = SEEDS[0]

export const INSET = 28 // walls and floor sit this far inside the card's edges

export const PARAMS = {
  gravity: 0.0016, // x (16.67 ms)^2 per step = 1600 units/s^2: the card height in ~1.2 s from rest
  v0: 18, // units per step the pills are tossed in with (~840 units/s)
  restitution: 0.3,
  friction: 0.45,
  frictionStatic: 0.7,
  frictionAir: 0.015,
  density: 0.001,
  stagger: [90, 160], // ms between pills entering the card
  spin: 0.04, // max starting spin, rad per step
  tilt: 0.35, // max starting tilt, rad
  wallFriction: 0.05,
  floorFriction: 0.7,
  sleep: 40, // still steps before a pill sleeps
  inertia: 1,
  roll: 0.04, // spin lost per step while touching (rolling resistance)
  substeps: 3,
}

function lcg(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// half-extents of a tilted capsule
const halfY = (w, a) => (Math.abs(Math.sin(a)) * (w - PILL_H)) / 2 + PILL_H / 2
const halfX = (w, a) => (Math.abs(Math.cos(a)) * (w - PILL_H)) / 2 + PILL_H / 2

// widths: optional array of measured widths (card units), else PILLS' own.
// nudge: a tiny perturbation (search only), to test the pile is robust.
export function createPillWorld(Matter, { seed = SEED, widths, nudge = 0, params } = {}) {
  const P = { ...PARAMS, ...params }
  const { Engine, Bodies, Composite, Body, Sleeping } = Matter
  const rnd = lcg(seed)
  const engine = Engine.create({
    enableSleeping: true,
    positionIterations: 12,
    velocityIterations: 10,
    constraintIterations: 4,
  })
  engine.gravity.y = 1
  engine.gravity.scale = P.gravity

  // the floor grips; the side walls are slick, so a pill can't stand on its end
  // against one (set after creation: matter-js resets a static body's friction)
  const fixed = (x, y, w, h, friction) => {
    const b = Bodies.rectangle(x, y, w, h, { isStatic: true })
    b.friction = friction
    b.frictionStatic = friction
    b.restitution = 0.2
    return b
  }
  const floor = fixed(W / 2, H - INSET + 200, W * 3, 400, P.floorFriction)
  Composite.add(engine.world, [
    floor,
    fixed(INSET - 200, H / 2, 400, H * 6, P.wallFriction),
    fixed(W - INSET + 200, H / 2, 400, H * 6, P.wallFriction),
  ])

  // each pill: when it is dropped (a stagger of 90-160 ms), its tilt, its spin
  // and a few places across the card it could enter at. It enters just above
  // the top edge, already falling at v0, at the first of its places that is
  // clear of every pill already in (if none is, a step later).
  const plan = PILLS.map(([label, color, w0], i) => {
    const w = widths?.[i] ?? w0
    const gap = i ? P.stagger[0] + rnd() * (P.stagger[1] - P.stagger[0]) : 0
    const a = (rnd() - 0.5) * 2 * P.tilt
    const spin = (rnd() - 0.5) * 2 * P.spin
    const room = W - 2 * INSET - 2 * halfX(w, a) - 8
    const xs = [0, 1, 2, 3, 4, 5].map(() => W / 2 + (rnd() - 0.5) * room + nudge * (i % 2 ? 1 : -1))
    return { label, color, w, a, spin, gap, xs }
  })
  let T = 0
  plan.forEach((p) => {
    T += p.gap
    p.at = Math.round(T / STEP_MS)
  })
  const bodies = plan.map((p) =>
    Bodies.rectangle(p.xs[0], -H, p.w, PILL_H, {
      chamfer: { radius: PILL_H / 2 - 0.5, quality: 14 },
      restitution: P.restitution,
      friction: P.friction,
      frictionStatic: P.frictionStatic,
      frictionAir: P.frictionAir,
      // bigger pills a touch denser too
      density: P.density * (0.9 + (p.w / 422) * 0.2),
      angle: p.a,
      sleepThreshold: P.sleep,
      slop: 0.02,
    }),
  )
  if (P.inertia !== 1) bodies.forEach((b) => Body.setInertia(b, b.inertia * P.inertia))
  const inWorld = bodies.map(() => false)

  const clear = (x, w, a) => {
    const hx = halfX(w, a) + 8
    const hy = halfY(w, a)
    const y = -hy - 2
    return bodies.every(
      (b, j) =>
        !inWorld[j] ||
        b.bounds.max.x < x - hx ||
        b.bounds.min.x > x + hx ||
        b.bounds.max.y < y - hy - 8 ||
        b.bounds.min.y > y + hy + 8,
    )
  }
  const enter = (n) => {
    plan.forEach((p, i) => {
      if (inWorld[i] || n < p.at) return
      const x = p.xs.find((x) => clear(x, p.w, p.a))
      if (x === undefined) return // try again next step
      const b = bodies[i]
      Body.setPosition(b, { x, y: -halfY(p.w, p.a) - 2 })
      Composite.add(engine.world, b)
      Body.setVelocity(b, { x: 0, y: P.v0 })
      Body.setAngularVelocity(b, p.spin)
      inWorld[i] = true
      p.x = x
    })
  }
  // rolling resistance: a pill touching something loses a little spin each
  // step, so the round little ones don't rock on forever
  const roll = () => {
    if (!P.roll) return
    const touching = new Set()
    for (const pair of engine.pairs.list) {
      if (!pair.isActive) continue
      touching.add(pair.bodyA.id)
      touching.add(pair.bodyB.id)
    }
    bodies.forEach((b) => {
      if (!b.isSleeping && touching.has(b.id)) Body.setAngularVelocity(b, b.angularVelocity * (1 - P.roll))
    })
  }

  let n = 0
  let floorOn = true
  return {
    plan,
    bodies,
    engine,
    steps: () => n,
    // one fixed 60 Hz step
    step() {
      enter(n)
      // substeps keep fast stacked impacts from sinking into each other
      for (let j = 0; j < P.substeps; j++) Engine.update(engine, STEP_MS / P.substeps)
      roll()
      n++
    },
    settled: () => inWorld.every(Boolean) && bodies.every((b) => b.isSleeping),
    // the hold is over: the floor goes and they fall out of the card
    drop() {
      if (!floorOn) return
      floorOn = false
      Composite.remove(engine.world, floor)
      bodies.forEach((b) => Sleeping.set(b, false))
    },
    // every pill has left through the bottom edge
    gone: () => bodies.every((b) => b.bounds.min.y > H + 10),
    // the highest pill's top edge, card units
    highest: () => Math.min(...bodies.map((b) => b.bounds.min.y)),
    state: (i) => [bodies[i].position.x, bodies[i].position.y, bodies[i].angle],
  }
}

const normAngle = (a) => {
  a %= 2 * Math.PI
  if (a > Math.PI) a -= 2 * Math.PI
  if (a < -Math.PI) a += 2 * Math.PI
  return a
}
// how far a capsule is from level (it looks the same turned 180 deg)
export const tiltOf = (a) => {
  const t = Math.abs(normAngle(a))
  return Math.min(t, Math.PI - t)
}

// is a settled pile good: every pill inside the card, readable, not too high
export function goodPile(world) {
  return world.bodies.every(
    (b) =>
      b.bounds.min.x > INSET - 4 &&
      b.bounds.max.x < W - INSET + 4 &&
      b.bounds.min.y > H * 0.3 &&
      tiltOf(b.angle) < 0.95,
  )
}

// Bake one cycle of real physics, a few steps at a time (a generator: the
// caller runs it across frames so nothing janks). The pills are dropped and
// settle; if the pile is good they hold for `hold` steps, then the floor goes
// and they fall out (a bad pile, only possible if a browser's maths drifts,
// tries the next seed). Result: { seed, frames (one Float32Array per 60 Hz
// step: x, y, drawn angle per pill), count, still (the step the pile looks
// still), drop, out (the step the last pill is in the bottom 15 %) }. The
// drawn angle adds a half turn to any pill that would land upside down (a
// capsule looks the same turned 180 deg), so every word lands the right way up.
export function* bakeCycle(Matter, { widths, hold = 72, seeds = SEEDS, chunk = 12 } = {}) {
  const n = PILLS.length
  let best = null
  for (const seed of seeds) {
    const world = createPillWorld(Matter, { seed, widths })
    const raw = []
    let still = 0
    let drop = -1
    let out = 0
    for (let k = 0; k < 1100; k++) {
      if (k === drop) world.drop()
      world.step()
      const f = new Float32Array(n * 3)
      world.bodies.forEach((b, i) => {
        f[i * 3] = b.position.x
        f[i * 3 + 1] = b.position.y
        f[i * 3 + 2] = b.angle
      })
      raw.push(f)
      if (drop < 0) {
        // still = the last step anything visibly moved (a 0.15 unit / 0.001 rad nudge)
        const prev = raw[k - 1]
        if (
          prev &&
          world.bodies.some(
            (b, i) =>
              Math.abs(b.position.x - prev[i * 3]) + Math.abs(b.position.y - prev[i * 3 + 1]) > 0.15 ||
              Math.abs(b.angle - prev[i * 3 + 2]) > 0.001,
          )
        )
          still = k
        if (world.settled() || k > 480) {
          if (!goodPile(world) && seed !== seeds[seeds.length - 1]) break
          drop = Math.max(k + 1, still + hold)
        }
      } else if (k > drop) {
        if (!out && world.highest() > H * 0.85) out = k
        if (world.gone()) {
          best = { seed, raw, still, drop, out: out || k }
          break
        }
      }
      if (k % chunk === chunk - 1) yield
    }
    if (!best && seed === seeds[seeds.length - 1] && drop > 0) {
      best = { seed, raw, still, drop, out: out || raw.length - 1 }
    }
    if (best) break
  }
  // each pill's half turn, from where it lay in the pile (the frame before the drop)
  const rest = best.raw[best.drop - 1]
  const flip = PILLS.map((_, i) => -Math.round(rest[i * 3 + 2] / Math.PI) * Math.PI)
  best.raw.forEach((f) => {
    for (let i = 0; i < n; i++) f[i * 3 + 2] += flip[i]
  })
  return {
    seed: best.seed,
    frames: best.raw,
    count: best.raw.length,
    still: best.still,
    drop: best.drop,
    out: best.out,
  }
}
