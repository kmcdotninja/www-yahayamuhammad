import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
// The page reuses the live About stylesheet for its hero, portraits and
// approach grid rather than a copy of it, so those sections can't drift apart.
// Only the timeline has its own CSS.
import './AboutPage2.css'
import './AboutTimelinePage.css'
import TopNav from './TopNav.jsx'
import Footer from './Footer.jsx'
import Picture from './Picture.jsx'
import { withLinks } from '../lib/inlineLinks.jsx'
import StickerBurst from './StickerBurst.jsx'

// Friends of Figma sticker, streamed off the lede's link on hover.
const FOF_STICKER = '/stickers/FoF.svg'
import { getLenis } from '../lib/lenisStore.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { KITS, SOUNDS, useSnd, warmKit } from '../hooks/useSnd.js'

// All the words, dates and photographs on this page live in src/data/timeline.js
// so they can be edited without touching any of the logic below.
import { APPROACH, HEADLINE, LEDE, TIMELINE } from '../data/timeline.js'

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Months since year 0 — a single integer axis makes every position on the
// ruler a plain lerp, including the interpolated playhead date.
const toMonths = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1
const monthName = (m) => MONTHS_SHORT[((m % 12) + 12) % 12]
const yearOf = (m) => Math.floor(m / 12)

// Breathing room between two adjacent labels before they count as colliding.
const LABEL_GAP = 10

// How close to the top of the viewport the ruler gets before it takes the
// header over from the nav. Deliberately ahead of the stick point so the nav
// has cleared by the time the two would overlap.
const HANDOFF = 140

// Below this the ruler switches to "tape": the axis becomes several screens
// wide and slides horizontally under a fixed playhead as you scroll, instead of
// compressing six years into a phone's width. Same data, legible type.
const TAPE_MQ = '(max-width: 760px)'
// Where the playhead parks across the frame while the tape is mid-travel.
const TAPE_ANCHOR = 0.42

// How far into the second row of a collapsed gallery the fade cuts — enough of
// the next images to read as "there is more", not enough to be worth reading.
const PEEK_INTO_NEXT = 0.25

// The ruler ticks over as the playhead crosses each month, like the detent on a
// dial. Kit 01 — the same one the nav, the theme toggle and the sticker input
// click with — so the timeline sounds like the rest of the site rather than
// importing a second voice, and costs no extra sprite to fetch. `tap` resolves
// to one of five variants per call, which is what stops a fast scroll from
// sounding like a machine gun.
const TICK_KIT = KITS.DEFAULT
const TICK_SOUND = SOUNDS.TAP
const TICK_VOLUME = 0.35
// One detent per this much scrolling. Deliberately measured in scroll distance
// rather than in months crossed: the playhead's speed varies enormously between
// chapters (a short section spanning three empty years races, a tall photo grid
// spanning one month crawls), so a click per month came out as bursts separated
// by silences up to 880px long. Distance is what the hand is doing, and it is
// even everywhere.
const TICK_EVERY_PX = 45
// Upper bound on the rate, for flings — without it the ratchet becomes a buzz.
const TICK_MIN_MS = 55

// A pointer that moves further than this counts as a drag, not a tap on a
// marker.
const DRAG_SLOP = 6

// Breathing room under the pinned ruler. See `readLine` below.
const READ_GAP = 96

// Eases the playhead across each chapter instead of running it at a constant
// rate. Two things fall out of it, and both matter:
//
//   · Precision. The date lingers near the chapter's own mark while you are at
//     the top of that chapter — where its heading and copy are — rather than
//     drifting off the moment the section begins.
//
//   · Smoothness. Chapters differ in height and in how many months they span,
//     so a linear ramp changes speed abruptly at every boundary. Smoothstep's
//     velocity is zero at both ends, so consecutive chapters join with no
//     visible change of pace — continuous the whole way down, and exactly on a
//     chapter's mark at the moment you arrive at it.
const smoothstep = (t) => t * t * (3 - 2 * t)

// Its exact inverse — needed to run the playhead backwards: dragging the tape
// gives a date, and the page has to be scrolled to wherever that date lives.
const unSmoothstep = (u) => {
  const c = Math.min(1, Math.max(0, u))
  return 0.5 - Math.sin(Math.asin(1 - 2 * c) / 3)
}

// A title's line breaks are authored (\n in the data file), because these are
// set in a display face at hero size — where a line turns is a composition
// call, not something the column width should decide. Plain strings still work.
const titleLines = (t) => (Array.isArray(t) ? t : String(t).split('\n'))

// Labels hang rightwards from their tick, so the last one would spill past the
// axis — pull it back just far enough to sit inside.
const clampX = (x, labelW, w) => Math.max(0, Math.min(x, w - labelW))

// Year numerals thin out by taking every Nth mark rather than greedily
// dropping whichever one happens to collide: a ruler wants an even rhythm
// (2020 · 2022 · 2024 · 2026), not an arbitrary gap. Counted from the end so
// the most recent year — the one the axis runs up to — always survives.
function fitStride(positions, labelW, w) {
  for (let stride = 1; stride <= positions.length; stride++) {
    let ok = true
    let lastEnd = -Infinity
    for (let i = positions.length - 1; i >= 0; i -= stride) {
      const x = clampX(positions[i], labelW, w)
      if (x + labelW > lastEnd - LABEL_GAP && lastEnd !== -Infinity) {
        ok = false
        break
      }
      lastEnd = x
    }
    if (ok) return stride
  }
  return positions.length
}

// ---------------------------------------------------------------------------
// A chapter's photographs
// ---------------------------------------------------------------------------
// A masonry chapter marked `collapse` in the data opens showing only the top of
// the grid behind a fade, with an "All photos" control. Ten photographs from one
// trip would otherwise dwarf the chapters around it and push the rest of the
// page a screen and a half further down.
function Shots({ chapter }) {
  const { shots, layout } = chapter
  const masonry = layout === 'masonry'
  const kind = masonry ? 'masonry' : layout === 'strip' ? 'strip' : 'row'
  const collapsible = masonry && chapter.collapse && shots.length > 1
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const reduced = useReducedMotion()

  // Cut the peek at a line the photographs themselves decide: every image in the
  // first row fully closed, then a quarter of the way into the row beneath, so it
  // is unmistakable that there is more underneath rather than looking like the
  // grid simply ends. Measured rather than guessed at a fixed height, because
  // the column count and the images' heights both change with the viewport.
  //
  // Columns are found by x position (CSS multicol has no row boxes to read), and
  // the line is the furthest of the per-column lines — so no column gets cut
  // before its first image completes, and every column shows at least a quarter
  // of its second.
  useLayoutEffect(() => {
    if (!collapsible || open) return
    const wrap = wrapRef.current
    const list = listRef.current
    if (!wrap || !list) return

    const measure = () => {
      const items = [...list.children]
      if (!items.length) return
      const top = list.getBoundingClientRect().top
      const cols = new Map()
      items.forEach((li) => {
        const r = li.getBoundingClientRect()
        const key = Math.round(r.left / 4) // tolerate subpixel column edges
        if (!cols.has(key)) cols.set(key, [])
        cols.get(key).push(r)
      })
      let line = 0
      cols.forEach((rects) => {
        const [first, second] = rects
        const edge = second
          ? second.top - top + second.height * PEEK_INTO_NEXT
          : first.bottom - top
        line = Math.max(line, edge)
      })
      if (line > 0) wrap.style.setProperty('--tl-peek', `${Math.round(line)}px`)
    }

    measure()
    // The list's own height is unaffected by the clip we apply to its wrapper,
    // so observing it here cannot feed back into itself.
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [collapsible, open])

  // Growing the gallery moves everything below it, so anything measuring the
  // document has to re-measure: our own playhead maths, and GSAP's ScrollTrigger
  // positions for the sections after this one. Both already listen for resize,
  // which is cheaper than importing GSAP here just to call refresh().
  const settle = () => window.dispatchEvent(new Event('resize'))

  const expand = () => {
    const el = wrapRef.current
    const start = el?.getBoundingClientRect().height
    setOpen(true)
    if (!el || reduced) {
      settle()
      return
    }
    // Measured after the clip class is gone, so the target is the real height
    // rather than a guess. The wrapper keeps `overflow: hidden` throughout, so
    // the reveal is a genuine wipe and not a pop.
    requestAnimationFrame(() => {
      el.animate(
        [{ maxHeight: `${start}px` }, { maxHeight: `${el.scrollHeight}px` }],
        { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      ).finished.then(settle, settle)
    })
  }

  if (!shots.length) return null

  return (
    <div
      ref={wrapRef}
      className={`tl__gallery${collapsible && !open ? ' is-clipped' : ''}`}
    >
      <ul
        ref={listRef}
        className={`tl__shots tl__shots--${kind}${
          shots.length === 1 && kind === 'row' ? ' tl__shots--single' : ''
        }`}
        data-reveal-stagger
      >
        {shots.map((s) => (
          <li className="tl__shot" key={s.src} style={{ '--ar': s.ar }}>
            <Picture
              src={s.src}
              alt={s.alt}
              className="tl__shot-img"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={false}
              sizes="(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 25vw"
              // Only set when a photo is cropped (`ar` shorter than the file's
              // own ratio) and the part worth keeping isn't centred.
              style={s.pos ? { objectPosition: s.pos } : undefined}
            />
            <span
              className={`tl__shot-cap${s.capTone === 'dark' ? ' tl__shot-cap--dark' : ''}`}
            >
              {s.cap}
            </span>
          </li>
        ))}
      </ul>

      {collapsible && !open && (
        <div className="tl__more">
          <button
            type="button"
            className="tl__more-btn"
            onClick={expand}
            aria-expanded="false"
          >
            All photos
            <span className="tl__more-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path
                  d="M12 5v13m0 0 5.5-5.5M12 18l-5.5-5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The timeline itself
// ---------------------------------------------------------------------------
function Timeline() {
  const rulerRef = useRef(null)
  const axisRef = useRef(null)
  const viewRef = useRef(null)
  // Axis + frame widths, refreshed on resize rather than read per frame.
  const dimsRef = useRef({ axisW: 0, viewW: 0 })
  const tapeRef = useRef(false)
  const chapterRefs = useRef([])
  // Per-frame values are written straight to CSS vars; only these coarse values
  // go through React, and each is gated on an actual change, so a full scroll of
  // the track costs a handful of renders rather than one per frame.
  const [headMonth, setHeadMonth] = useState(() => toMonths(TIMELINE[0].date))
  const [activeIdx, setActiveIdx] = useState(0)
  // Which marker the pointer (or keyboard focus) is on, so the ruler can show
  // it is a target rather than just a graphic.
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [layout, setLayout] = useState({
    monthX: [],
    hidden: [],
    yearX: [],
    stride: 1,
    hideRadius: 0,
  })
  const lastHead = useRef(-1)
  const lastIdx = useRef(-1)
  const lastPinned = useRef(false)
  const lastTick = useRef(0)
  const lastTickY = useRef(0)
  // The playhead's live fractional month, so a drag can start from exactly
  // where the ruler already is.
  const headFloat = useRef(0)
  const drag = useRef({ active: false, x: 0, from: 0, moved: 0 })
  // Set for the duration of a drag's own click event, so releasing on top of a
  // marker doesn't also jump to it.
  const dragged = useRef(false)
  const { play } = useSnd(TICK_KIT)

  // The axis runs from January of the first chapter's year to today, so the
  // right-hand end always reads as "now" without a hardcoded end date.
  const axis = useMemo(() => {
    const marks = TIMELINE.map((c) => toMonths(c.date))
    const now = new Date()
    const from = yearOf(marks[0]) * 12
    const to = Math.max(
      now.getFullYear() * 12 + now.getMonth(),
      marks[marks.length - 1] + 3,
    )
    return { marks, from, to, span: Math.max(1, to - from) }
  }, [])

  const years = useMemo(() => {
    const out = []
    for (let y = yearOf(axis.from); y <= yearOf(axis.to); y++) out.push(y)
    return out
  }, [axis])

  const pos = useCallback((m) => (m - axis.from) / axis.span, [axis])

  // The reading line: a chapter becomes the current one when its top crosses
  // this, and it is also exactly where clicking a marker parks that chapter.
  // One line for both, so a click leaves the ruler reading that marker's date to
  // the month instead of a few months past it. It tracks the ruler's own height
  // rather than a fraction of the viewport, so it stays just under the bar at
  // every size.
  const readLine = useCallback(() => (rulerRef.current?.offsetHeight || 0) + READ_GAP, [])

  // Fetch the tick sprite up front — it is not the kit the rest of the site
  // warms, and the first crack should land on the first month crossed.
  useEffect(() => {
    warmKit(TICK_KIT)
  }, [])

  // Which mode the ruler is in. A ref, not state: the scroll loop reads it every
  // frame and nothing in the render depends on it — the CSS owns the switch.
  useEffect(() => {
    const mq = window.matchMedia(TAPE_MQ)
    const sync = () => {
      tapeRef.current = mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Marks the document while this page is mounted so the nav-handoff rules in
  // AboutTimelinePage.css (which have to survive .tl-pinned being removed, or
  // the nav would snap back rather than animate) can scope to this route only.
  useEffect(() => {
    // On <body>, not <html>: things watch <html> for class changes (see
    // useScrollAnimations), and a state class that toggles on every scroll has
    // no business waking them.
    const root = document.body
    root.classList.add('tl-page')
    return () => root.classList.remove('tl-page', 'tl-pinned')
  }, [])

  // Which labels fit, and where. Driven by the labels' *measured* widths against
  // the live axis width rather than by breakpoints, so the ruler stays legible
  // at any size — including sizes no media query anticipated. Crowding only
  // toggles opacity, so nothing here can feed back into a resize loop.
  useEffect(() => {
    const el = axisRef.current
    if (!el) return
    const widest = (sel, fallback) =>
      [...el.querySelectorAll(sel)].reduce((max, n) => Math.max(max, n.offsetWidth), 0) ||
      fallback

    const measure = () => {
      const w = el.clientWidth
      if (!w) return
      const monthW = widest('.tl__month', 26)
      const yearW = widest('.tl__year', 48)

      // Events are irregular by nature, so they get a greedy pass: keep a
      // label unless it would land on the one before it.
      const monthX = []
      const hidden = []
      let lastEnd = -Infinity
      axis.marks.forEach((m, i) => {
        const x = clampX(pos(m) * w, monthW, w)
        monthX[i] = (x / w) * 100
        const clash = x < lastEnd + LABEL_GAP
        hidden[i] = clash
        if (!clash) lastEnd = x + monthW
      })

      const yearPositions = years.map((y) => pos(y * 12) * w)

      // How near the playhead a label can sit before the chip lands on it. The
      // chip is opaque and paints over the top, but a label hanging rightwards
      // pokes its tail out the far side — so it hides instead. Expressed in
      // months, because that is what the playhead is measured in, but derived
      // from pixels: at 320px a month is ~3.5px wide and at 1512px it is ~18px,
      // so a fixed month count would be wrong at one end or the other.
      const chipW = rulerRef.current?.querySelector('.tl__head-chip')?.offsetWidth || 40
      const pxPerMonth = w / axis.span
      dimsRef.current = { axisW: w, viewW: viewRef.current?.clientWidth || w }

      setLayout({
        monthX,
        hidden,
        yearX: yearPositions.map((x) => (clampX(x, yearW, w) / w) * 100),
        stride: fitStride(yearPositions, yearW, w),
        hideRadius: (chipW / 2 + monthW) / pxPerMonth,
      })
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Doto is a webfont: label widths change the moment it swaps in.
    document.fonts?.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [axis, pos, years])

  // Drive the playhead, and hand the header back and forth with the nav.
  // The anchor is a fixed line across the viewport; the chapter straddling it
  // decides where in time we are, and the fraction of that chapter scrolled past
  // interpolates towards the next chapter's date. That gives a continuous sweep
  // rather than a snap per section.
  useEffect(() => {
    const ruler = rulerRef.current
    if (!ruler) return
    let pending = false

    // A detent every TICK_EVERY_PX of scrolling, but only while the ruler is
    // pinned — the approach and the run-out stay silent, so the sound belongs to
    // the timeline rather than to the page.
    //
    // Deliberately NOT gated on prefers-reduced-motion. That preference is about
    // vestibular comfort, not sound; wiring audio to it silences the ticks for
    // anyone with macOS "Reduce Motion" on, who never asked for that. A real
    // mute belongs in the nav next to the theme toggle.
    const tick = (y) => {
      if (!lastPinned.current) return
      if (Math.abs(y - lastTickY.current) < TICK_EVERY_PX) return
      const now = performance.now()
      // The distance mark is only consumed when a click actually fires, so a
      // fling doesn't silently swallow the detents it flew past — it just plays
      // them at the ceiling rate instead.
      if (now - lastTick.current < TICK_MIN_MS) return
      lastTick.current = now
      lastTickY.current = y
      play(TICK_SOUND, { volume: TICK_VOLUME })
    }

    const update = () => {
      pending = false

      // Resolved first: the tick below gates on it, and the class toggle is
      // what hands the header back and forth with the nav.
      const rect = ruler.getBoundingClientRect()
      const pinned = rect.top <= HANDOFF && rect.bottom > 8
      if (pinned !== lastPinned.current) {
        lastPinned.current = pinned
        // Start measuring from here, so arriving at the timeline doesn't fire a
        // burst for the distance scrolled to reach it.
        if (pinned) lastTickY.current = window.scrollY
        document.body.classList.toggle('tl-pinned', pinned)
      }

      const anchor = readLine()
      let idx = 0
      let local = 0
      for (let i = 0; i < chapterRefs.current.length; i++) {
        const el = chapterRefs.current[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        // The 1px slack matters: clicking a marker parks a chapter's top exactly
        // on this line, and subpixel rounding would otherwise leave `r.top` a
        // hair above it — so the previous chapter would stay highlighted at the
        // very moment you had just jumped to this one.
        if (r.top > anchor + 1) break
        idx = i
        local = Math.min(1, Math.max(0, (anchor - r.top) / Math.max(1, r.height)))
      }
      const from = axis.marks[idx]
      const to = idx + 1 < axis.marks.length ? axis.marks[idx + 1] : axis.to
      const months = from + (to - from) * smoothstep(local)
      headFloat.current = months
      const frac = (months - axis.from) / axis.span
      ruler.style.setProperty('--tl-x', `${(frac * 100).toFixed(3)}%`)

      // Tape mode: slide the axis so the current date meets the playhead. The
      // shift is clamped to the tape's own ends, so instead of opening a gap at
      // either extreme the tape stays full and the playhead travels the last
      // stretch itself — the way a scrollbar thumb does.
      if (tapeRef.current) {
        const { axisW, viewW } = dimsRef.current
        if (axisW && viewW) {
          const x = frac * axisW
          const shift = Math.min(0, Math.max(viewW - axisW, viewW * TAPE_ANCHOR - x))
          ruler.style.setProperty('--tl-shift', `${shift.toFixed(1)}px`)
          ruler.style.setProperty('--tl-anchor', `${(x + shift).toFixed(1)}px`)
        }
      }
      const rounded = Math.round(months)
      if (rounded !== lastHead.current) {
        // A first run has no previous month to have crossed, so it stays silent
        // — otherwise arriving on the page would click at you.
        lastHead.current = rounded
        setHeadMonth(rounded)
      }
      tick(window.scrollY)
      if (idx !== lastIdx.current) {
        lastIdx.current = idx
        setActiveIdx(idx)
      }

      // The ruler owns the top of the screen for exactly as long as it is
      // pinned: from its approach until it releases at the end of the track and
      // clears the viewport, at which point the nav comes back for the rest of
      // the page. Toggled on the class rather than through state so a scroll
      // frame never triggers a render.

    }

    const onScroll = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      document.body.classList.remove('tl-pinned')
      lastPinned.current = false
    }
  }, [axis, readLine, play])

  // The inverse of the playhead: given a date, where does the page have to be
  // scrolled to for the ruler to read it? Finds the chapter whose span contains
  // the date, undoes the easing to get how far into that chapter it falls, and
  // converts that back to a document offset.
  const scrollForMonth = useCallback(
    (m) => {
      const marks = axis.marks
      let i = 0
      while (i < marks.length - 1 && m >= marks[i + 1]) i++
      const from = marks[i]
      const to = i + 1 < marks.length ? marks[i + 1] : axis.to
      const el = chapterRefs.current[i]
      if (!el) return window.scrollY
      const local = to === from ? 0 : unSmoothstep((m - from) / (to - from))
      const top = el.getBoundingClientRect().top + window.scrollY
      return Math.max(0, top + local * el.offsetHeight - readLine())
    },
    [axis, readLine],
  )

  // Dragging the tape scrubs the timeline. It moves the *page*, not just the
  // ruler — the ruler is a readout of scroll position, so moving it on its own
  // would only desync it from the chapter you are looking at. Tape mode only:
  // on a desktop the axis is static and the markers are click targets.
  const onScrubStart = useCallback((e) => {
    if (!tapeRef.current) return
    drag.current = {
      active: true,
      locked: false,
      x: e.clientX,
      y: e.clientY,
      from: headFloat.current,
      moved: 0,
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [])

  const onScrubMove = useCallback(
    (e) => {
      const d = drag.current
      if (!d.active) return
      const { axisW } = dimsRef.current
      if (!axisW) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      // Recorded before the lock decides, and on both axes: a drag that turns
      // out to be vertical still has to count as a drag, or releasing it over a
      // marker fires that marker's click and the page jumps to another chapter —
      // which is most of what "it shifts when I drag" was.
      d.moved = Math.max(d.moved, Math.abs(dx), Math.abs(dy))

      // Direction lock. The ruler sits in the middle of a page you also need to
      // scroll, and `touch-action: pan-y` means the browser may be panning
      // vertically at the same time as this handler runs — two things moving the
      // page at once, which is what made it feel unstable. So: stay out of the
      // way until the gesture declares itself, then take only the horizontal
      // ones and hand the vertical ones straight back to the browser.
      if (!d.locked) {
        if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return
        if (Math.abs(dy) >= Math.abs(dx)) {
          d.active = false
          return
        }
        d.locked = true
        // Only now is this ours, so only now does Lenis need to stand down —
        // it would otherwise smooth every drag frame into a lag.
        getLenis()?.stop()
      }

      // Drag right, go back in time: the tape moves with the finger.
      const target = d.from - (dx * axis.span) / axisW
      const m = Math.min(axis.to, Math.max(axis.from, target))
      window.scrollTo(0, scrollForMonth(m))
    },
    [axis, scrollForMonth],
  )

  const onScrubEnd = useCallback((e) => {
    const d = drag.current
    d.active = false
    dragged.current = d.moved > DRAG_SLOP
    if (d.locked) getLenis()?.start()
    d.locked = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    // Cleared after the click that follows this release has been and gone.
    setTimeout(() => {
      dragged.current = false
    }, 0)
  }, [])

  // Marker → chapter. Offset by the ruler's own height so the chapter heading
  // lands just under the bar it stuck to rather than behind it.
  const jumpTo = useCallback((i) => {
    if (dragged.current) return
    const el = chapterRefs.current[i]
    if (!el) return
    const offset = -readLine()
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 })
    else {
      window.scrollTo({
        top: window.scrollY + el.getBoundingClientRect().top + offset,
        behavior: 'smooth',
      })
    }
  }, [readLine])

  const headYear = yearOf(headMonth)

  return (
    <section className="tl" style={{ '--tl-months': axis.span }}>
      <div className="tl__ruler" ref={rulerRef}>
        {/* On a phone the axis is far wider than the screen and slides under a
            fixed playhead (see the tape block in the CSS), so it needs a
            clipping frame — and the playhead has to live outside the part that
            moves. */}
        <div
          className="tl__viewport"
          ref={viewRef}
          onPointerDown={onScrubStart}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubEnd}
          // The browser claims a vertical pan (touch-action: pan-y) by
          // cancelling our pointer, so the drag has to end here too or it would
          // keep scrubbing from a stale origin.
          onPointerCancel={onScrubEnd}
        >
        <div className="tl__axis" ref={axisRef}>
          <div className="tl__ticks">
            {years.map((y) => (
              <span
                key={`yt-${y}`}
                className="tl__tick tl__tick--year"
                style={{ left: `${pos(y * 12) * 100}%` }}
                aria-hidden="true"
              />
            ))}
            {TIMELINE.map((c, i) => (
              <span
                key={`et-${c.id}`}
                className={`tl__tick tl__tick--event${i === activeIdx ? ' is-active' : ''}`}
                style={{ left: `${pos(axis.marks[i]) * 100}%` }}
                aria-hidden="true"
              />
            ))}
            {TIMELINE.map((c, i) => (
              <button
                key={`jump-${c.id}`}
                type="button"
                className="tl__jump"
                style={{ left: `${pos(axis.marks[i]) * 100}%` }}
                onClick={() => jumpTo(i)}
                onPointerEnter={() => setHoverIdx(i)}
                onPointerLeave={() => setHoverIdx((h) => (h === i ? -1 : h))}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx((h) => (h === i ? -1 : h))}
                title={titleLines(c.title).join(' ')}
                aria-label={`Jump to ${titleLines(c.title).join(' ')}, ${monthName(
                  axis.marks[i],
                )} ${yearOf(axis.marks[i])}`}
              />
            ))}
          </div>

          <div className="tl__months">
            {TIMELINE.map((c, i) => (
              <span
                key={`m-${c.id}`}
                // A label under the chip is dropped rather than highlighted:
                // the chip is already naming that month, in that spot, and two
                // copies of "Apr" fight each other. Hovering a marker brings
                // its label back if crowding had dropped it — but not if the
                // chip is on it, since the chip is already saying the same
                // thing and the label would poke out from behind it.
                className={`tl__month${
                  Math.abs(axis.marks[i] - headMonth) <= layout.hideRadius ||
                  (layout.hidden[i] && i !== hoverIdx)
                    ? ' tl__month--off'
                    : ''
                }${i === hoverIdx ? ' is-hover' : ''}`}
                style={{ left: `${layout.monthX[i] ?? pos(axis.marks[i]) * 100}%` }}
                aria-hidden="true"
              >
                {monthName(axis.marks[i])}
              </span>
            ))}
          </div>

          <div className="tl__years">
            {years.map((y, i) => (
              <span
                key={`y-${y}`}
                className={`tl__year${y === headYear ? ' is-active' : ''}${
                  (years.length - 1 - i) % layout.stride ? ' tl__year--off' : ''
                }`}
                style={{ left: `${layout.yearX[i] ?? pos(y * 12) * 100}%` }}
                aria-hidden="true"
              >
                {y}
              </span>
            ))}
          </div>
        </div>

          <span className="tl__head" aria-hidden="true" />
          <span className="tl__head-chip" aria-hidden="true">
            {monthName(headMonth)}
          </span>
        </div>
      </div>

      <div className="tl__chapters">
        {TIMELINE.map((c, i) => (
          <article
            key={c.id}
            id={c.id}
            className="tl__chapter"
            ref={(el) => {
              chapterRefs.current[i] = el
            }}
          >
            <header className="tl__chapter-head">
              <h2 className="tl__chapter-title" data-reveal>
                {titleLines(c.title).map((line) => (
                  <span className="tl__chapter-line" key={line}>
                    {line}
                  </span>
                ))}
              </h2>
              <div data-reveal>
                {/* Always the start date, never a range — the same stamp the
                    trips carry, and the same date the ruler marks. How long a
                    role ran is already told by the distance to the next mark. */}
                <span className="tl__chapter-when">
                  {monthName(axis.marks[i])} {yearOf(axis.marks[i])}
                </span>
                <p className="tl__chapter-body">{c.body}</p>
              </div>
            </header>

            <Shots chapter={c} />
          </article>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page — the About hero and portraits, then the timeline, then the approach
// grid. No work-experience list and no photo marquee: the timeline carries the
// career and the photographs on one track. Parked at /about-timeline alongside
// /about and /about-old.
// ---------------------------------------------------------------------------
export default function AboutTimelinePage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <TopNav />

      <main className="ab2">
        <section className="ab2__hero">
          <h1 className="ab2__headline" data-reveal>
            {/* Breaks are authored, not left to the measure: a short indented
                opener over two full-width lines is a composition. Below the
                desktop breakpoint they revert to inline and wrap naturally. */}
            {HEADLINE.split('\n').map((line) => (
              <span className="ab2__headline-line" key={line}>
                {line}{' '}
              </span>
            ))}
          </h1>
          <p className="ab2__lede" data-reveal>
            {withLinks(LEDE, (a, href) =>
              href.includes('friends.figma.com') ? (
                <StickerBurst src={FOF_STICKER}>{a}</StickerBurst>
              ) : (
                a
              ),
            )}
          </p>
        </section>

        {/* The portraits are sized to break the fold under the hero (see
            .ab2__hero in AboutPage2.css) — so they reveal as soon as any of
            that band shows, rather than waiting for the usual 92% mark and
            leaving the tease blank. */}
        <section className="ab2__portraits" data-reveal data-reveal-start="top 99%">
          <figure className="ab2__portrait">
            <Picture
              src="/images/headshot.webp"
              alt="Yahaya Muhammad"
              className="ab2__portrait-img"
              width={1100}
              height={1956}
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <figcaption className="ab2__portrait-cap">This is me</figcaption>
          </figure>
          <figure className="ab2__portrait">
            <Picture
              src="/about/ai-build.webp"
              alt="A working session on screen at the desk"
              className="ab2__portrait-img"
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <figcaption className="ab2__portrait-cap">At the desk</figcaption>
          </figure>
        </section>

        <Timeline />

        <hr className="ab2__rule" />

        <section className="ab2__approach">
          <h2 className="ab2__approach-title" data-reveal>
            My Approach
          </h2>
          <ul className="ab2__approach-grid" data-reveal-stagger>
            {APPROACH.map((a) => (
              <li className="ab2__approach-card" key={a.title}>
                <span className="ab2__approach-icon-wrap">
                  <img
                    className="ab2__approach-icon"
                    src={a.icon}
                    alt=""
                    aria-hidden="true"
                    width={a.w}
                    height={a.h}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </span>
                <h3 className="ab2__approach-card-title">{a.title}</h3>
                <p className="ab2__approach-card-body">{a.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </>
  )
}
