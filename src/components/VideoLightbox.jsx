import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VideoLightbox.css'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

const IN_MS = 520
const OUT_MS = 420
const STEPS = 18 // path samples; the tween between them is imperceptible

// Opening lifts away quickly and takes its time landing. Closing gathers, then
// tucks home. Both are sampled in JS rather than handed to the browser, because
// the timing has to be baked into the keyframes alongside the curved path (a
// keyframe-level easing would re-ease every segment).
// Deliberately not a hard ease-out: something like (0.32, 0.94, …) is 84% done
// a third of the way in, which throws the arc away before you can read it. This
// spreads the travel over the first ~60% and lands soft.
const EASE_IN = cubicBezier(0.45, 0.55, 0.12, 1)
const EASE_OUT = cubicBezier(0.55, 0.02, 0.3, 1)

// A CSS-style cubic-bezier(x1,y1,x2,y2) as a function of progress — Newton with
// the same guards the browser uses.
function cubicBezier(x1, y1, x2, y2) {
  const a = (u, v) => 1 - 3 * v + 3 * u
  const b = (u, v) => 3 * v - 6 * u
  const calc = (t, u, v) => ((a(u, v) * t + b(u, v)) * t + 3 * u) * t
  const slope = (t, u, v) => 3 * a(u, v) * t * t + 2 * b(u, v) * t + 3 * u
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 6; i++) {
      const d = slope(t, x1, x2)
      if (!d) break
      t -= (calc(t, x1, x2) - x) / d
    }
    return calc(t, y1, y2)
  }
}

const lerp = (from, to, t) => from + (to - from) * t

// Shared-element morph. The card's video frame and the player have the SAME
// aspect ratio, so one uniform scale lines them up exactly — no squash mid-
// flight — and the card's resting lean is carried through so the player
// straightens out as it grows.
//
// The centre travels a quadratic bezier bowed up and slightly ahead of the
// straight line, so it swings out of the corner rather than sliding along a
// rail, and the scale breathes a fraction wide at the apex. Both readings of
// "organic": nothing moves on an axis, nothing moves at a constant rate.
function morph(player, origin, dir) {
  player.getAnimations().forEach((anim) => anim.cancel()) // measure the untransformed box
  const p = player.getBoundingClientRect()
  if (!p.width) return null

  const scale = origin.w / p.width
  const dx = origin.cx - (p.left + p.width / 2) // card centre, relative to the player's
  const dy = origin.cy - (p.top + p.height / 2)

  // Control point: half way, lifted, and led a little along the travel so the
  // arc leans diagonally instead of bulging symmetrically.
  const lift = Math.min(170, 56 + Math.hypot(dx, dy) * 0.17)
  const ctrlX = dx * 0.62
  const ctrlY = dy / 2 - lift

  // u = 0 at the card, u = 1 at full size.
  const pointAt = (u) => {
    const iu = 1 - u
    return {
      x: iu * iu * dx + 2 * iu * u * ctrlX,
      y: iu * iu * dy + 2 * iu * u * ctrlY,
    }
  }

  const ease = dir === 'in' ? EASE_IN : EASE_OUT
  const frames = []
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    const e = ease(t)
    const u = dir === 'in' ? e : 1 - e
    const { x, y } = pointAt(u)
    // A hair of extra size at the apex — the swell you get from something
    // thrown rather than slid.
    const swell = 1 + 0.01 * Math.sin(Math.PI * u)
    frames.push({
      offset: t,
      transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${lerp(
        origin.angle,
        0,
        u,
      ).toFixed(3)}deg) scale(${(lerp(scale, 1, u) * swell).toFixed(5)})`,
    })
  }

  return player.animate(frames, {
    duration: dir === 'in' ? IN_MS : OUT_MS,
    easing: 'linear', // the curve is already baked into the samples above
    fill: 'both',
  })
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
export default function VideoLightbox({ open, src, title, meta, getOrigin, onClose }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const closeRef = useRef(null)
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)
  const reduced = useReducedMotion()

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
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
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
function Player({ src, videoRef, playerRef, onToggle, closing }) {
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
    <div className="vlb__player" ref={playerRef}>
      <video
        ref={videoRef}
        className="vlb__video"
        src={src}
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
