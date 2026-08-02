import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VideoLightbox.css'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { useScrollLock } from '../hooks/useScrollLock.js'

const IN_MS = 720
const OUT_MS = 540

// Opening lifts away quickly and takes its time landing; closing gathers, then
// tucks home. Handed to the browser as CSS easing rather than solved in JS —
// with a straight path there are no keyframes left to bake the timing into.
const EASE_IN = 'cubic-bezier(0.45, 0.55, 0.12, 1)'
const EASE_OUT = 'cubic-bezier(0.55, 0.02, 0.3, 1)'

// Shared-element morph. The card's video frame and the player share an aspect
// ratio exactly, so one uniform scale lines them up with no squash mid-flight.
//
// A straight path and a plain scale: the clip travels directly between the card
// and the player and does nothing else on the way. There was an arc and a scale
// swell here, and on a piece of footage both read as theatrics — a frame that
// curves and breathes looks warped rather than lively.
function morph(player, origin, dir) {
  player.getAnimations().forEach((anim) => anim.cancel()) // measure the untransformed box
  const p = player.getBoundingClientRect()
  if (!p.width) return null

  const scale = origin.w / p.width
  const dx = origin.cx - (p.left + p.width / 2) // card centre, relative to the player's
  const dy = origin.cy - (p.top + p.height / 2)

  const at = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(5)})`
  const full = 'translate(0px, 0px) scale(1)'

  // Two keyframes and a real easing curve — the browser interpolates between
  // them, which is smoother and cheaper than sampling a path by hand.
  return player.animate(
    dir === 'in' ? [{ transform: at }, { transform: full }] : [{ transform: full }, { transform: at }],
    {
      duration: dir === 'in' ? IN_MS : OUT_MS,
      easing: dir === 'in' ? EASE_IN : EASE_OUT,
      fill: 'both',
    },
  )
}

// A chromeless player: no native controls, so no scrubber, no skip-forward, no
// download or playback-rate menu — just the clip, a click-anywhere play/pause,
// and a progress hairline you can't drag. The clip has no audio track, so there
// is deliberately no sound control; add one here if that ever changes.
//
// Portalled to <body> so it can't be trapped by the hero section's stacking
// context, and kept mounted (hidden) so the backdrop can fade both ways. The
// <Player> only exists while open — nothing buffers in the background, and a
// reopen gets a fresh element with fresh state rather than a rewind.
export default function VideoLightbox({
  open,
  src,
  poster,
  // --clip-w / --clip-h: the source clip's pixel dimensions, which the player's
  // size is derived from (see VideoLightbox.css).
  clipVars,
  title,
  meta,
  getOrigin,
  onClose,
}) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const closeRef = useRef(null)
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)
  const reduced = useReducedMotion()

  // Held through the exit morph too (`open` stays true until it finishes), so
  // the page can't scroll out from under the card the player is flying back to.
  useScrollLock(open)

  // Grow out of the card. Reduced motion gets the plain fade the CSS provides.
  useLayoutEffect(() => {
    if (!open || reduced) return
    const player = playerRef.current
    const origin = getOrigin?.()
    if (!player || !origin) return
    const anim = morph(player, origin, 'in')
    return () => anim?.cancel()
  }, [open, reduced, getOrigin])

  // Shrink back into the card before unmounting — measured fresh, since the
  // card is throwable and may not be where it was when this opened.
  const requestClose = useCallback(() => {
    if (closingRef.current) return
    const player = playerRef.current
    const origin = getOrigin?.()
    if (reduced || !player || !origin) {
      onClose()
      return
    }
    closingRef.current = true
    setClosing(true)
    const done = () => {
      closingRef.current = false
      setClosing(false)
      onClose()
    }
    const anim = morph(player, origin, 'out')
    if (!anim) return done()
    anim.finished.then(done, done)
  }, [getOrigin, onClose, reduced])

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) v.play().catch(() => {})
    else v.pause()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose()
      else if (e.key === ' ' || e.key === 'k') {
        // Space is the transport here, not "activate the focused button".
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, requestClose, toggle])

  return createPortal(
    <div
      className={`vlb ${open ? 'vlb--open' : ''} ${closing ? 'vlb--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="vlb__backdrop"
        onClick={requestClose}
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
          onClick={requestClose}
          tabIndex={open ? 0 : -1}
        >
          Close
        </button>
      </div>

      <div className="vlb__stage">
        {open && (
          <Player
            src={src}
            poster={poster}
            clipVars={clipVars}
            videoRef={videoRef}
            playerRef={playerRef}
            onToggle={toggle}
            closing={closing}
          />
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
function Player({ src, poster, clipVars, videoRef, playerRef, onToggle, closing }) {
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  // The clip has to arrive over the network. The poster covers the frame from
  // the first paint, and this drives a spinner over it so the wait reads as
  // loading rather than as a stalled player.
  const [ready, setReady] = useState(false)
  const stall = useRef(0)

  // A mid-playback rebuffer fires `waiting` constantly on a weak connection —
  // showing the spinner on each one strobes it. Only surface a stall that
  // actually lasts.
  const markWaiting = () => {
    clearTimeout(stall.current)
    stall.current = setTimeout(() => setReady(false), 260)
  }
  const markReady = () => {
    clearTimeout(stall.current)
    setReady(true)
  }
  useEffect(() => () => clearTimeout(stall.current), [])

  // Kick playback off explicitly rather than trusting the autoPlay attribute
  // alone — it doesn't always fire when the element mounts with an empty
  // buffer. The clip is silent so muted autoplay is never blocked in practice;
  // if a browser refuses anyway, fall back to showing the play glyph.
  useEffect(() => {
    videoRef.current?.play?.().catch(() => setPlaying(false))
  }, [videoRef])

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
    <div className="vlb__player" ref={playerRef} style={clipVars}>
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
        onCanPlay={() => {
          markReady()
          setPlaying(!videoRef.current?.paused)
        }}
        onPlaying={markReady}
        onWaiting={markWaiting}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setProgress(100)
        }}
      />

      {!ready && <span className="vlb__spinner" aria-label="Loading video" role="status" />}

      {/* The whole frame is the play/pause control — that's the only transport
          there is. Muted while it morphs shut so a stray click can't pause the
          clip on its way out. */}
      <button
        type="button"
        className={`vlb__toggle ${playing ? '' : 'is-paused'}`}
        onClick={onToggle}
        disabled={closing}
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
