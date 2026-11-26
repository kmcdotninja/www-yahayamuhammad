import { useCallback, useEffect, useRef } from 'react'
import './PlaygroundPage.css'
import TopNav from './TopNav.jsx'
import LensCanvas from './lens/LensCanvas.jsx'

// The Playground: every project clip on one canvas you drag around, through a fisheye lens.
// The page doesn't scroll (scrolling moves the canvas), so the nav is told when to tuck in: once the canvas has
// been moved as far as a page scrolls before the nav tucks in elsewhere (TopNav: 80px). Until then a strip of page
// sits under the nav, as at the top of every other page; then it slides away and the canvas runs under the nav.
// (The earlier demos, Sticker Stack, Neon Ticker and the rest, are still in components/playground2,
// just no longer on this page.)
const STICK_AT = 80

const navEl = () => document.querySelector('.intro__top')

export default function PlaygroundPage() {
  const mainRef = useRef(null)
  const stuck = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    const nav = navEl()
    const main = mainRef.current
    if (!nav || !main) return
    const fit = () => main.style.setProperty('--nav-h', `${nav.offsetHeight}px`)
    fit()
    const ro = new ResizeObserver(() => { if (!stuck.current) fit() })
    ro.observe(nav)
    return () => {
      ro.disconnect()
      // leave the nav as the next page expects it
      if (window.scrollY <= STICK_AT) nav.classList.remove('intro__top--stuck')
    }
  }, [])

  const onPan = useCallback((moved) => {
    if (stuck.current || moved < STICK_AT) return
    stuck.current = true
    navEl()?.classList.add('intro__top--stuck')
    mainRef.current?.classList.add('pgp--stuck')
  }, [])

  return (
    <>
      <TopNav />
      <main ref={mainRef} className="pgp">
        <h1 className="sr-only">Yahaya Muhammad’s Playground: the work, on a canvas you can drag around</h1>
        <LensCanvas className="pgp__canvas" topInset={() => navEl()?.offsetHeight || 0} onPan={onPan} />
        <div className="pgp__cap" aria-hidden="true" />
      </main>
    </>
  )
}
