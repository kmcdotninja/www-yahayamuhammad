import { useRef } from 'react'
import './HeroCentered.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useStickerPhysics } from '../hooks/useStickerPhysics.js'

// Authored line breaks, not wrapping. Broken on phrase boundaries so the
// closing phrase lands whole on its own line.
const HEADLINE_LINES = [
  'Design, build',
  'and ship products',
  'from canvas to code',
]

// The hero's sticker collage (a selection from /public/playground/stickers).
// `mod` selects the CSS rule that sizes each one (its --pin/--brain/… width);
// the physics engine owns placement, so `mod` is now purely the size hook.
// Adding one is: drop the SVG in the folder, append a row here, add a
// .introC__sticker--<mod> width block. w/h are the SVGs' true intrinsic sizes
// so each box is reserved at the right ratio before the art decodes.
const STICKERS = [
  { id: 'pin', mod: 'pin', src: '/playground/stickers/4.svg', w: 333, h: 388 },
  { id: 'brain', mod: 'brain', src: '/playground/stickers/8.svg', w: 277, h: 242 },
  { id: 'designer', mod: 'designer', src: '/playground/stickers/1.svg', w: 960, h: 792 },
  { id: 'kudi', mod: 'kudi', src: '/playground/stickers/6.svg', w: 725, h: 525 },
  { id: 'portfolio', mod: 'portfolio', src: '/playground/stickers/7.svg', w: 1894, h: 823 },
  { id: 'book', mod: 'book', src: '/playground/stickers/5.svg', w: 433, h: 360 },
  // The face self-rights instead of tumbling — a portrait resting upside-down
  // reads as broken, where a wordmark at an angle reads as a slapped sticker.
  // Rastered PNG, not the 561KB traced SVG: at ~148px it's identical but
  // rasterizes instantly, so it never stutters the fall (the SVG is kept too).
  { id: 'face', mod: 'face', src: '/playground/stickers/Yahaya.png', w: 320, h: 485, upright: true },
]

function Sticker({ mod, src, w, h, upright }) {
  return (
    <img
      className={`introC__sticker introC__sticker--${mod}`}
      src={src}
      alt=""
      aria-hidden="true"
      width={w}
      height={h}
      loading="eager"
      decoding="async"
      draggable={false}
      data-upright={upright ? '' : undefined}
    />
  )
}

export default function HeroCentered() {
  const { play, SOUNDS } = useSnd()

  // The stickers drop in from above on every load, bounce off the section's
  // four walls, and can be grabbed and flung.
  const sectionRef = useRef(null)
  useStickerPhysics(sectionRef)

  return (
    <section className="introC" ref={sectionRef}>
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & Engineer
      </h1>

      {/* Physics stickers from the same SVG set the playground StickerStack
          uses. Decorative only (aria-hidden), width-gated so they never crowd
          the headline on tablet. They fall in and bounce on load and are
          grab-and-throwable — see useStickerPhysics. */}
      {STICKERS.map((sticker) => (
        <Sticker key={sticker.id} {...sticker} />
      ))}

      <RevealHeadline className="introC__big" lines={HEADLINE_LINES} />

      <div className="introC__about">
        <p className="introC__bio">
          Currently designing at Kutuby to make Islamic studies more fun and engaging for kids.
        </p>
        <a
          href="#work"
          className="introC__scroll"
          onClick={() => play(SOUNDS.BUTTON)}
        >
          ↓ SCROLL FOR MORE
        </a>
      </div>
    </section>
  )
}
