import { useEffect } from 'react'
import './PlaygroundPage.css'
import TopNav from './TopNav.jsx'
import LensCanvas from './lens/LensCanvas.jsx'

// The Playground: every project clip on one canvas you drag around, through a fisheye lens.
// (The earlier demos, Sticker Stack, Neon Ticker and the rest, are still in components/playground2,
// just no longer on this page.)
export default function PlaygroundPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    // the canvas fills the window: nothing to scroll
    const root = document.documentElement
    root.classList.add('is-playground')
    return () => root.classList.remove('is-playground')
  }, [])

  return (
    <>
      <TopNav />
      <main className="pgp">
        <h1 className="sr-only">Yahaya Muhammad’s Playground: the work, on a canvas you can drag around</h1>
        <LensCanvas className="pgp__canvas" />
      </main>
    </>
  )
}
