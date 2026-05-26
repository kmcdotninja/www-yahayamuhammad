import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import './Stickers.css'

// Source set for the playground — each unique icon repeated 4× so the
// stage feels like a packed pile of stickers, not a single row.
const UNIQUE = [
  '/Work%201.webp',
  '/Note%201.webp',
  '/Robot%201.webp',
  '/Playground%201.webp',
  '/Mailbox.png',
]
const STICKERS = Array.from({ length: 4 }, () => UNIQUE).flat()

function lerp(a, b, t) {
  return a + (b - a) * t
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function useMatchMedia(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export default function Stickers() {
  const constraintsRef = useRef(null)
  // Map<index, { e: HTMLElement, z: number, dragging: boolean }>
  // Tracks per-sticker DOM ref + the running z-index so the latest
  // grabbed sticker always floats above the others.
  const stickerRefs = useRef(new Map())
  const isSmall = useMatchMedia('(max-width: 760px)')
  const isMd = useMatchMedia('(min-width: 761px) and (max-width: 1024px)')
  const controls = useAnimationControls()

  const variants = useMemo(() => {
    return STICKERS.map((_, i) => {
      const len = STICKERS.length
      const isInFirstHalf = i < Math.floor(len / 2)
      const t = i / (len - 1)
      const isOdd = i & 1

      let initialX
      if (isSmall) {
        initialX = Math.sin(lerp(-1, 1, t)) * 130 * -1
      } else {
        initialX =
          Math.abs(Math.sin(lerp(-1, 1, t))) *
          (isMd ? 160 : randInt(280, 440)) *
          (isInFirstHalf ? -1 : 1)
      }

      const initialY = (isOdd ? -1 : 1) * randInt(20, 50)
      const initRotate =
        Math.random() * (Math.sign(Math.sin(Math.random() * 100)) * 28)
      const initScale = isSmall ? 0.7 : isMd ? 0.85 : 1.05

      return {
        hidden: { opacity: 0 },
        initial: {
          rotate: initRotate,
          x: initialX,
          y: initialY,
          opacity: 1,
          scale: initScale,
        },
      }
    })
  }, [isSmall, isMd])

  function handleDragStart(i) {
    // Bump the dragged sticker above every other one. Reads max z from
    // the live ref Map so the order is correct even after multiple drags.
    const allZ = Array.from(stickerRefs.current.values()).map(({ z }) => z)
    const newZ = (allZ.length ? Math.max(...allZ) : 0) + 1
    const target = stickerRefs.current.get(i)
    if (target?.e) {
      target.e.style.setProperty('--z', String(newZ))
      stickerRefs.current.set(i, { ...target, z: newZ, dragging: true })
    }
  }

  function handleDragEnd(i) {
    // Tween scale back down to the resting size. Position stays wherever
    // the user dropped it — only `scale` is targeted here.
    const target = stickerRefs.current.get(i)
    if (target) {
      controls.start({ scale: variants[i].initial.scale })
    }
  }

  function handleDragTransitionEnd(i) {
    const target = stickerRefs.current.get(i)
    if (target) {
      stickerRefs.current.set(i, { ...target, dragging: false })
    }
  }

  useEffect(() => {
    controls.start('initial')
  }, [controls])

  function handleReset() {
    controls.start('initial')
  }

  return (
    <section className="stickers" aria-label="Sticker playground">
      <div
        className="stickers__bounds"
        ref={constraintsRef}
        aria-hidden="true"
      />

      <div className="stickers__stage">
        <button
          type="button"
          className="stickers__reset"
          onClick={handleReset}
        >
          Reset Stickers
        </button>

        {STICKERS.map((src, i) => {
          const v = variants[i]
          const initScale = v.initial.scale

          return (
            <motion.div
              key={i}
              className="stickers__item"
              drag
              ref={(e) => {
                if (e) stickerRefs.current.set(i, { z: 1, e, dragging: false })
              }}
              initial="hidden"
              animate={controls}
              variants={v}
              transition={{
                y: { duration: 1.2, type: 'spring', bounce: Math.random() * 0.6 },
                x: { duration: 1.2, type: 'spring', bounce: Math.random() * 0.6 },
                opacity: { duration: 0.5 },
              }}
              whileDrag={{
                scale: initScale * 1.2,
                cursor: 'grabbing',
                rotate: 0,
              }}
              onDragStart={() => handleDragStart(i)}
              dragConstraints={constraintsRef}
              dragTransition={{
                bounceStiffness: 100,
                bounceDamping: 10,
                power: 0.4,
              }}
              onDragTransitionEnd={() => handleDragTransitionEnd(i)}
              onDragEnd={() => handleDragEnd(i)}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
