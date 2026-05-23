import { useEffect, useState } from 'react'
import MobileMenu from './MobileMenu.jsx'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useTheme } from '../hooks/useTheme.js'
import { navigate, usePathname } from '../lib/router.js'

const EMAIL = 'yahayabinmuhammad@gmail.com'

function NavIcon({ src }) {
  return <img src={src} alt="" className="voxel" />
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

export default function TopNav() {
  const { play, SOUNDS } = useSnd()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stuck, setStuck] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 80,
  )

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onWordmark = (e) => {
    e.preventDefault()
    play(SOUNDS.BUTTON)
    if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  const linkTo = (to) => (e) => {
    e.preventDefault()
    play(SOUNDS.BUTTON)
    navigate(to)
  }

  const onToggleTheme = () => {
    play(theme === 'dark' ? SOUNDS.TOGGLE_ON : SOUNDS.TOGGLE_OFF)
    toggleTheme()
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
    <>
      <header className={`intro__top ${stuck ? 'intro__top--stuck' : ''}`}>
        <div className="intro__top-inner">
          <a
            href="/"
            className="intro__wordmark"
            onClick={onWordmark}
            aria-label="Back to home"
          >
            Yahaya Muhammad
          </a>

          <nav className="intro__nav" aria-label="primary">
            <a
              href="/#work"
              className="intro__nav-group"
              onClick={linkTo('/#work')}
            >
              <NavIcon src="/Work%201.png" />
              <span className="intro__pill">Work</span>
            </a>
            <a
              href="/note"
              className="intro__nav-group"
              onClick={linkTo('/note')}
            >
              <NavIcon src="/Note%201.png" />
              <span className="intro__pill">Note</span>
            </a>
            <a
              href="/playground"
              className="intro__nav-group"
              onClick={linkTo('/playground')}
            >
              <NavIcon src="/Playground%201.png" />
              <span className="intro__pill">Playground</span>
            </a>
          </nav>

          <div className="intro__right">
            <button
              type="button"
              className="intro__pill intro__pill--icon"
              onClick={onToggleTheme}
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
        onToggleTheme={onToggleTheme}
      />

      <CopyToast visible={copied} />
    </>
  )
}
