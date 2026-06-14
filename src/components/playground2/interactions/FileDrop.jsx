import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import './FileDrop.css'
import { useReducedMotion } from '../../../hooks/useReducedMotion.js'

// Everything is laid out in this reference coordinate space (px) and then
// uniformly scaled to the measured stage width, so the scene keeps its
// proportions at any card size (same approach as StickerStack).
const REF_W = 560
// The scene is composed in a 16:10 reference box (560×350); its centre is
// (280, 175). The folder is the hero, parked dead-centre; the invoice rests to
// its right and is dragged in. The box is scaled to *fit* the container and
// centred on both axes, so the scene stays intact and centred at any container
// size or aspect ratio (not just a 16:10 one).
const REF_H = 350
const FOLDER = { w: 152, cx: 280, cy: 175, ratio: 157 / 171 }
const INVOICE = { w: 96, cx: 432, cy: 175, ratio: 175 / 116 }
const OVER_DIST = 112 // how close (ref px) the invoice must get to count as "over"

const SPRING = { type: 'spring', stiffness: 320, damping: 26 }
const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 22 }

// Folder front pocket (with the tab notch) — the layer that lifts open and
// later closes over the dropped document.
const FRONT_PATH =
  'M170.385 129.366C170.385 144.178 158.377 156.186 143.565 156.186H26.8198C12.0076 156.186 0 144.178 0 129.366V63.1049C0 48.2928 12.0076 36.2852 26.8198 36.2852H79.6704C89.2548 36.2852 97.0244 44.0548 97.0244 53.6392C97.0244 63.2235 104.794 70.9932 114.378 70.9932H143.565C158.377 70.9932 170.385 83.0008 170.385 97.813V129.366Z'

export default function FileDrop({ play = true, loop = true, loopDelay = 1400 }) {
  const rootRef = useRef(null)
  const invoiceRef = useRef(null)
  const { width, height } = useContainerSize(rootRef)
  // Scale the 16:10 box to *fit* the container (contain), then centre it — so the
  // scene responds to the container's height as well as its width and never
  // drifts/clips when the card aspect changes.
  const s = width > 0 && height > 0 ? Math.min(width / REF_W, height / REF_H) : 0
  const offsetX = (width - REF_W * s) / 2
  const offsetY = (height - REF_H * s) / 2
  const reduced = useReducedMotion()

  // Invoice (the dragged document) — x/y are offsets from its rest center.
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const invScale = useMotionValue(1)
  const invOpacity = useMotionValue(1)
  const [invZ, setInvZ] = useState(30)

  // Folder + feedback.
  const folderScale = useMotionValue(1)
  const frontRotate = useMotionValue(0) // deg, rotateX of the pocket
  const glow = useMotionValue(0)
  const shadow = useMotionValue(0.22)
  const dotScale = useMotionValue(0)
  const dotOpacity = useMotionValue(0)

  const phase = useRef('idle') // idle | drag | busy
  const over = useRef(false)
  const tookOver = useRef(false)
  const token = useRef(0)
  const anims = useRef([])
  const timers = useRef(new Set())

  // ---- imperative animation bookkeeping (so a takeover/unmount can cancel) ----
  const run = (mv, to, opts) => {
    const c = animate(mv, to, opts)
    anims.current.push(c)
    return c
  }
  const fin = (c) =>
    c.finished
      .catch(() => {})
      .finally(() => {
        anims.current = anims.current.filter((a) => a !== c)
      })
  const stopAll = () => {
    anims.current.forEach((c) => c.stop())
    anims.current = []
  }
  const sleep = (ms) =>
    new Promise((res) => {
      const t = setTimeout(() => {
        timers.current.delete(t)
        res()
      }, ms)
      timers.current.add(t)
    })
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }
  // Bump the cancel token + drop any in-flight work; returns the new token so a
  // running sequence can tell when it has been superseded.
  const beginRun = () => {
    stopAll()
    clearTimers()
    return ++token.current
  }

  // Open/close the folder pocket: tilt the front, scale up, and glow as a
  // valid drop target.
  const openFolder = (open) => {
    run(frontRotate, open ? -24 : 0, SPRING_SOFT)
    run(folderScale, open ? 1.06 : 1, SPRING_SOFT)
    run(glow, open ? 1 : 0, { duration: 0.22 })
  }

  // Clip the tucked invoice to the folder silhouette so it can never spill past
  // the folder edges (especially the bottom) while it slides in. The doc only
  // translates + uniformly scales here, so mapping the folder's edges into the
  // doc's local box gives an axis-aligned inset. Top is left free so the doc can
  // still poke up out of the folder as it's inserted.
  const lastClip = useRef('')
  const writeClip = (v) => {
    if (lastClip.current === v) return
    lastClip.current = v
    if (invoiceRef.current) invoiceRef.current.style.clipPath = v
  }
  const setClip = () => {
    if (s === 0) return
    if (phase.current !== 'busy') {
      writeClip('')
      return
    }
    const W = INVOICE.w * s
    const H = INVOICE.w * INVOICE.ratio * s
    const scale = invScale.get() || 1
    const cx = INVOICE.cx * s + x.get()
    const cy = INVOICE.cy * s + y.get()
    const fScale = folderScale.get()
    const halfW = (FOLDER.w * s * fScale) / 2
    const halfH = (FOLDER.w * FOLDER.ratio * s * fScale) / 2
    const localLeft = W / 2 + (FOLDER.cx * s - halfW - cx) / scale
    const localRight = W / 2 + (FOLDER.cx * s + halfW - cx) / scale
    const localBottom = H / 2 + (FOLDER.cy * s + halfH - cy) / scale
    const l = Math.max(0, localLeft)
    const r = Math.max(0, W - localRight)
    const b = Math.max(0, H - localBottom)
    writeClip(l || r || b ? `inset(0px ${r}px ${b}px ${l}px)` : '')
  }

  // Recompute "over the folder" whenever the invoice moves — one code path
  // covers both the auto demo and real dragging.
  useEffect(() => {
    if (s === 0) return undefined
    const update = () => {
      if (phase.current === 'busy') return
      const cx = INVOICE.cx * s + x.get()
      const cy = INVOICE.cy * s + y.get()
      const d = Math.hypot(cx - FOLDER.cx * s, cy - FOLDER.cy * s)
      const isOver = d < OVER_DIST * s
      if (isOver !== over.current) {
        over.current = isOver
        openFolder(isOver)
      }
    }
    const ux = x.on('change', update)
    const uy = y.on('change', update)
    return () => {
      ux()
      uy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  // Keep the folder-clip in sync with every motion that affects it.
  useEffect(() => {
    if (s === 0) return undefined
    const subs = [
      x.on('change', setClip),
      y.on('change', setClip),
      invScale.on('change', setClip),
      folderScale.on('change', setClip),
    ]
    return () => subs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  const resetInvoice = () => {
    x.set(0)
    y.set(0)
    invScale.set(1)
    setInvZ(30)
    phase.current = 'idle'
    writeClip('')
  }

  // The drop: slide the doc between the folder layers, vanish it inside, close
  // the pocket over it, bounce, then flash the confirmation dot.
  const drop = async (tok) => {
    phase.current = 'busy'
    setInvZ(3) // tuck between back (2) and front (4)
    setClip() // clip to the folder so nothing pokes past its edges as it slides in
    run(frontRotate, -24, SPRING_SOFT) // ensure the pocket is open to receive it
    run(folderScale, 1.06, SPRING_SOFT)
    await Promise.all([
      fin(run(x, (FOLDER.cx - INVOICE.cx) * s, SPRING)),
      fin(run(y, (FOLDER.cy + 4 - INVOICE.cy) * s, { duration: 0.3, ease: [0.4, 0, 0.2, 1] })),
      fin(run(invScale, 0.8, { duration: 0.3, ease: [0.4, 0, 0.2, 1] })),
    ])
    if (tok !== token.current) return
    over.current = false
    run(frontRotate, 0, SPRING_SOFT) // frosted cover settles over the doc (revealing it through the glass)
    run(glow, 0, { duration: 0.2 })
    if (tok !== token.current) return

    // Success bounce + soft shadow pulse.
    await Promise.all([
      fin(run(folderScale, [1.06, 0.92, 1.05, 1], { duration: 0.5, times: [0, 0.3, 0.62, 1], ease: 'easeOut' })),
      fin(run(shadow, [0.22, 0.4, 0.22], { duration: 0.5, times: [0, 0.3, 1] })),
    ])
    if (tok !== token.current) return

    // Green confirmation dot.
    dotScale.set(0)
    dotOpacity.set(1)
    await fin(run(dotScale, [0, 1.25, 1], { duration: 0.4, times: [0, 0.6, 1], ease: [0.34, 1.56, 0.64, 1] }))
    if (tok !== token.current) return
    await sleep(620)
    if (tok !== token.current) return
    await fin(run(dotOpacity, 0, { duration: 0.3 }))
    // The invoice stays tucked & visible (frosted behind the cover). The demo
    // loop in runDemo fades it out before bringing in the next one.
  }

  // Auto demo: drift the invoice up to the folder, hover (it opens), drop.
  const runDemo = async () => {
    if (tookOver.current || s === 0) return
    const tok = beginRun()
    // If a doc is still tucked from the previous round, fade it out first so the
    // reset doesn't snap it back to the rest spot.
    const wasTucked = phase.current === 'busy'
    if (wasTucked) {
      await fin(run(invOpacity, 0, { duration: 0.3 }))
      if (tok !== token.current) return
    }
    resetInvoice()
    invOpacity.set(wasTucked ? 0 : 1)
    if (wasTucked) {
      await fin(run(invOpacity, 1, { duration: 0.3 }))
      if (tok !== token.current) return
    }
    await sleep(650)
    if (tok !== token.current) return
    await Promise.all([
      fin(run(x, (FOLDER.cx - INVOICE.cx) * s, { type: 'spring', stiffness: 110, damping: 18 })),
      fin(run(y, (FOLDER.cy - 44 - INVOICE.cy) * s, { type: 'spring', stiffness: 110, damping: 18 })),
    ])
    if (tok !== token.current) return
    await sleep(420) // hover beat
    if (tok !== token.current) return
    await drop(tok)
    if (tok !== token.current || tookOver.current || !loop) return
    await sleep(loopDelay) // dwell: the folder holds the frosted invoice
    if (tok !== token.current || tookOver.current) return
    runDemo()
  }

  // Start/stop the demo with the in-view signal (paused offscreen, like the
  // other playground demos). Skipped under reduced motion or after a takeover.
  useEffect(() => {
    if (!play || s === 0 || reduced || tookOver.current) return undefined
    runDemo()
    return () => {
      beginRun()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, s, reduced])

  useEffect(
    () => () => {
      stopAll()
      clearTimers()
    },
    [],
  )

  // ---- real drag ----
  const onGrab = () => {
    tookOver.current = true // hand the scene to the user; auto demo stops
    beginRun()
    phase.current = 'drag'
    invOpacity.set(1)
    invScale.set(1)
    setInvZ(30)
    writeClip('')
  }
  const onRelease = () => {
    if (phase.current !== 'drag') return
    if (over.current) {
      const tok = beginRun()
      drop(tok)
    } else {
      phase.current = 'idle'
      run(x, 0, SPRING) // spring back home
      run(y, 0, SPRING)
    }
  }

  const onReplay = () => {
    tookOver.current = false
    runDemo()
  }

  if (s === 0) return <div ref={rootRef} className="fd" aria-hidden="true" />

  const centered = (cx, cy) => ({ left: cx * s + offsetX, top: cy * s + offsetY, translate: '-50% -50%' })

  return (
    <div ref={rootRef} className="fd" aria-label="Drag the invoice into the folder">
      {/* soft ground shadow */}
      <motion.div
        className="fd__shadow"
        style={{
          ...centered(FOLDER.cx, FOLDER.cy + FOLDER.w * FOLDER.ratio * 0.5 + 12),
          width: FOLDER.w * 1.05 * s,
          height: 26 * s,
          opacity: shadow,
        }}
      />

      {/* valid-target glow */}
      <motion.div
        className="fd__glow"
        style={{ ...centered(FOLDER.cx, FOLDER.cy), width: 250 * s, height: 250 * s, opacity: glow }}
      />

      {/* folder back */}
      <motion.svg
        className="fd__svg fd__back"
        viewBox="0 0 171 157"
        style={{
          ...centered(FOLDER.cx, FOLDER.cy),
          width: FOLDER.w * s,
          height: FOLDER.w * FOLDER.ratio * s,
          scale: folderScale,
          transformOrigin: '50% 50%',
        }}
      >
        <rect width="170.385" height="155.397" rx="26.82" fill="#FCC221" />
      </motion.svg>

      {/* invoice (draggable) */}
      <motion.div
        ref={invoiceRef}
        className="fd__invoice"
        style={{
          ...centered(INVOICE.cx, INVOICE.cy),
          width: INVOICE.w * s,
          height: INVOICE.w * INVOICE.ratio * s,
          x,
          y,
          scale: invScale,
          opacity: invOpacity,
          zIndex: invZ,
          touchAction: 'none',
        }}
        drag
        dragConstraints={rootRef}
        dragElastic={0.16}
        dragMomentum={false}
        onDragStart={onGrab}
        onDragEnd={onRelease}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 1.06 }}
      >
        <InvoiceSVG />
      </motion.div>

      {/* folder front cover — a frosted-glass pocket that reveals the invoice
          tucked behind it; scales with the back and tilts open from the bottom */}
      <motion.div
        className="fd__front-wrap"
        style={{
          ...centered(FOLDER.cx, FOLDER.cy),
          width: FOLDER.w * s,
          height: FOLDER.w * FOLDER.ratio * s,
          scale: folderScale,
          transformOrigin: '50% 50%',
        }}
      >
        {/* map the 171×157 pocket artwork onto the scaled folder box */}
        <div className="fd__front-scale" style={{ transform: `scale(${(FOLDER.w * s) / 171})` }}>
          <motion.div
            className="fd__front-glass"
            style={{
              rotateX: frontRotate,
              transformPerspective: 620,
              transformOrigin: '50% 100%',
              clipPath: `path('${FRONT_PATH}')`,
              WebkitClipPath: `path('${FRONT_PATH}')`,
            }}
          />
        </div>
      </motion.div>

      {/* green confirmation dot */}
      <motion.div
        className="fd__dot"
        style={{ ...centered(FOLDER.cx + 54, FOLDER.cy - 58), width: 16 * s, height: 16 * s, scale: dotScale, opacity: dotOpacity }}
      />

      <button type="button" className="fd__replay" aria-label="Replay" onClick={onReplay}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

function InvoiceSVG() {
  return (
    <svg className="fd__svg" viewBox="0 0 116 175" fill="none" aria-hidden="true">
      <rect x="0.394" y="0.394" width="114.379" height="173.54" rx="13.804" fill="white" stroke="#F3F3F3" strokeWidth="0.789" />
      <path
        d="M12.4032 42.6211V21.4849H14.9633V42.6211H12.4032ZM19.6336 42.6211V26.8434H21.9258L21.9854 29.6715C22.8189 27.4983 24.6646 26.4861 26.8378 26.4861C30.4399 26.4861 32.1665 29.1356 32.1665 32.4698V42.6211H29.6659V33.1842C29.6659 30.2668 28.6835 28.6891 26.3019 28.6891C23.8608 28.6891 22.1342 30.2668 22.1342 33.1842V42.6211H19.6336ZM40.3686 42.6211L34.6231 26.8434H37.3619L41.9464 40.0609L46.5309 26.8434H49.2696L43.5242 42.6211H40.3686ZM57.8057 42.9783C53.4297 42.9783 50.5718 39.7632 50.5718 34.7322C50.5718 29.7012 53.4297 26.4861 57.8057 26.4861C62.1521 26.4861 65.0099 29.7012 65.0099 34.7322C65.0099 39.7632 62.1521 42.9783 57.8057 42.9783ZM57.8057 40.5968C60.6934 40.5968 62.3902 38.3939 62.3902 34.7322C62.3902 31.0706 60.6934 28.8677 57.8057 28.8677C54.8883 28.8677 53.1915 31.0706 53.1915 34.7322C53.1915 38.3939 54.8883 40.5968 57.8057 40.5968ZM68.1527 24.3725V21.4551H70.7724V24.3725H68.1527ZM68.2122 42.6211V26.8434H70.7128V42.6211H68.2122ZM81.7316 42.9783C77.3258 42.9783 74.4977 39.7335 74.4977 34.7322C74.4977 29.731 77.3258 26.4861 81.7316 26.4861C85.3635 26.4861 87.8939 28.4509 88.4297 31.9637L85.81 32.1423C85.4528 30.0585 83.875 28.8677 81.7316 28.8677C78.8143 28.8677 77.1174 31.0706 77.1174 34.7322C77.1174 38.3939 78.8143 40.5968 81.7316 40.5968C83.875 40.5968 85.4528 39.406 85.81 37.0245L88.4297 37.2031C87.8939 40.7159 85.3635 42.9783 81.7316 42.9783ZM98.0117 42.9783C93.5463 42.9783 90.7778 39.7335 90.7778 34.7322C90.7778 29.731 93.5463 26.4861 97.8926 26.4861C102.001 26.4861 104.859 29.4631 104.859 34.762V35.5062H93.3975C93.5761 38.8999 95.273 40.5968 98.0117 40.5968C100.066 40.5968 101.405 39.5549 101.941 37.9473L104.621 38.1557C103.787 40.9838 101.346 42.9783 98.0117 42.9783ZM93.3975 33.3033H102.12C101.882 30.2668 100.215 28.8677 97.8926 28.8677C95.4516 28.8677 93.8143 30.3859 93.3975 33.3033Z"
        fill="#DEDEDE"
      />
      <rect x="81.248" y="7.887" width="22.087" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="54.43" width="32.342" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="64.684" width="32.342" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="74.938" width="93.869" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="85.191" width="93.869" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="95.445" width="93.869" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="105.703" width="93.869" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="115.957" width="93.869" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="126.211" width="78.093" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="136.465" width="56.795" height="4.733" rx="1.578" fill="#F5F5F5" />
      <rect x="9.467" y="146.719" width="97.025" height="4.733" rx="1.578" fill="#F5F5F5" />
      <circle cx="14.594" cy="159.737" r="5.127" fill="#35DE65" />
    </svg>
  )
}

function useContainerSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}
