import { useEffect, useRef, useState } from 'react'
import './Hero.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import HeroStickers from './HeroStickers.jsx'
import StickerInput from './StickerInput.jsx'
import { useStickerPhysics } from '../hooks/useStickerPhysics.js'

// On phones (≤760px — the same cutoff the headline font uses) the display is
// so large that each word wants its own line, so we author the breaks
// explicitly. Tablets (768px+) have room for the tighter three-line grouping.
const PHONE_LINES = [
  'Design, build',
  'and ship',
  'products from',
  'canvas to code',
]
const TABLET_LINES = [
  'Design, build',
  'and ship products',
  'from canvas to code',
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
  // sticker sizes in HeroStickers.css. spawnText adds a typed text box.
  const sectionRef = useRef(null)
  const { spawnText } = useStickerPhysics(sectionRef)

  return (
    <section className="intro" ref={sectionRef}>
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & Engineer
      </h1>

      {/* Physics stickers — fall in and bounce on load, grab-and-throwable. The
          input pill is itself a tossable sticker; typing drops a text box in. */}
      <HeroStickers />
      <StickerInput onSubmit={spawnText} />

      <RevealHeadline className="intro__big" lines={HEADLINE_LINES} />

      <div className="intro__about" data-reveal>
        <p className="intro__bio" data-sticker-keepout>
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
