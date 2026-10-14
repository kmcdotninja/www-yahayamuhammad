import { useEffect, useRef, useState } from 'react'
import './Hero.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import HeroStickers from './HeroStickers.jsx'
import { useStickerPhysics } from '../hooks/useStickerPhysics.js'

// On phones (≤760px — the same cutoff the headline font uses) the display is
// so large that each word wants its own line, so we author the breaks
// explicitly. Tablets (768px+) have room for the tighter three-line grouping.
// Phones get shorter lines than tablets: the display is so much larger relative
// to the rail there that a tablet-length line would run straight past it. The
// tightest fit is "things for fun" at 390px, which leaves ~25px of the rail.
const PHONE_LINES = [
  'A product',
  'designer who',
  'builds and makes',
  'things for fun',
]
const TABLET_LINES = [
  'A product designer',
  'who builds and makes',
  'things for fun',
]

const PHONE_MQ = '(max-width: 760px)'

export default function Hero() {
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PHONE_MQ).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(PHONE_MQ)
    const onChange = () => setIsPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const HEADLINE_LINES = isPhone ? PHONE_LINES : TABLET_LINES

  // Same drop-in physics as the desktop hero, tuned smaller via the mobile
  // sticker sizes in HeroStickers.css. No typed-sticker input on mobile.
  const sectionRef = useRef(null)
  useStickerPhysics(sectionRef)

  return (
    <section className="intro" ref={sectionRef}>
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & Engineer
      </h1>

      {/* Physics stickers — fall in and bounce on load, grab-and-throwable.
          (The typed-sticker input pill is desktop-only.) */}
      <HeroStickers />

      <RevealHeadline className="intro__big" lines={HEADLINE_LINES} />

      {/* No data-sticker-keepout here: the bio sits up under the headline on
          mobile, so stickers fall past it and seat on the bottom line below. */}
      <div className="intro__about" data-reveal>
        <p className="intro__bio">
          Currently designing at Kutuby to make Islamic studies more fun and engaging for kids.
        </p>
        {/* Scroll cue hidden for now.
        <a
          href="#work"
          className="intro__scroll"
          data-sticker-keepout
          onClick={() => play(SOUNDS.BUTTON)}
        >
          ↓ SCROLL FOR MORE
        </a>
        */}
      </div>
    </section>
  )
}
