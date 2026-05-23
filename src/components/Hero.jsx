import { useEffect, useState } from 'react'
import './Hero.css'
import Portion from './Portion.jsx'
import MobileMenu from './MobileMenu.jsx'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { navigate } from '../lib/router.js'

const EMAIL = 'yahayabinmuhammad@gmail.com'

const LIGHT = {
  '--bg': '#f5f3ee',
  '--text': '#0a0a0a',
  '--text-dim': '#5a5854',
  '--text-muted': '#9a9a96',
  '--border': 'rgba(0, 0, 0, 0.12)',
  '--pill-border': 'rgba(0, 0, 0, 0.4)',
}

const DARK = {
  '--bg': '#0a0a0a',
  '--text': '#e6e3dc',
  '--text-dim': '#8a8780',
  '--text-muted': '#5a5854',
  '--border': 'rgba(255, 255, 255, 0.12)',
  '--pill-border': 'rgba(255, 255, 255, 0.35)',
}

function applyTheme(theme) {
  const vars = theme === 'light' ? LIGHT : DARK
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.setAttribute('data-theme', theme)
}

function NavIcon({ src, alt }) {
  return <img src={src} alt={alt} className="voxel" />
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.9" y1="4.9" x2="6.9" y2="6.9" />
        <line x1="17.1" y1="17.1" x2="19.1" y2="19.1" />
        <line x1="4.9" y1="19.1" x2="6.9" y2="17.1" />
        <line x1="17.1" y1="6.9" x2="19.1" y2="4.9" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function Hero() {
  const { play, SOUNDS } = useSnd()
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return localStorage.getItem('theme') || 'dark'
  })
  const [stuck, setStuck] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 80,
  )

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignored
    }
  }, [theme])

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      play(next === 'dark' ? SOUNDS.TOGGLE_OFF : SOUNDS.TOGGLE_ON)
      return next
    })
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      play(SOUNDS.CELEBRATION)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  return (
    <section className="intro">
      <header className={`intro__top ${stuck ? 'intro__top--stuck' : ''}`}>
        <div className="intro__top-inner">
          <a
            href="#top"
            className="intro__wordmark"
            onClick={(e) => {
              e.preventDefault()
              play(SOUNDS.BUTTON)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-label="Back to top"
          >
            Yahaya Muhammad
          </a>

          <nav className="intro__nav" aria-label="primary">
            <a
              href="#work"
              className="intro__nav-group"
              onClick={() => play(SOUNDS.BUTTON)}
            >
              <NavIcon src="/Work%201.png" alt="" />
              <span className="intro__pill">Work</span>
            </a>
            <a
              href="#note"
              className="intro__nav-group"
              onClick={() => play(SOUNDS.BUTTON)}
            >
              <NavIcon src="/Note%201.png" alt="" />
              <span className="intro__pill">Note</span>
            </a>
            <a
              href="/playground"
              className="intro__nav-group"
              onClick={(e) => {
                e.preventDefault()
                play(SOUNDS.BUTTON)
                navigate('/playground')
              }}
            >
              <NavIcon src="/Playground%201.png" alt="" />
              <span className="intro__pill">Playground</span>
            </a>
          </nav>

          <div className="intro__right">
            <button
              type="button"
              className="intro__pill intro__pill--icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="intro__pill intro__pill--button"
              onClick={copyEmail}
            >
              {copied ? 'Copied' : 'Mail'}
            </button>
          </div>

          <button
            type="button"
            className="intro__menu-btn"
            onClick={() => {
              play(SOUNDS.TRANSITION_UP)
              setMenuOpen(true)
            }}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onCopyEmail={copyEmail}
        copied={copied}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <CopyToast visible={copied} />

      <h1 className="intro__big" data-reveal>
        a software designer
        <br />
        passionate about artificial intelligence and improving
        <br />
        people&rsquo;s lives through design
      </h1>

      <div className="intro__about" data-reveal>
        <Portion />
        <p className="intro__bio">
        Currently designing a product at Kutuby to make Islamic studies more fun and engaging for kids.
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
