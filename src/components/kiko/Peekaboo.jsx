import { useEffect, useId, useRef } from 'react'
import './Peekaboo.css'
import { bezier, spring, track, seg, lerp, useLoop } from './motion.js'
import { prefersReducedMotion } from '../../hooks/useOnScreen.js'
import { useKikoSound, setKikoSound, playKiko, pauseKikoFor } from './kikoSound.js'

// Peekaboo -> logotype. Kiko (the real character, rendered from Kiko's Brand
// page: public/projects/kiko/layers/peek/) peeks up from the bottom edge, ducks,
// pops up with a happy "boo", then shrinks into the Kiko lockup while the
// "kiko" wordmark rises in letter by letter. Loops every 6 s while on screen;
// reduced motion shows the finished lockup.
//
// The card is 1000 x 1250 card units (4:5). The lockup reproduces the Brand
// page's (`.kb-lock`): Kiko's box = lu wide, 1.1404 lu tall; gap 0.106 lu; word
// SF Pro Rounded Heavy at 1.121 lu, -0.05em, line-height 0.8, its box bottom
// 0.045 lu above Kiko's bottom.
//
// Sound (opt-in, off on every load): a small toggle in the corner; when on,
// Kiko sings "Kiko!" (the app splash's sonic logo) each loop as it slides into
// the lockup, the same moment the splash plays it (kikoSound.js).
//
// Props: light (cream card, near-black word), className.

const L = '/projects/kiko/layers/peek/'
const FACES = ['shy', 'laugh', 'happy']

// geometry (card units)
const LU = 260
const KH = LU * 1.1404 // Kiko's box height
const LOCK_W = LU + 0.106 * LU + 1.973 * LU
const KX = (1000 - LOCK_W) / 2 // Kiko's box left
const KY = (1250 - KH) / 2 // Kiko's box top
const B0 = [KX + LU / 2, KY + KH] // Kiko's bottom centre in the lockup
const S = 2.7 // big Kiko, during the peekaboo
const BIG_H = KH * S
const Y_HIDE = 1250 + 12 + BIG_H // bottom-centre y when just under the edge
const Y_PEEK = 1250 + BIG_H * 0.15 // top 85% showing: fronds, eyes, smile
const Y_BOO = 1250 / 2 + BIG_H / 2 + 8 // centred

const PEEK_PERIOD = 6.0
const STATIC_T = 5.0

// curves
const outExpo = bezier(0.16, 1, 0.3, 1)
const inOut = bezier(0.45, 0, 0.55, 1)
const easeIn = bezier(0.5, 0, 0.75, 0)
const shrinkEase = bezier(0.5, 0, 0.2, 1.05)
const pop = spring(0.74, 1.15)
const letter = spring(0.8, 1.05)
const soft = bezier(0.3, 0.7, 0.4, 1)

// the peek: up (ease-out), a curious lean, a little lift, then down (ease-in)
const peekY = track([
  [0.25, Y_HIDE],
  [1.05, Y_PEEK, outExpo],
  [1.82, Y_PEEK],
  [1.96, Y_PEEK - 14, soft],
  [2.32, Y_HIDE, easeIn],
])
const peekRot = track([
  [1.1, 0],
  [1.5, -4, inOut],
  [1.8, -4],
  [2.2, 1, inOut],
])
// the boo: a sprung rise; stretched a touch going up, one soft settle at the top
const POP_A = 2.5
const POP_D = 0.78
const sx = track([
  [2.5, 1],
  [2.62, 0.97, soft],
  [2.86, 1, inOut],
  [3.0, 1],
  [3.16, 1.025, inOut],
  [3.4, 1, inOut],
])
const sy = track([
  [2.5, 1],
  [2.62, 1.035, soft],
  [2.86, 1, inOut],
  [3.0, 1],
  [3.16, 0.97, inOut],
  [3.4, 1, inOut],
])
const SHRINK = [3.5, 4.45]
const SOUND_T = SHRINK[0] // the splash sings as Kiko starts sliding into the lockup
const WORD_A = 3.98
const STAGGER = 0.075
const LETTER_D = 0.62
const EXIT = [5.45, 5.85]

function peekFrame(t) {
  let y
  let s = S
  let x = 500
  let rot = 0
  if (t < POP_A) {
    y = peekY(t)
    rot = peekRot(t)
  } else if (t < SHRINK[0]) {
    y = lerp(Y_HIDE, Y_BOO, pop(seg(t, POP_A, POP_A + POP_D)))
  } else {
    const p = shrinkEase(seg(t, SHRINK[0], SHRINK[1]))
    y = lerp(Y_BOO, B0[1], p)
    x = lerp(500, B0[0], p)
    s = lerp(S, 1, p)
  }
  const face = t < 2.4 ? 0 : t < 3.82 ? 1 : 2
  const letters = [0, 1, 2, 3].map((i) => {
    const p = seg(t, WORD_A + i * STAGGER, WORD_A + i * STAGGER + LETTER_D)
    return { y: 1 - letter(p), o: Math.min(1, p * 3.2) }
  })
  const e = seg(t, EXIT[0], EXIT[1])
  const ex = easeIn(e)
  return {
    kiko: { x: x - B0[0], y: y - B0[1], s, rot, sx: sx(t), sy: sy(t), face },
    letters,
    exit: { o: 1 - inOut(e), y: ex * 18, s: 1 - ex * 0.03 },
  }
}

const u = (n) => `calc(var(--c) * ${n.toFixed(2)})`

export default function Peekaboo({ light = false, className = '' }) {
  const root = useRef(null)
  const move = useRef(null)
  const body = useRef(null)
  const faces = useRef([])
  const chars = useRef([])
  const group = useRef(null)
  const lastFace = useRef(-1)
  const lastT = useRef(-1)
  const id = useId()
  const soundOn = useKikoSound(id)

  const draw = (t) => {
    const prev = lastT.current
    lastT.current = t
    if (prev >= 0 && prev < SOUND_T && t >= SOUND_T && t - prev < 0.5) playKiko(id)
    const f = peekFrame(t)
    const k = f.kiko
    move.current.style.transform = `translate(${u(k.x)}, ${u(k.y)}) scale(${k.s.toFixed(4)})`
    body.current.style.transform = `rotate(${k.rot.toFixed(3)}deg) scale(${k.sx.toFixed(4)}, ${k.sy.toFixed(4)})`
    if (k.face !== lastFace.current) {
      faces.current.forEach((el, i) => {
        el.style.opacity = i === k.face ? '1' : '0'
      })
      lastFace.current = k.face
    }
    f.letters.forEach((l, i) => {
      const el = chars.current[i]
      el.style.transform = `translateY(${(l.y * 92).toFixed(2)}%)`
      el.style.opacity = l.o.toFixed(3)
    })
    group.current.style.opacity = f.exit.o.toFixed(3)
    group.current.style.transform = `translateY(${u(f.exit.y)}) scale(${f.exit.s.toFixed(4)})`
  }

  const { near, on } = useLoop(root, PEEK_PERIOD, draw, STATIC_T)

  // off screen: the sound stops (the toggle stays as it was)
  useEffect(() => {
    if (!on) pauseKikoFor(id)
  }, [on, id])

  const toggle = (e) => {
    e.stopPropagation()
    e.preventDefault()
    // reduced motion: the logo is already there, so it sings once right away
    setKikoSound(id, !soundOn, !soundOn && prefersReducedMotion())
  }
  const stop = (e) => e.stopPropagation()

  return (
    <div ref={root} className={`kpk${light ? ' kpk--light' : ''} ${className}`}>
      <div className="kpk__group" ref={group} role="img" aria-label="Kiko peeks up, says boo and becomes the Kiko logo">
        <div
          className="kpk__kiko"
          ref={move}
          style={{
            left: u(KX - 0.12727 * LU),
            top: u(KY - 0.12727 * LU),
            width: u(LU * 1.25455),
            height: u(LU * 1.39091),
          }}
        >
          <div className="kpk__body" ref={body}>
            {FACES.map((f, i) => (
              <img
                key={f}
                ref={(el) => {
                  faces.current[i] = el
                }}
                src={near ? `${L}kiko-${f}.webp` : undefined}
                alt=""
                width="1104"
                height="1224"
                decoding="async"
                draggable="false"
              />
            ))}
          </div>
        </div>
        <div
          className="kpk__word"
          aria-hidden="true"
          style={{ left: u(KX + LU * 1.106), top: u(KY + KH - 0.045 * LU - 0.8 * 1.121 * LU), fontSize: u(1.121 * LU) }}
        >
          {'kiko'.split('').map((c, i) => (
            <span
              key={i}
              className="kpk__ch"
              ref={(el) => {
                chars.current[i] = el
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={`kpk__sound${soundOn ? ' is-on' : ''}`}
        aria-pressed={soundOn}
        aria-label="Play Kiko's sound"
        title={soundOn ? 'Sound on' : 'Sound off'}
        onClick={toggle}
        onPointerDown={stop}
        onPointerEnter={stop}
        onPointerMove={stop}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
          {soundOn ? (
            <>
              <path d="M15.5 9a4 4 0 0 1 0 6" />
              <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
            </>
          ) : (
            <path d="m16 9.5 5 5m0-5-5 5" />
          )}
        </svg>
      </button>
    </div>
  )
}
