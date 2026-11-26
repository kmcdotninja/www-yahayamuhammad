import { useEffect, useRef } from 'react'
import './PlaygroundPage.css'
import TopNav from './TopNav.jsx'
import LensCanvas from './lens/LensCanvas.jsx'

// The Playground: every project clip on one canvas you drag around, through a fisheye lens.
// The canvas starts below the nav, so the nav sits on the page exactly as it does everywhere else.
// (The earlier demos, Sticker Stack, Neon Ticker and the rest, are still in components/playground2,
// just no longer on this page.)
export default function PlaygroundPage() {
  const mainRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    // where the nav ends, whatever its height at this width
    const nav = document.querySelector('.intro__top')
    const main = mainRef.current
    if (!nav || !main) return
    const fit = () => main.style.setProperty('--nav-h', `${nav.offsetHeight}px`)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  return (
    <>
      <TopNav />
      <main ref={mainRef} className="pgp">
        <h1 className="sr-only">Yahaya Muhammad’s Playground: the work, on a canvas you can drag around</h1>
        <LensCanvas className="pgp__canvas" />
      </main>
    </>
  )
}
