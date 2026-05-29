import { lazy, Suspense, useEffect, useRef } from 'react'
import './HeroCentered.css'
import TopNav from './TopNav.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

const Portion = lazy(() => import('./Portion.jsx'))

const PARALLAX_RATE = 0.45

export default function HeroCentered() {
  const { play, SOUNDS } = useSnd()
  const portionRef = useRef(null)
  const reduced = useReducedMotion()

  // Parallax: 3D model scrolls slower than the page so it lingers in view
  // through the hero section. We share a single rAF and use a numeric
  // translate3d instead of `calc(...)` so the compositor (not the style
  // engine) handles the transform on each frame.
  useEffect(() => {
    if (reduced) return
    const el = portionRef.current
    if (!el) return

    // Match the CSS baseline (-50%, -8%). Pre-compute the static -8% as
    // pixels at mount + on resize so the per-frame write stays branchless.
    let baselineY = 0
    const recalcBaseline = () => {
      baselineY = -el.offsetHeight * 0.08
    }
    recalcBaseline()
    window.addEventListener('resize', recalcBaseline, { passive: true })

    let raf = 0
    let pending = false
    let lastY = -1
    const update = () => {
      pending = false
      const y = window.scrollY * PARALLAX_RATE
      if (y === lastY) return
      lastY = y
      // translate3d forces compositor promotion. Combined with the
      // `will-change: transform` in CSS the layer is reused across frames.
      el.style.transform = `translate3d(-50%, ${baselineY + y}px, 0)`
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
      window.removeEventListener('resize', recalcBaseline)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <section className="introC">
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & UX Designer
      </h1>
      <p className="introC__big" data-reveal aria-hidden="true">
        Product designer
        <br />
        crafting brands, products
        <br />
        and websites
      </p>

      <div ref={portionRef} className="introC__portion-wrap" data-reveal>
        <Suspense fallback={<div className="portion portion--placeholder" aria-hidden="true" />}>
          <Portion />
        </Suspense>
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
