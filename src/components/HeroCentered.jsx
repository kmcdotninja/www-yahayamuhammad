import { useRef } from 'react'
import './HeroCentered.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useDraggableSticker } from '../hooks/useDraggableSticker.js'
import { useStickerScatter } from '../hooks/useStickerScatter.js'

// Authored line breaks, not wrapping. Broken on phrase boundaries so the
// closing phrase lands whole on its own line.
const HEADLINE_LINES = [
  'Design, build',
  'and ship products',
  'from canvas to code',
]

// The hero's sticker collage. `mod` selects the position rule in the CSS and
// `id` keys its dragged position in localStorage, so adding one here is a
// two-step change: append a row, add a .introC__sticker--<mod> block.
// width/height are the SVGs' true intrinsic sizes so the box is reserved at the
// right ratio before they decode.
const STICKERS = [
  { id: 'pin', mod: 'pin', src: '/playground/stickers/4.svg', w: 333, h: 388 },
  { id: 'brain', mod: 'brain', src: '/playground/stickers/8.svg', w: 277, h: 242 },
  { id: 'designer', mod: 'designer', src: '/playground/stickers/1.svg', w: 960, h: 792 },
  { id: 'portfolio', mod: 'portfolio', src: '/playground/stickers/7.svg', w: 1894, h: 823 },
  { id: 'book', mod: 'book', src: '/playground/stickers/5.svg', w: 433, h: 360 },
]

// One sticker. Kept as its own component so each can own the ref its drag hook
// needs — calling the hook inside a .map() would break the rules of hooks.
function Sticker({ mod, src, w, h }) {
  const ref = useRef(null)
  useDraggableSticker(ref)
  return (
    <img
      ref={ref}
      className={`introC__sticker introC__sticker--${mod}`}
      src={src}
      alt=""
      aria-hidden="true"
      width={w}
      height={h}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  )
}

export default function HeroCentered() {
  const { play, SOUNDS } = useSnd()

  // Every load deals the stickers a fresh arrangement; they stay drag-able from
  // wherever they land.
  const sectionRef = useRef(null)
  useStickerScatter(sectionRef)

  return (
    <section className="introC" ref={sectionRef}>
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Design Engineer designing and shipping products from canvas to code
      </h1>

      {/* Casual stickers from the same SVG set the playground StickerStack uses.
          Decorative only (aria-hidden), width-gated so they never crowd the
          headline on tablet, and every one is drag-positionable — see
          useDraggableSticker. Positions live in HeroCentered.css. */}
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
