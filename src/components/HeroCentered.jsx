import { useRef } from 'react'
import './HeroCentered.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import HeroStickers from './HeroStickers.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useStickerPhysics } from '../hooks/useStickerPhysics.js'

// Authored line breaks, not wrapping. Broken on phrase boundaries so the
// closing phrase lands whole on its own line.
const HEADLINE_LINES = [
  'Design, build',
  'and ship products',
  'from canvas to code',
]

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

      {/* Physics stickers — they fall in and bounce on load and are
          grab-and-throwable (useStickerPhysics). data-sticker-keepout marks the
          text they must rest above rather than cover. */}
      <HeroStickers />

      <RevealHeadline className="introC__big" lines={HEADLINE_LINES} />

      <div className="introC__about">
        <p className="introC__bio" data-sticker-keepout>
          Currently designing at Kutuby to make Islamic studies more fun and engaging for kids.
        </p>
        <a
          href="#work"
          className="introC__scroll"
          data-sticker-keepout
          onClick={() => play(SOUNDS.BUTTON)}
        >
          ↓ SCROLL FOR MORE
        </a>
      </div>
    </section>
  )
}
