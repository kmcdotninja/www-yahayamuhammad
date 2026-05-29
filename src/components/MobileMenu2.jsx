import { useEffect } from 'react'
import './MobileMenu2.css'
import Picture from './Picture.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { navigate, usePathname } from '../lib/router.js'

const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/kmcdotninja' },
  { label: 'X', href: 'https://x.com/kmcdotninja' },
  { label: 'Instagram', href: 'https://www.instagram.com/kmcdotninja' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yahyabinmuhammad/' },
]

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

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export default function MobileMenu2({
  open,
  onClose,
  onCopyEmail,
  copied,
  theme,
  onToggleTheme,
}) {
  const { play, SOUNDS } = useSnd()
  const pathname = usePathname()

  // Body scroll lock + ESC to close — same pattern the original
  // MobileMenu uses so the page underneath doesn't bleed scroll while
  // the full-screen menu is up.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const scrollY = window.scrollY
    const { body } = document
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      Object.assign(body.style, prev)
      window.scrollTo(0, scrollY)
    }
  }, [open, onClose])

  const handleClose = () => {
    play(SOUNDS.TRANSITION_DOWN)
    onClose()
  }

  const goTo = (path) => (e) => {
    e.preventDefault()
    play(SOUNDS.BUTTON)
    onClose()
    navigate(path)
  }

  // Work links back to the #work anchor on /. If already on /, the
  // default anchor handler in useScrollAnimations does the smooth-scroll.
  const goWork = (e) => {
    play(SOUNDS.BUTTON)
    onClose()
    if (pathname !== '/') {
      e.preventDefault()
      navigate('/')
    }
  }

  return (
    <div className={`mm2 ${open ? 'mm2--open' : ''}`} aria-hidden={!open}>
      <header className="mm2__bar">
        <span className="mm2__brand">Yahaya Muhammad</span>
        <button
          type="button"
          className="mm2__chip mm2__chip--icon"
          onClick={handleClose}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
        >
          <CloseIcon />
        </button>
      </header>

      <nav className="mm2__nav" aria-label="primary">
        <a
          href={pathname === '/' ? '#work' : '/'}
          className="mm2__item"
          onClick={goWork}
          tabIndex={open ? 0 : -1}
        >
          <span>Work</span>
          <Picture src="/icons/nav/work.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" width="80" height="80" />
        </a>
        <a
          href="/playground"
          className="mm2__item"
          onClick={goTo('/playground')}
          tabIndex={open ? 0 : -1}
        >
          <span>Playground </span>
          <Picture src="/icons/nav/playground.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" width="80" height="80" />
        </a>
        <a
          href="/about"
          className="mm2__item"
          onClick={goTo('/about')}
          tabIndex={open ? 0 : -1}
        >
          <span>About</span>
          <Picture src="/icons/nav/note.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" width="80" height="80" />
        </a>
      </nav>

      <div className="mm2__actions">
        <button
          type="button"
          className="mm2__chip mm2__chip--icon"
          onClick={() => {
            play(theme === 'dark' ? SOUNDS.TOGGLE_ON : SOUNDS.TOGGLE_OFF)
            onToggleTheme?.()
          }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          tabIndex={open ? 0 : -1}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          className="mm2__chip"
          onClick={onCopyEmail}
          tabIndex={open ? 0 : -1}
        >
          {copied ? 'Copied' : 'Mail'}
        </button>
      </div>

      <nav className="mm2__social" aria-label="elsewhere">
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={open ? 0 : -1}
          >
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
