import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './Loader.css'
import Portion from './Portion.jsx'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

const COUNT_DUR = 2.0
const HOLD_AFTER = 0.2
const FADE_OUT = 0.45

const MAX_WAIT_MS = 6000

export default function Loader({ onDone, gateReady = true }) {
  const [percent, setPercent] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const wrapperRef = useRef(null)
  const reduced = useReducedMotion()
  const timelineDoneRef = useRef(false)
  const finishedRef = useRef(false)
  const gateReadyRef = useRef(gateReady)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const tryFinish = () => {
    if (finishedRef.current) return
    if (!timelineDoneRef.current) return
    if (!gateReadyRef.current) return
    finishedRef.current = true
    setLeaving(true)
    setTimeout(() => onDoneRef.current?.(), FADE_OUT * 1000)
  }

  useEffect(() => {
    gateReadyRef.current = gateReady
    if (gateReady) tryFinish()
  }, [gateReady])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // Safety net: never block forever waiting on the gate.
    const safetyId = setTimeout(() => {
      gateReadyRef.current = true
      timelineDoneRef.current = true
      tryFinish()
    }, MAX_WAIT_MS)

    const markTimelineDone = () => {
      timelineDoneRef.current = true
      tryFinish()
    }

    if (reduced) {
      gsap.set(wrapper, { opacity: 1 })
      setPercent(100)
      const t = setTimeout(markTimelineDone, 400)
      return () => {
        clearTimeout(t)
        clearTimeout(safetyId)
      }
    }

    const counter = { value: 0 }
    const tl = gsap.timeline({
      delay: 0.05,
      onComplete: () => setTimeout(markTimelineDone, HOLD_AFTER * 1000),
    })

    tl.to(wrapper, { opacity: 1, duration: 0.5, ease: 'power2.out' })
    tl.to(
      counter,
      {
        value: 100,
        duration: COUNT_DUR,
        ease: 'power1.inOut',
        onUpdate: () => setPercent(Math.round(counter.value)),
      },
      '<',
    )

    return () => {
      tl.kill()
      clearTimeout(safetyId)
    }
  }, [reduced])

  return (
    <div
      className={`loader${leaving ? ' loader--leave' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${percent} percent`}
    >
      <div className="loader__rails" aria-hidden="true" />

      <div ref={wrapperRef} className="loader__mark">
        <div className="loader__model">
          <Portion />
        </div>
      </div>

      <span className="loader__label">
        LOADING<span className="loader__dots" aria-hidden="true">
          <span className="loader__dot">.</span>
          <span className="loader__dot">.</span>
          <span className="loader__dot">.</span>
        </span>
      </span>
      <span className="loader__count">{percent}%</span>
    </div>
  )
}
