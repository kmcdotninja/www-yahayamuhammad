import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { CarouselSlide } from './CarouselSlide.jsx'
import './AppleCarousel.css'

const SPRING = { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 }
const GAP = 16

function clampIndex(i, n, loop) {
  if (n === 0) return 0
  return loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))
}

export default function AppleCarousel({
  items,
  activeIndex = 0,
  onChange,
  autoPlay = false,
  loop = false,
  showControls = true,
  showDots = true,
  interval = 4000,
}) {
  const n = items.length
  const viewportRef = useRef(null)
  const [vw, setVw] = useState(0)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setVw(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { slideWidth, step, base } = useMemo(() => {
    const sw = Math.min(vw * 0.7, 900)
    return { slideWidth: sw, step: sw + GAP, base: vw / 2 - sw / 2 }
  }, [vw])

  const x = useMotionValue(0)
  const [active, setActive] = useState(() => clampIndex(activeIndex, n, loop))
  const [playing, setPlaying] = useState(autoPlay)
  const [dragging, setDragging] = useState(false)

  const activeRef = useRef(active)
  const baseRef = useRef(base)
  const stepRef = useRef(step)
  const onChangeRef = useRef(onChange)
  const positioned = useRef(false)
  baseRef.current = base
  stepRef.current = step
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const goTo = useCallback(
    (i, withAnimation = true) => {
      const target = clampIndex(i, n, loop)
      activeRef.current = target
      setActive(target)
      onChangeRef.current?.(target)
      const tx = baseRef.current - target * stepRef.current
      if (withAnimation) animate(x, tx, SPRING)
      else x.set(tx)
    },
    [n, loop, x],
  )

  useEffect(() => {
    if (vw === 0) return
    const tx = base - activeRef.current * step
    if (!positioned.current) {
      x.set(tx)
      positioned.current = true
    } else {
      animate(x, tx, SPRING)
    }
  }, [base, step, vw, x])

  useEffect(() => {
    if (activeIndex !== activeRef.current) goTo(activeIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  const progress = useMotionValue(0)
  const fillWidth = useTransform(progress, (v) => `${Math.min(100, v * 100)}%`)
  const fillControls = useRef(null)
  const advanceTimer = useRef(undefined)

  useEffect(() => {
    fillControls.current?.stop()
    clearTimeout(advanceTimer.current)
    if (!playing || dragging || vw === 0) return

    progress.set(0)
    fillControls.current = animate(progress, 1, {
      duration: interval / 1000,
      ease: 'linear',
    })
    advanceTimer.current = setTimeout(() => {
      const next = activeRef.current + 1
      if (!loop && next >= n) {
        setPlaying(false)
        return
      }
      goTo(next)
    }, interval)

    return () => {
      fillControls.current?.stop()
      clearTimeout(advanceTimer.current)
    }
  }, [playing, dragging, active, vw, interval, loop, n, goTo, progress])

  const onDragEnd = (_, info) => {
    setDragging(false)
    const projected = x.get() + info.velocity.x * 0.2
    const raw = (baseRef.current - projected) / stepRef.current
    goTo(Math.round(raw))
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

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="pg2-carousel"
      role="group"
      aria-roledescription="carousel"
    >
      {vw > 0 && (
        <motion.div
          className="pg2-carousel__track"
          style={{ x, width: n * step, touchAction: 'pan-y' }}
          drag="x"
          dragConstraints={{ left: base - (n - 1) * step, right: base }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragStart={() => setDragging(true)}
          onDragEnd={onDragEnd}
        >
          {items.map((item, i) => (
            <CarouselSlide
              key={i}
              index={i}
              x={x}
              base={base}
              step={step}
              slideWidth={slideWidth}
              active={i === active}
              onSelect={goTo}
            >
              {item}
            </CarouselSlide>
          ))}
        </motion.div>
      )}

      {(showDots || showControls) && (
        <div className="pg2-carousel__controls">
          {showDots && (
            <div className="pg2-carousel__dots">
              {items.map((_, i) =>
                i === active ? (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className="pg2-carousel__dot pg2-carousel__dot--active"
                  >
                    <motion.div
                      className="pg2-carousel__fill"
                      style={{ width: fillWidth }}
                    />
                  </button>
                ) : (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className="pg2-carousel__dot"
                  />
                ),
              )}
            </div>
          )}

          {showControls && (
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={() => setPlaying((p) => !p)}
              className="pg2-carousel__play"
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
          )}
        </div>
      )}
    </div>
  )
}
