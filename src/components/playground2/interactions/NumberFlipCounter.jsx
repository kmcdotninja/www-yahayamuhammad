import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { DigitFlip } from './DigitFlip.jsx'
import './NumberFlipCounter.css'

const RESUME_DELAY = 2800
const DIGIT_HEIGHT = 104
const DIGIT_WIDTH = 62
const FONT_SIZE = 84

export default function NumberFlipCounter({
  value = 0,
  duration = 0.7,
  autoPlay = false,
  maxDigits = 4,
  onChange,
}) {
  const max = useMemo(() => 10 ** maxDigits - 1, [maxDigits])
  const clamp = useCallback((n) => Math.max(0, Math.min(max, n)), [max])

  const [current, setCurrent] = useState(() => clamp(value))
  const [direction, setDirection] = useState(1)

  const currentRef = useRef(current)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const setValue = useCallback(
    (next) => {
      const target = clamp(Math.round(next))
      const prev = currentRef.current
      if (target === prev) return
      setDirection(target > prev ? 1 : -1)
      currentRef.current = target
      setCurrent(target)
      onChangeRef.current?.(target)
    },
    [clamp],
  )

  useEffect(() => {
    setValue(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const pausedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const resumeTimer = useRef(undefined)
  const markInteraction = useCallback(() => {
    if (!autoPlay) return
    pausedRef.current = true
    setPaused(true)
    clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => {
      pausedRef.current = false
      setPaused(false)
    }, RESUME_DELAY)
  }, [autoPlay])
  useEffect(() => () => clearTimeout(resumeTimer.current), [])

  useEffect(() => {
    if (!autoPlay) return
    const interval = setInterval(() => {
      if (pausedRef.current) return
      setValue(Math.floor(Math.random() * (max + 1)))
    }, Math.max(1100, duration * 1000 * 1.4))
    return () => clearInterval(interval)
  }, [autoPlay, duration, max, setValue])

  const holdTimer = useRef(undefined)
  const stopHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = undefined
    }
  }, [])
  const startHold = useCallback(
    (step) => {
      markInteraction()
      setValue(currentRef.current + step)
      let delay = 280
      const tick = () => {
        markInteraction()
        setValue(currentRef.current + step)
        delay = Math.max(45, delay * 0.8)
        holdTimer.current = setTimeout(tick, delay)
      }
      holdTimer.current = setTimeout(tick, delay)
    },
    [setValue, markInteraction],
  )
  useEffect(() => () => stopHold(), [stopHold])

  const randomize = () => {
    markInteraction()
    setValue(Math.floor(Math.random() * (max + 1)))
  }

  const padded = String(current).padStart(maxDigits, '0')
  const firstSignificant = useMemo(() => {
    const i = padded.search(/[^0]/)
    return i === -1 ? maxDigits - 1 : i
  }, [padded, maxDigits])

  return (
    <div className="pg2-counter">
      {autoPlay && (
        <div className="pg2-counter__status">
          <motion.span
            className="pg2-counter__pulse"
            animate={
              paused
                ? { opacity: 0.25, scale: 1 }
                : { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }
            }
            transition={
              paused
                ? { duration: 0.3 }
                : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
            }
          />
          {paused ? 'Paused' : 'Auto'}
        </div>
      )}

      <div
        className="pg2-counter__digits"
        style={{ height: DIGIT_HEIGHT, fontSize: FONT_SIZE, lineHeight: 1, fontWeight: 600 }}
      >
        {padded.split('').map((d, i) => (
          <DigitFlip
            key={i}
            value={Number(d)}
            direction={direction}
            height={DIGIT_HEIGHT}
            width={DIGIT_WIDTH}
            duration={duration}
            dimmed={i < firstSignificant}
          />
        ))}
        <div className="pg2-counter__fade" aria-hidden="true" />
      </div>

      <div className="pg2-counter__controls">
        <HoldButton onPress={() => startHold(-1)} onRelease={stopHold}>
          −
        </HoldButton>
        <button
          type="button"
          onClick={randomize}
          className="pg2-counter__randomize"
        >
          Randomize
        </button>
        <HoldButton onPress={() => startHold(1)} onRelease={stopHold}>
          +
        </HoldButton>
      </div>
    </div>
  )
}

function HoldButton({ children, onPress, onRelease }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      onContextMenu={(e) => e.preventDefault()}
      className="pg2-counter__hold"
    >
      {children}
    </button>
  )
}
