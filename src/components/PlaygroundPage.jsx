import { useEffect, useState } from 'react'
import './PlaygroundPage.css'
import Playground from './Playground.jsx'
import Footer from './Footer.jsx'
import MobileMenu from './MobileMenu.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { useSnd } from '../hooks/useSnd.js'
import { navigate } from '../lib/router.js'

const EMAIL = 'yahayabinmuhammad@gmail.com'

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

export default function PlaygroundPage() {
  const { play, SOUNDS } = useSnd()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const goHome = (e) => {
    e?.preventDefault?.()
    play(SOUNDS.BUTTON)
    navigate('/')
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

  const onToggleTheme = () => {
    play(theme === 'dark' ? SOUNDS.TOGGLE_ON : SOUNDS.TOGGLE_OFF)
    toggleTheme()
  }

  return (
    <>
      <header className="pgp__top">
        <div className="pgp__top-inner">
          <a
            href="/"
            className="pgp__wordmark"
            onClick={goHome}
            aria-label="Back to home"
          >
            ← Yahaya Muhammad
          </a>

          <div className="pgp__right">
            <button
              type="button"
              className="pgp__pill pgp__pill--icon"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="pgp__pill"
              onClick={copyEmail}
            >
              {copied ? 'Copied' : 'Mail'}
            </button>
          </div>

          <button
            type="button"
            className="pgp__menu-btn"
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
        onToggleTheme={onToggleTheme}
      />

      <main className="pgp">
        <header className="pgp__head">
          <span className="pgp__eyebrow">Playground</span>
          <h1 className="pgp__title">Bits I make between projects</h1>
          <p className="pgp__lede">
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
