import { useEffect, useState } from 'react'
import './Hero.css'
import TopNav from './TopNav.jsx'
import RevealHeadline from './RevealHeadline.jsx'
import { useSnd } from '../hooks/useSnd.js'

// On phones (≤760px — the same cutoff the headline font uses) the display is
// so large that each word wants its own line, so we author the breaks
// explicitly. Tablets (768px+) have room for the tighter three-line grouping.
const PHONE_LINES = [
  'Product',
  'designer',
  'building',
  'brands, apps',
  'and websites',
]
const TABLET_LINES = [
  'Product designer',
  'building brands, apps',
  'and websites',
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

  return (
    <section className="intro">
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & UX Designer
      </h1>
      <RevealHeadline className="intro__big" lines={HEADLINE_LINES} />

      <div className="intro__about" data-reveal>
        <p className="intro__bio">
          Currently designing at Kutuby to make Islamic studies more fun and engaging for kids.
        </p>
        <a
          href="#work"
          className="intro__scroll"
          onClick={() => play(SOUNDS.BUTTON)}
        >
          ↓ SCROLL FOR MORE
        </a>
      </div>
    </section>
  )
}
