import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './ImageZoomStory.css'

const CAMERA_TRANSITION = { duration: 0.85, ease: [0.65, 0, 0.35, 1] }

const camera = (s) => {
  const max = Math.max(0, (s.scale - 1) / 2)
  const clampOffset = (v) => Math.min(max, Math.max(-max, v))
  return {
    x: `${clampOffset(s.scale * (0.5 - s.x)) * 100}%`,
    y: `${clampOffset(s.scale * (0.5 - s.y)) * 100}%`,
    scale: s.scale,
  }
}

function clampIdx(i, n, loop) {
  if (n === 0) return 0
  return loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))
}

export default function ImageZoomStory({
  image,
  scenes,
  activeIndex = 0,
  onChange,
  autoPlay = false,
  duration = 3500,
  loop = false,
  showHotspots = true,
}) {
  const n = scenes.length
  const [active, setActive] = useState(() => clampIdx(activeIndex, n, loop))
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(autoPlay)

  const activeRef = useRef(active)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.src = image
  }, [image])

  const goTo = useCallback(
    (i) => {
      const t = clampIdx(i, n, loop)
      activeRef.current = t
      setActive(t)
      onChangeRef.current?.(t)
    },
    [n, loop],
  )

  useEffect(() => {
    if (activeIndex !== activeRef.current) goTo(activeIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  useEffect(() => {
    if (!playing || !loaded) return
    const id = setTimeout(() => {
      const next = active + 1
      if (!loop && next >= n) {
        setPlaying(false)
        return
      }
      goTo(next)
    }, duration)
    return () => clearTimeout(id)
  }, [playing, loaded, active, duration, loop, n, goTo])

  const replay = () => {
    setPlaying(true)
    goTo(0)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(activeRef.current + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(activeRef.current - 1)
    }
  }

  const scene = scenes[active]
  const atOverview = scene.scale <= 1.1

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="pg2-zoom"
      role="group"
      aria-roledescription="image story"
    >
      <motion.div
        className="pg2-zoom__camera"
        style={{ transformOrigin: 'center center' }}
        initial={false}
        animate={loaded ? camera(scene) : camera(scenes[0])}
        transition={CAMERA_TRANSITION}
      >
        <motion.img
          src={image}
          alt=""
          draggable={false}
          className="pg2-zoom__image"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </motion.div>

      <div className="pg2-zoom__vignette" aria-hidden="true" />

      {showHotspots && (
        <AnimatePresence>
          {atOverview &&
            scenes.map((s, i) =>
              i === active ? null : (
                <motion.button
                  key={s.id}
                  type="button"
                  aria-label={s.label ?? `Scene ${i + 1}`}
                  onClick={() => goTo(i)}
                  className="pg2-zoom__hotspot"
                  style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <span className="pg2-zoom__hotspot-ping" />
                  <span className="pg2-zoom__hotspot-dot" />
                  {s.label && <span className="pg2-zoom__hotspot-label">{s.label}</span>}
                </motion.button>
              ),
            )}
        </AnimatePresence>
      )}

      <button
        type="button"
        aria-label="Replay"
        onClick={replay}
        className="pg2-zoom__icon-btn pg2-zoom__replay"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="pg2-zoom__label-wrap">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pg2-zoom__label"
          >
            <span className="pg2-zoom__counter">
              {String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </span>
            {scene.label && <span className="pg2-zoom__label-text">{scene.label}</span>}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pg2-zoom__controls">
        <StepButton dir="left" disabled={!loop && active === 0} onClick={() => goTo(active - 1)} />
        <div className="pg2-zoom__dots">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.label ?? `Go to scene ${i + 1}`}
              onClick={() => goTo(i)}
              className={`pg2-zoom__dot ${i === active ? 'pg2-zoom__dot--active' : ''}`}
            />
          ))}
        </div>
        <StepButton dir="right" disabled={!loop && active === n - 1} onClick={() => goTo(active + 1)} />
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying((p) => !p)}
          className="pg2-zoom__icon-btn"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

function StepButton({ dir, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={dir === 'left' ? 'Previous' : 'Next'}
      onClick={onClick}
      disabled={disabled}
      className={`pg2-zoom__icon-btn ${disabled ? 'pg2-zoom__icon-btn--disabled' : ''}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
