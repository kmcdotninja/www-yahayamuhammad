import { useEffect, useLayoutEffect, useRef } from 'react'
import './ChildCard.css'
import { prefersReducedMotion } from '../../hooks/useOnScreen.js'

// The child card: a milky cream card with a child's age and name and their own
// Kiko. Every 1.8 s Kiko hops and lands as the next child's Kiko (the real
// skins and faces, rendered from Kiko's Brand page; nothing redrawn), while the
// name and age roll up to the next child.
//
// No flicker by construction: each text line is a fixed-height clipped box
// holding two slots that are always mounted. On a swap the hidden slot gets the
// next text while parked below the clip, then both slide up together (old out
// the top, new in from below), letter by letter, transform only. React renders
// the structure once; the loop never re-renders it. One requestAnimationFrame
// clock fires each swap, the motion itself runs as Web Animations.

const IMG = '/projects/kiko/child/'
// [name, age, skin, face]: vibrant skins that read strongly on the cream
const KIDS = [
  ['Musa', 6, 'cyan', 'happy'],
  ['Aisha', 5, 'orange-blue', 'laugh'],
  ['Yusuf', 7, 'petrol', 'silly'],
  ['Maryam', 4, 'watermelon', 'love'],
  ['Ibrahim', 6, 'galaxy', 'love'],
  ['Fatima', 5, 'forest', 'exicited'],
  ['Zayd', 4, 'ember', 'laugh'],
  ['Khadija', 7, 'lagoon', 'happy'],
  ['Bilal', 5, 'tropical', 'silly'],
  ['Amina', 6, 'black', 'wink'],
]

const EVERY = 1800 // ms per child
const HOP = 640 // the hop
const SWAP = 300 // ms into the hop: at its top, Kiko becomes the next child's
const TEXT_AT = 250 // ms into the hop: the age line starts to roll
const NAME_LAG = 60 // the name follows the age by this much
const TEXT_MS = 380
const STAGGER = 16 // per letter (name) / per word (age)
// one ease-out for both: the leaving and arriving letter at each place move as
// one strip (old on top of new), so they never overlap
const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)'
const BELOW = 'translate3d(0, 100%, 0)'
const HOME = 'translate3d(0, 0, 0)'
const ABOVE = 'translate3d(0, -100%, 0)'

// Kiko's own hop (buddy.css bHop), made subtler: a crouch, a stretched rise, a
// squashed landing and one small settle, well damped. The squash scales from
// Kiko's base; the lift is a share of the layer's height.
const HOP_KEYS = [
  { transform: 'translate3d(0, 0, 0)', offset: 0, easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
  { transform: 'translate3d(0, 0.4%, 0)', offset: 0.15, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
  { transform: 'translate3d(0, -8.4%, 0)', offset: 0.47, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
  { transform: 'translate3d(0, -8.8%, 0)', offset: 0.56, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
  { transform: 'translate3d(0, 0, 0)', offset: 0.8 },
  { transform: 'translate3d(0, 0, 0)', offset: 1 },
]
const SQUASH_KEYS = [
  { transform: 'scale(1, 1)', offset: 0 },
  { transform: 'scale(1.04, 0.95)', offset: 0.15 },
  { transform: 'scale(0.97, 1.03)', offset: 0.42 },
  { transform: 'scale(1, 1)', offset: 0.62 },
  { transform: 'scale(1.035, 0.955)', offset: 0.8 },
  { transform: 'scale(0.992, 1.008)', offset: 0.91 },
  { transform: 'scale(1, 1)', offset: 1 },
]

const pieces = (line, i) => (line === 'name' ? [...KIDS[i][0]] : ['Age', '\u00a0' + KIDS[i][1]])

// fill a slot with one span per letter (name) or word (age), parked at `at`
function fill(slot, parts, at) {
  slot.textContent = ''
  for (const p of parts) {
    const s = document.createElement('span')
    s.className = 'kidc__bit'
    s.textContent = p
    s.style.transform = at
    slot.appendChild(s)
  }
}

function roll(slot, from, to, delay, easing, live) {
  ;[...slot.children].forEach((bit, k) => {
    const a = bit.animate([{ transform: from }, { transform: to }], {
      duration: TEXT_MS,
      delay: delay + k * STAGGER,
      easing,
      fill: 'both',
    })
    a.onfinish = () => {
      bit.style.transform = to
      live.delete(a)
      a.cancel()
    }
    live.add(a)
  })
}

export default function ChildCard({ className = '' }) {
  const root = useRef(null)
  const slots = useRef(null) // { age: [a, b], name: [a, b] }
  const imgs = useRef(null)
  const hop = useRef(null)
  const squash = useRef(null)

  // the first child, before the first paint (the slots are filled by hand so
  // React never owns, and never re-renders, the rolling text)
  useLayoutEffect(() => {
    const q = (sel) => [...root.current.querySelectorAll(sel)]
    slots.current = { age: q('.kidc__line--age .kidc__slot'), name: q('.kidc__line--name .kidc__slot') }
    imgs.current = q('.kidc__img')
    for (const line of ['age', 'name']) {
      const [a, b] = slots.current[line]
      fill(a, pieces(line, 0), HOME)
      fill(b, [], BELOW)
    }
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) {
      el?.classList.add('kidc--ready')
      return undefined
    }
    let dead = false
    let on = false
    let raf = 0
    let ready = false
    let next = 0 // when the next hop starts
    let swapAt = 0 // pending Kiko swap time (0 = none)
    let i = 0 // the child shown
    const front = { age: 0, name: 0 } // which slot is showing per line
    const live = new Set()

    const startHop = (now) => {
      const n = (i + 1) % KIDS.length
      for (const [ref, keys] of [[hop, HOP_KEYS], [squash, SQUASH_KEYS]]) {
        const a = ref.current.animate(keys, { duration: HOP, easing: 'linear' })
        live.add(a)
        a.onfinish = () => live.delete(a)
      }
      // the text rolls: both slots of each line move together
      for (const [line, at] of [['age', TEXT_AT], ['name', TEXT_AT + NAME_LAG]]) {
        const out = slots.current[line][front[line]]
        const inn = slots.current[line][1 - front[line]]
        fill(inn, pieces(line, n), BELOW)
        roll(out, HOME, ABOVE, at, EASE, live)
        roll(inn, BELOW, HOME, at, EASE, live)
        front[line] = 1 - front[line]
      }
      swapAt = now + SWAP
      i = n
    }

    const tick = (now) => {
      raf = 0
      if (dead || !on || !ready) return
      if (swapAt && now >= swapAt) {
        // at the top of the hop: the next child's Kiko, in one frame
        imgs.current.forEach((im, k) => im.classList.toggle('is-on', k === i))
        swapAt = 0
      }
      if (now >= next) {
        startHop(now)
        next = now + EVERY
      }
      raf = requestAnimationFrame(tick)
    }
    const run = () => {
      if (!raf && on && ready && !dead) {
        // first hop after a short rest; after a pause, never a burst of hops
        next = Math.max(next, performance.now() + 700)
        raf = requestAnimationFrame(tick)
      }
    }

    // fonts first (no swap flash), and every Kiko decoded (no blank frame at a swap)
    const fonts = document.fonts
      ? Promise.all([
          document.fonts.load('900 40px "SF Pro Rounded Kiko"'),
          document.fonts.load('700 20px "SF Pro Rounded Kiko"'),
        ]).then(() => document.fonts.ready)
      : Promise.resolve()
    const timeout = new Promise((r) => setTimeout(r, 3000))
    Promise.race([fonts, timeout])
      .then(() => {
        if (dead) return
        el.classList.add('kidc--ready')
        return Promise.all(imgs.current.map((im) => im.decode().catch(() => {})))
      })
      .then(() => {
        if (dead) return
        ready = true
        run()
      })

    // run only while on screen
    const io = new IntersectionObserver(
      ([e]) => {
        on = e.isIntersecting
        if (on) run()
      },
      { rootMargin: '80px 0px' },
    )
    io.observe(el)
    return () => {
      dead = true
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
      live.forEach((a) => a.cancel())
    }
  }, [])

  return (
    <div
      ref={root}
      className={`kidc ${className}`.trim()}
      role="img"
      aria-label="A child's card in Kiko: each child's age and name with their own Kiko, in their own colour"
    >
      <div className="kidc__text" aria-hidden="true">
        <div className="kidc__line kidc__line--age">
          <span className="kidc__slot" />
          <span className="kidc__slot" />
        </div>
        <div className="kidc__line kidc__line--name">
          <span className="kidc__slot" />
          <span className="kidc__slot" />
        </div>
      </div>
      <div className="kidc__kiko" ref={hop}>
        <div className="kidc__squash" ref={squash}>
          {KIDS.map(([n, , skin, face], k) => (
            <img
              key={n}
              className={`kidc__img${k === 0 ? ' is-on' : ''}`}
              src={`${IMG}kid-${skin}-${face}.webp`}
              alt=""
              width="900"
              height="1014"
              decoding="async"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
