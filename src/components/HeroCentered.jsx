import { useEffect, useRef } from 'react'
import './HeroCentered.css'
import Portion from './Portion.jsx'
import TopNav from './TopNav.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

const PARALLAX_RATE = 0.45

export default function HeroCentered() {
  const { play, SOUNDS } = useSnd()
  const portionRef = useRef(null)
  const reduced = useReducedMotion()

  // Parallax: 3D model scrolls slower than the page so it lingers in view
  // through the hero section instead of shooting off the top edge.
  useEffect(() => {
    if (reduced) return
    const el = portionRef.current
    if (!el) return
    let raf = 0
    let pending = false
    const update = () => {
      pending = false
      const y = window.scrollY * PARALLAX_RATE
      // Baseline must match the CSS resting transform (`-8%`) so the
      // first paint and the JS-driven update line up to the same spot.
      el.style.transform = `translate(-50%, calc(-8% + ${y}px))`
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <section className="introC">
      <TopNav />

      <h1 className="introC__big" data-reveal>
        Product designer
        <br />
        crafting brands, products
        <br />
        and websites
      </h1>

      <div ref={portionRef} className="introC__portion-wrap" data-reveal>
        <Portion />
      </div>

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
