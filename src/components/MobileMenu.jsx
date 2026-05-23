import { useEffect, useRef, useState } from 'react'
import './MobileMenu.css'
import { useSnd } from '../hooks/useSnd.js'
import { navigate } from '../lib/router.js'

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

export default function MobileMenu({
  open,
  onClose,
  onCopyEmail,
  copied,
  theme,
  onToggleTheme,
}) {
  const { play, SOUNDS } = useSnd()
  const drawerRef = useRef(null)
  const dragRef = useRef({ startY: 0, dragging: false, dy: 0 })
  const [dragY, setDragY] = useState(0)

  // Lock body scroll + ESC to close while open
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      setDragY(0)
    }
  }, [open, onClose])

  const onPointerDown = (e) => {
    dragRef.current.dragging = true
    dragRef.current.startY = e.clientY
    dragRef.current.dy = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return
    const dy = e.clientY - dragRef.current.startY
    if (dy < 0) {
      dragRef.current.dy = 0
      setDragY(0)
      return
    }
    dragRef.current.dy = dy
    setDragY(dy)
  }

  const endDrag = (e) => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignored
    }
    if (dragRef.current.dy > 110) {
      play(SOUNDS.TRANSITION_DOWN)
      onClose()
    } else {
      setDragY(0)
    }
  }

  const handleNavClick = () => {
    play(SOUNDS.BUTTON)
    onClose()
  }

  const handleClose = () => {
    play(SOUNDS.TRANSITION_DOWN)
    onClose()
  }

  return (
    <div
      className={`mm ${open ? 'mm--open' : ''}`}
      aria-hidden={!open}
    >
      <button
        className="mm__backdrop"
        onClick={handleClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
      />

      <div
        ref={drawerRef}
        className="mm__drawer"
        style={{
          transform: open
            ? `translateY(${dragY}px)`
            : 'translateY(120%)',
          transition: dragRef.current.dragging
            ? 'none'
            : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="mm__handle-row"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mm__handle" />
        </div>

        <div className="mm__brand">Yahaya Muhammad</div>

        <div className="mm__nav">
          <a href="#work" className="mm__card" onClick={handleNavClick}>
            <img src="/Work%201.png" alt="" className="mm__card-icon" />
            <span>Work</span>
          </a>
          <a href="#note" className="mm__card" onClick={handleNavClick}>
            <img src="/Note%201.png" alt="" className="mm__card-icon" />
            <span>Note</span>
          </a>
          <a
            href="/playground"
            className="mm__card"
            onClick={(e) => {
              e.preventDefault()
              play(SOUNDS.BUTTON)
              onClose()
              navigate('/playground')
            }}
          >
            <img src="/Playground%201.png" alt="" className="mm__card-icon" />
            <span>Playground</span>
          </a>
        </div>

        <div className="mm__footer">
          <div className="mm__actions">
            <button
              type="button"
              className="mm__chip mm__chip--icon"
              onClick={() => {
                play(theme === 'dark' ? SOUNDS.TOGGLE_ON : SOUNDS.TOGGLE_OFF)
                onToggleTheme()
              }}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="mm__chip"
              onClick={onCopyEmail}
            >
              {copied ? 'Copied' : 'Mail'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
