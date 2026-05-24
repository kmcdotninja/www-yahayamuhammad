import { useEffect } from 'react'
import './NotFoundPage.css'
import TopNav from './TopNav.jsx'
import Footer from './Footer.jsx'
import { navigate } from '../lib/router.js'
import { useSnd } from '../hooks/useSnd.js'

export default function NotFoundPage() {
  const { play, SOUNDS } = useSnd()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const goHome = (e) => {
    e.preventDefault()
    play(SOUNDS.BUTTON)
    navigate('/')
  }

  return (
    <>
      <TopNav />

      <main className="nf">
        <div className="nf__inner" data-reveal>
          <span className="nf__eyebrow">Error 404</span>
          <h1 className="nf__title">
            Lost in
            <br />
            the void
          </h1>
          <p className="nf__sub">
            The page you&rsquo;re looking for has wandered off. Let&rsquo;s
            get you back to something real.
          </p>
          <a href="/" className="nf__cta" onClick={goHome}>
            ← Take me home
          </a>
        </div>
      </main>

      <Footer />
    </>
  )
}
