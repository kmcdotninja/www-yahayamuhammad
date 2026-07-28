import { useCallback, useEffect, useRef, useState } from 'react'
import './HeroVideoCard.css'
import VideoLightbox from './VideoLightbox.jsx'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

const FULL = '/video/rednoxx.mp4' // the whole clip, for the lightbox
const LOOP = '/video/rednoxx-loop.mp4' // 12s silent preview that plays in the card
const POSTER = '/video/rednoxx-poster.webp'
const TITLE = 'Building Rednoxx'
const DATE = "Jul '26"

// The card is a physics sticker AND a button, so a pointerup only counts as a
// click if the pointer barely travelled and wasn't held — otherwise grabbing the
// card and setting it back down would pop the lightbox open every time.
const TAP_SLOP = 6 // px of travel still read as a tap
const TAP_MS = 500 // held longer than this, it was a carry, not a click

// A polaroid of the current build that sits in the hero pile: it drops into the
// bottom-right corner and is grab-and-throwable like the stickers around it
// (useStickerPhysics picks it up from the .hero-sticker class), the preview
// loops silently inside the frame so it reads as alive rather than as a
// screenshot, and opening it plays the full clip in a chromeless lightbox.
// data-upright keeps it from tumbling — a video frame resting upside down reads
// as broken, the way the portrait sticker does.
export default function HeroVideoCard() {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const down = useRef(null)
  const cardRef = useRef(null)
  const frameRef = useRef(null)
  const playRef = useRef(null)
  const loopRef = useRef(null)

  // Where the lightbox morphs from and back to. Read live rather than cached:
  // the card is throwable, so it may have moved (or be mid-flight) between
  // opening and closing. The frame — not the whole card — is the origin, since
  // it shares the player's aspect ratio exactly. The lean comes off the card's
  // physics transform so the player straightens out as it grows.
  const getOrigin = useCallback(() => {
    const card = cardRef.current
    const frame = frameRef.current
    if (!card || !frame) return null
    const r = frame.getBoundingClientRect()
    if (!r.width) return null
    const t = getComputedStyle(card).transform
    const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : null
    return {
      w: frame.offsetWidth, // unrotated, to pair with the rotation below
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      angle: m ? (Math.atan2(m.b, m.a) * 180) / Math.PI : 0,
    }
  }, [])

  // Don't spend battery decoding a loop nobody can see — the hero scrolls away
  // and this keeps running otherwise. Also pauses it while the lightbox (which
  // is playing the same footage at full size) is up.
  useEffect(() => {
    const v = loopRef.current
    if (!v) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !open) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.1 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [open, reduced])

  const onPointerDown = (e) => {
    // The play button is its own control (the drag hook already ignores it), so
    // let its click handler own that gesture.
    if (e.target.closest('.hero-video__play')) return
    down.current = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  const onPointerUp = (e) => {
    const d = down.current
    down.current = null
    if (!d) return
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y)
    if (moved > TAP_SLOP || performance.now() - d.t > TAP_MS) return
    setOpen(true)
  }

  // Send focus back to the control that opened it, so a keyboard user isn't
  // dropped at the top of the document.
  const close = () => {
    setOpen(false)
    playRef.current?.focus()
  }

  return (
    <>
      <div
        ref={cardRef}
        className="hero-sticker hero-sticker--video"
        data-upright
        data-anchor="bottom-right"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="hero-video__frame" ref={frameRef}>
          {reduced ? (
            <img
              className="hero-video__media"
              src={POSTER}
              alt=""
              width={900}
              height={596}
              decoding="async"
              draggable={false}
            />
          ) : (
            <video
              ref={loopRef}
              className="hero-video__media"
              src={LOOP}
              poster={POSTER}
              width={900}
              height={596}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              tabIndex={-1}
              aria-hidden="true"
            />
          )}
          <button
            ref={playRef}
            type="button"
            className="hero-video__play"
            onClick={() => setOpen(true)}
            aria-label={`Play the ${TITLE} clip`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5.2v13.6L19 12z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="hero-video__cap">
          <span>{TITLE}</span>
          <span>{DATE}</span>
        </div>
      </div>

      <VideoLightbox
        open={open}
        src={FULL}
        title={TITLE}
        meta={DATE}
        getOrigin={getOrigin}
        onClose={close}
      />
    </>
  )
}
