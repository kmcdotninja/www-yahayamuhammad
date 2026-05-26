import './Hero.css'
import Portion from './Portion.jsx'
import TopNav from './TopNav.jsx'
import { useSnd } from '../hooks/useSnd.js'

export default function Hero() {
  const { play, SOUNDS } = useSnd()

  return (
    <section className="intro">
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & UX Designer
      </h1>
      <p className="intro__big" data-reveal aria-hidden="true">
        Product designer
        <br />
        crafting brands, products
        <br />
        and websites
      </p>

      <div className="intro__about" data-reveal>
        <Portion />
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
