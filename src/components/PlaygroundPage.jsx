import { useEffect } from 'react'
import './PlaygroundPage.css'
import Playground from './Playground.jsx'
import Footer from './Footer.jsx'
import TopNav from './TopNav.jsx'

export default function PlaygroundPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <TopNav />

      <main className="pgp">
        <header className="pgp__head" data-reveal>
          <h1 className="pgp__title">Bits I make between projects</h1>
          <p className="pgp__sub">
            A loose, ongoing archive of small things. Type tests, colour
            experiments, posters, screens that never shipped. Updated when
            something is worth keeping.
          </p>
        </header>

        <Playground />
      </main>

      <Footer />
    </>
  )
}
