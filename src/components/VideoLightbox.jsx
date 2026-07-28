import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VideoLightbox.css'

// A chromeless player: no native controls, so no scrubber, no skip-forward, no
// download or playback-rate menu — just the clip, a click-anywhere play/pause,
// and a progress hairline you can't drag. The clip has no audio track, so there
// is deliberately no sound control; add one here if that ever changes.
//
// Portalled to <body> so it can't be trapped by the hero section's stacking
// context, and kept mounted (hidden) so it can fade both in and out. The
// <Player> only exists while open — nothing buffers in the background, and a
// reopen gets a fresh element with fresh state rather than a rewind.
export default function VideoLightbox({ open, src, poster, title, meta, onClose }) {
  const videoRef = useRef(null)
  const closeRef = useRef(null)

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) v.play().catch(() => {})
    else v.pause()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === ' ' || e.key === 'k') {
        // Space is the transport here, not "activate the focused button".
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, toggle])

  return createPortal(
    <div
      className={`vlb ${open ? 'vlb--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="vlb__backdrop"
        onClick={onClose}
        aria-label="Close video"
        tabIndex={open ? 0 : -1}
      />

      <div className="vlb__bar">
        <span className="vlb__title">{title}</span>
        {meta && <span className="vlb__meta">{meta}</span>}
        <button
          ref={closeRef}
          type="button"
          className="vlb__close"
          onClick={onClose}
          tabIndex={open ? 0 : -1}
        >
          Close
        </button>
      </div>

      <div className="vlb__stage">
        {open && (
          <Player src={src} poster={poster} videoRef={videoRef} onToggle={toggle} />
        )}
      </div>
    </div>,
    document.body,
  )
}

// Mounted fresh on every open, so `playing` starts optimistically true (the
// clip is silent, so muted autoplay isn't blocked in practice) without an
// effect having to reset anything. onCanPlay is the safety net: if a browser
// did refuse to autoplay, show the play glyph rather than a frozen frame.
function Player({ src, poster, videoRef, onToggle }) {
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)

  // timeupdate only fires ~4×/s, which makes the bar stutter — drive it from
  // the frame loop instead, and only while something is actually playing.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v?.duration) setProgress((v.currentTime / v.duration) * 100)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, videoRef])

  return (
    <div className="vlb__player">
      <video
        ref={videoRef}
        className="vlb__video"
        src={src}
        poster={poster}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        onCanPlay={() => setPlaying(!videoRef.current?.paused)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setProgress(100)
        }}
      />

      {/* The whole frame is the play/pause control — that's the only transport
          there is. */}
      <button
        type="button"
        className={`vlb__toggle ${playing ? '' : 'is-paused'}`}
        onClick={onToggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        <span className="vlb__glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M8 5.2v13.6L19 12z" fill="currentColor" />
          </svg>
        </span>
      </button>

      <div className="vlb__progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
