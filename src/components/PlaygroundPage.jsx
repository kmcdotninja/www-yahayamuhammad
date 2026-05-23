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
          <h1 className="pgp__title">
            Bits I make
            <br />
            between projects
          </h1>
          <p className="pgp__sub">
            A loose archive of small things between projects. Type tests,
            colour studies, posters, screens that never shipped.
          </p>
        </header>

        <Playground />
      </main>

      <Footer />
    </>
  )
}
