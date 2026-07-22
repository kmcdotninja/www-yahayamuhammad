import { useRef } from 'react'
import './HeroCentered.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useDraggableSticker } from '../hooks/useDraggableSticker.js'

// Authored line breaks, not wrapping. Broken on phrase boundaries so the
// closing phrase lands whole on its own line.
const HEADLINE_LINES = [
  'Design, build',
  'and ship products',
  'from canvas to code',
]

export default function HeroCentered() {
  const { play, SOUNDS } = useSnd()

  // Both stickers can be dragged around the hero. Where you drop one is kept in
  // localStorage; double-click puts it back where the stylesheet had it.
  const pinRef = useRef(null)
  const brainRef = useRef(null)
  useDraggableSticker(pinRef, 'pin')
  useDraggableSticker(brainRef, 'brain')

  return (
    <section className="introC">
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Design Engineer designing and shipping products from canvas to code
      </h1>

      {/* Casual stickers anchored to the headline — same SVG set the
          playground StickerStack uses (4 = thumbtack pinning the first line,
          8 = brain trailing the end of the last line). Decorative only
          (aria-hidden) and width-gated so they never crowd the headline on
          tablet. The CSS positions are tuned to the authored line breaks above,
          but both are drag-positionable (see useDraggableSticker). */}
      <img
        ref={pinRef}
        className="introC__sticker introC__sticker--pin"
        src="/playground/stickers/4.svg"
        alt=""
        aria-hidden="true"
        width="220"
        height="220"
        loading="eager"
        decoding="async"
        draggable={false}
      />
      <img
        ref={brainRef}
        className="introC__sticker introC__sticker--brain"
        src="/playground/stickers/8.svg"
        alt=""
        aria-hidden="true"
        width="485"
        height="340"
        loading="eager"
        decoding="async"
        draggable={false}
      />

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
