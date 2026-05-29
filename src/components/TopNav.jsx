import { useCallback, useEffect, useRef, useState } from 'react'
// Nav styles (`.intro__top`, `.intro__wordmark`, …) live in Hero.css.
// TopNav imports them directly so it carries its own styling regardless
// of which hero variant (Hero / HeroCentered) is mounted.
import './Hero.css'
import MobileMenu2 from './MobileMenu2.jsx'
import CopyToast from './CopyToast.jsx'
import Picture from './Picture.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useTheme } from '../hooks/useTheme.js'
import { navigate, usePathname } from '../lib/router.js'

const EMAIL = 'yahayabinmuhammad@gmail.com'

function NavIcon({ src, width = 44, height = 44, eager }) {
  return (
    <Picture
      src={src}
      alt=""
      className="voxel"
      width={width}
      height={height}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'low'}
    />
  )
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
  const headerRef = useRef(null)

  // Stick threshold: 80px. We toggle the class directly on the header DOM
  // node instead of pushing React state so the only work per scroll frame
  // is a single classList read and (when crossing the boundary) a write.
  // No render, no diff, no Suspense re-walk.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    let stuck = window.scrollY > 80
    if (stuck) el.classList.add('intro__top--stuck')
    let pending = false
    const update = () => {
      pending = false
      const next = window.scrollY > 80
      if (next !== stuck) {
        stuck = next
        el.classList.toggle('intro__top--stuck', stuck)
      }
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const onWordmark = useCallback(
    (e) => {
      e.preventDefault()
      play(SOUNDS.BUTTON)
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        navigate('/')
      }
    },
    [pathname, play, SOUNDS.BUTTON],
  )

  const linkTo = useCallback(
    (to) => (e) => {
      e.preventDefault()
      play(SOUNDS.BUTTON)
      navigate(to)
    },
    [play, SOUNDS.BUTTON],
  )

  const onToggleTheme = useCallback(() => {
    play(theme === 'dark' ? SOUNDS.TOGGLE_ON : SOUNDS.TOGGLE_OFF)
    toggleTheme()
  }, [theme, toggleTheme, play, SOUNDS.TOGGLE_ON, SOUNDS.TOGGLE_OFF])

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      play(SOUNDS.CELEBRATION)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }, [play, SOUNDS.CELEBRATION])

  return (
    <>
      <header ref={headerRef} className="intro__top">
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
              href={pathname === '/' ? '/#work' : '/'}
              className="intro__nav-group"
              onClick={linkTo(pathname === '/' ? '/#work' : '/')}
            >
              <NavIcon src="/icons/nav/work.webp" eager />
              <span className="intro__pill">Work</span>
            </a>
            <a
              href="/playground"
              className="intro__nav-group"
              onClick={linkTo('/playground')}
            >
              <NavIcon src="/icons/nav/playground.webp" eager />
              <span className="intro__pill">Playground</span>
            </a>
            <a
              href="/about"
              className="intro__nav-group"
              onClick={linkTo('/about')}
            >
              <NavIcon src="/icons/nav/note.webp" eager />
              <span className="intro__pill">About</span>
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

      <MobileMenu2
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
