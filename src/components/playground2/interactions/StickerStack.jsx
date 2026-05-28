import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useVelocity,
  useSpring,
  animate,
} from 'framer-motion'
import './StickerStack.css'

const ENTRY_STAGGER = 0.16
const ENTRY_DURATION = 0.9

export default function StickerStack({
  stickers,
  play = true,
  referenceWidth = 900,
  controls = true,
  loop = false,
  loopDelay = 2200,
  className,
}) {
  const containerRef = useRef(null)
  const width = useContainerWidth(containerRef)
  const scale = width > 0 ? Math.min(width / referenceWidth, 1) : 0
  const entryTotalMs =
    (stickers.length - 1) * ENTRY_STAGGER * 1000 + ENTRY_DURATION * 1000

  const [canDrag, setCanDrag] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [zMap, setZMap] = useState(() =>
    Object.fromEntries(stickers.map((_, i) => [i, i + 1])),
  )
  const topZ = useRef(stickers.length)
  const started = useRef(false)
  const dragTimer = useRef(undefined)
  const loopTimer = useRef(undefined)
  const userTookOver = useRef(false)

  const beginEntry = () => {
    topZ.current = stickers.length
    setZMap(Object.fromEntries(stickers.map((_, i) => [i, i + 1])))
    setCanDrag(false)
    setAnimKey((k) => k + 1)
    clearTimeout(dragTimer.current)
    dragTimer.current = setTimeout(() => setCanDrag(true), entryTotalMs)
    clearTimeout(loopTimer.current)
    if (loop && !userTookOver.current) {
      loopTimer.current = setTimeout(beginEntry, entryTotalMs + loopDelay)
    }
  }

  useEffect(() => {
    if (play && !started.current && scale > 0) {
      started.current = true
      beginEntry()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, scale])

  useEffect(
    () => () => {
      clearTimeout(dragTimer.current)
      clearTimeout(loopTimer.current)
    },
    [],
  )

  const bringToFront = (i) => {
    userTookOver.current = true
    clearTimeout(loopTimer.current)
    topZ.current += 1
    setZMap((m) => ({ ...m, [i]: topZ.current }))
  }

  return (
    <div
      ref={containerRef}
      className={`pg2-stickers ${className ?? ''}`}
    >
      {scale > 0 && (
        <div key={animKey} className="pg2-stickers__layer">
          {stickers.map((s, i) => (
            <Sticker
              key={`${animKey}-${i}`}
              sticker={s}
              index={i}
              scale={scale}
              zIndex={zMap[i]}
              canDrag={canDrag}
              onGrab={bringToFront}
              constraints={containerRef}
            />
          ))}
        </div>
      )}

      {controls && (
        <button
          type="button"
          onClick={beginEntry}
          className="pg2-stickers__replay"
        >
          Replay
        </button>
      )}

      <p
        className={`pg2-stickers__hint ${
          canDrag ? 'pg2-stickers__hint--shown' : ''
        }`}
      >
        drag to scatter
      </p>
    </div>
  )
}

function Sticker({
  sticker: s,
  index,
  scale,
  zIndex,
  canDrag,
  onGrab,
  constraints,
}) {
  const x = useMotionValue(s.fromX * scale)
  const y = useMotionValue(s.fromY * scale)
  const rotateBase = useMotionValue(s.rot + (s.fromX > 0 ? 25 : -25))

  const vx = useVelocity(x)
  const smoothVx = useSpring(vx, { damping: 50, stiffness: 350 })
  const tilt = useTransform(smoothVx, [-1800, 1800], [-14, 14], { clamp: true })
  const rotate = useTransform([rotateBase, tilt], ([b, t]) => b + t)

  useEffect(() => {
    const transition = {
      type: 'spring',
      stiffness: 150,
      damping: 15,
      mass: 0.7,
      delay: index * ENTRY_STAGGER,
    }
    const a = animate(x, s.x * scale, transition)
    const b = animate(y, s.y * scale, transition)
    const c = animate(rotateBase, s.rot, transition)
    return () => {
      a.stop()
      b.stop()
      c.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.img
      src={s.src}
      alt=""
      draggable={false}
      className={`pg2-sticker ${canDrag ? 'pg2-sticker--grabbable' : ''}`}
      style={{
        x,
        y,
        rotate,
        width: s.size * scale,
        zIndex,
        translate: '-50% -50%',
        touchAction: 'none',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: [0.6, 1.05, 1] }}
      transition={{
        delay: index * ENTRY_STAGGER,
        duration: ENTRY_DURATION,
        opacity: { delay: index * ENTRY_STAGGER, duration: 0.22, ease: 'easeOut' },
        scale: {
          times: [0, 0.7, 1],
          ease: [0.34, 1.56, 0.64, 1],
        },
      }}
      drag={canDrag}
      dragConstraints={constraints}
      dragElastic={0.5}
      dragMomentum
      dragTransition={{
        power: 0.4,
        timeConstant: 220,
        bounceStiffness: 220,
        bounceDamping: 26,
      }}
      whileHover={
        canDrag
          ? { scale: 1.05, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }
          : undefined
      }
      whileDrag={{ scale: 1.08, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } }}
      onPointerDown={canDrag ? () => onGrab(index) : undefined}
    />
  )
}

function useContainerWidth(ref) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}
