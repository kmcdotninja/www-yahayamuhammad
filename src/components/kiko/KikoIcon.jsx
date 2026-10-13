import { useRef } from 'react'
import './KikoIcon.css'
import { bezier, track, useLoop } from './motion.js'

// Kiko's app icon (public/icons/icon-512.png in the Kiko app: #0b0c0d, Kiko
// placed exactly as there), with Kiko as its own layer doing Kiko's backflip
// every 3.6 s: a small crouch, a jump with a slight stretch, the 360 at the
// top, a soft landing and one settle. Clipped to the icon's rounded square.
// Reduced motion: the still icon.
//
// Props: ratio (the card's CSS aspect-ratio, default '1 / 1'),
//        background (the card colour, default Kiko's milky cream), className.

const L = '/projects/kiko/layers/peek/'
const ICON_PERIOD = 3.6

const soft = bezier(0.3, 0.7, 0.4, 1)
const inOut = bezier(0.45, 0, 0.55, 1)
const up = bezier(0.2, 0.6, 0.35, 1) // decelerating to the top
const down = bezier(0.55, 0, 0.8, 0.45) // gravity back down
const spin = bezier(0.42, 0, 0.3, 1)

const F = 1.7 // the flip starts here; before it Kiko rests
const H = 19 // jump height, % of the layer (~17% of the icon)
const jy = track([
  [F + 0.16, 0],
  [F + 0.2, 0.6, inOut],
  [F + 0.6, -H, up],
  [F + 0.94, 0, down],
  [F + 1.04, 0.8, soft],
  [F + 1.2, 0, inOut],
])
const rot = track([
  [F + 0.24, 0],
  [F + 0.9, -360, spin],
])
const sx = track([
  [F, 1],
  [F + 0.16, 1.04, soft],
  [F + 0.28, 0.97, inOut],
  [F + 0.48, 1, inOut],
  [F + 0.94, 1],
  [F + 1.04, 1.045, soft],
  [F + 1.2, 0.985, inOut],
  [F + 1.38, 1, inOut],
])
const sy = track([
  [F, 1],
  [F + 0.16, 0.94, soft],
  [F + 0.28, 1.04, inOut],
  [F + 0.48, 1, inOut],
  [F + 0.94, 1],
  [F + 1.04, 0.94, soft],
  [F + 1.2, 1.015, inOut],
  [F + 1.38, 1, inOut],
])

// at rest Kiko breathes once (buddy.css bBreathe: .992 1.014)
const breath = (t) => (t < F ? (1 - Math.cos((2 * Math.PI * t) / F)) / 2 : 0)

function iconFrame(t) {
  const b = breath(t)
  return { y: jy(t), rot: rot(t) % 360, sx: sx(t) - 0.008 * b, sy: sy(t) + 0.014 * b, face: t > F - 0.02 && t < F + 1.22 ? 1 : 0 }
}

export default function KikoIcon({ ratio = '1 / 1', background, className = '' }) {
  const root = useRef(null)
  const jump = useRef(null)
  const squash = useRef(null)
  const faces = useRef([])
  const last = useRef(-1)

  const draw = (t) => {
    const f = iconFrame(t)
    jump.current.style.transform = `translateY(${f.y.toFixed(3)}%) rotate(${f.rot.toFixed(2)}deg)`
    squash.current.style.transform = `scale(${f.sx.toFixed(4)}, ${f.sy.toFixed(4)})`
    if (f.face !== last.current) {
      faces.current.forEach((el, i) => {
        el.style.opacity = i === f.face ? '1' : '0'
      })
      last.current = f.face
    }
  }

  const { near } = useLoop(root, ICON_PERIOD, draw, 0)

  return (
    <div
      ref={root}
      className={`kic ${className}`}
      style={{ aspectRatio: ratio, ...(background ? { background } : null) }}
      role="img"
      aria-label="Kiko's app icon: Kiko does a backflip"
    >
      <div className="kic__icon">
        <div className="kic__jump" ref={jump}>
          <div className="kic__squash" ref={squash}>
            {['happy', 'exicited'].map((f, i) => (
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
      </div>
    </div>
  )
}
