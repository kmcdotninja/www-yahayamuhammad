import './Hero.css'
import Portion from './Portion.jsx'
import TopNav from './TopNav.jsx'
import { useSnd } from '../hooks/useSnd.js'

export default function Hero() {
  const { play, SOUNDS } = useSnd()

  return (
    <section className="intro">
      <TopNav />

      <h1 className="intro__big" data-reveal>
        a software designer
        <br />
        passionate about artificial intelligence and improving
        <br />
        people&rsquo;s lives through design
      </h1>

      <div className="intro__about" data-reveal>
        <Portion />
        <p className="intro__bio">
        Currently designing a product at Kutuby to make Islamic studies more fun and engaging for kids.
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
