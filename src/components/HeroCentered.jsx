// Centered hero variant — not currently used.
// Swap this in for <Hero /> in App.jsx when you want the layout where
// the big text is centered and the 3D Portion overlaps it from below.

import { useEffect, useState } from 'react'
import './HeroCentered.css'
import Portion from './Portion.jsx'

const EMAIL = 'yahayabinmuhammad@gmail.com'

function NavIcon({ src, alt }) {
  return <img src={src} alt={alt} className="voxel" />
}

export default function HeroCentered() {
  const [copied, setCopied] = useState(false)
  const [stuck, setStuck] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 80,
  )

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  return (
    <section className="introC">
      <header className={`introC__top ${stuck ? 'introC__top--stuck' : ''}`}>
        <div className="introC__top-inner">
          <span className="introC__wordmark">Yahaya Muhammad</span>

          <nav className="introC__nav" aria-label="primary">
            <a href="#work" className="introC__nav-group">
              <NavIcon src="/Work%201.png" alt="" />
              <span className="introC__pill">Work</span>
            </a>
            <a href="#note" className="introC__nav-group">
              <NavIcon src="/Note%201.png" alt="" />
              <span className="introC__pill">Note</span>
            </a>
            <a href="#playground" className="introC__nav-group">
              <NavIcon src="/Playground%201.png" alt="" />
              <span className="introC__pill">Playground</span>
            </a>
          </nav>

          <div className="introC__right">
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="introC__pill introC__pill--icon"
              aria-label="Twitter / X"
            >
              X
            </a>
            <button
              type="button"
              className="introC__pill introC__pill--button"
              onClick={copyEmail}
            >
              {copied ? 'Copied' : 'Mail'}
            </button>
          </div>
        </div>
      </header>

      <h1 className="introC__big" data-reveal>
        a software designer
        <br />
        passionate about artificial intelligence and improving
        <br />
        people&rsquo;s lives through design
      </h1>

      <div className="introC__portion-wrap" data-reveal>
        <Portion />
      </div>

      <div className="introC__about">
        <p className="introC__bio">
          Currently designing product to let kids have fun with islamic studies at kutuby.
        </p>
        <a href="#work" className="introC__scroll">↓ SCROLL FOR MORE</a>
      </div>
    </section>
  )
}
