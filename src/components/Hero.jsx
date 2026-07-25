import { useEffect, useRef, useState } from 'react'
import './Hero.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import HeroStickers from './HeroStickers.jsx'
import { useSnd } from '../hooks/useSnd.js'
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
  const { play, SOUNDS } = useSnd()

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
  // sticker sizes in HeroStickers.css.
  const sectionRef = useRef(null)
  useStickerPhysics(sectionRef)

  return (
    <section className="intro" ref={sectionRef}>
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & Engineer
      </h1>

      {/* Physics stickers — fall in and bounce on load, grab-and-throwable.
          data-sticker-keepout marks the text they rest above rather than cover. */}
      <HeroStickers />

      <RevealHeadline className="intro__big" lines={HEADLINE_LINES} />

      <div className="intro__about" data-reveal>
        <p className="intro__bio" data-sticker-keepout>
          Currently designing at Kutuby to make Islamic studies more fun and engaging for kids.
        </p>
        <a
          href="#work"
          className="intro__scroll"
          data-sticker-keepout
          onClick={() => play(SOUNDS.BUTTON)}
        >
          ↓ SCROLL FOR MORE
        </a>
      </div>
    </section>
  )
}
