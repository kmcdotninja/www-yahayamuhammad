import { useCallback, useEffect, useRef, useState } from 'react'
import './AboutPage2.css'
import TopNav from './TopNav.jsx'
import Footer from './Footer.jsx'
import Picture from './Picture.jsx'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

// The live About page (rendered at /about). The original layout is parked at
// /about-old for later use.

const HEADLINE =
  "I'm a product designer and engineer building digital products for the world."

const LEDE =
  'I’ve designed products across healthcare, fintech, retail, and enterprise, taking ideas from research to production. My civil engineering background helps me solve real problems through design. I also lead and mentor designers at Friends of Figma Kano.'
// Real experience, sourced from the LinkedIn profile export (Profile.pdf).
const EXPERIENCE = [
  {
    period: 'Jul 2025 – Present',
    role: 'Senior Product Designer',
    company: 'Kutuby',
    body: 'Led the design strategy across the brand, Arabic lessons & games UI, and onboarding, making the app more engaging and functional.',
  },
  {
    period: 'Jan 2025 – Mar 2025',
    role: 'Product Designer',
    company: "Cuvris (Techstars '24)",
    body: 'Designed an AI platform to automate manual care-transition workflows.',
  },
  {
    period: 'Jun 2023 – May 2026',
    role: 'UI/UX Designer',
    company: 'eHealth Africa',
    body: 'Designed user-centric interfaces for healthcare providers accessing vaccine data, turning complex datasets into interactive prototypes and contributing to the design system and component libraries.',
  },
  {
    period: 'Apr 2022 – May 2024',
    role: 'Product Designer',
    company: 'PneumaCare',
    body: 'End-to-end feature design for healthcare-provider dashboards, from requirements and user needs through prototyping, testing, and implementation with developers; grew patient booking to a 40% conversion rate.',
  },
  {
    period: 'Mar 2020 – Dec 2021',
    role: 'Visual Designer',
    company: 'Yoda Box',
    body: 'Visual and UI design across mobile, tablet, TV, and web for Yoda Box for kids, plus growth workshops and design-curriculum books.',
  },
]

// Life gallery: every remaining photo, shown at its native aspect ratio in a
// masonry so sizes vary naturally instead of being cropped to a uniform box.
// Referenced as .webp so <Picture> derives the .avif sibling.
const GALLERY = [
  { src: '/about/mecca.webp', alt: 'In Mecca', cap: 'Makkah' },
  { src: '/about/singapore-street-2.webp', alt: 'At Gardens by the Bay, Singapore', cap: 'Gardens by the Bay' },
  { src: '/about/big-blue-sky.webp', alt: 'Under a big blue sky', cap: 'Big Blue Sky' },
  { src: '/about/madina.webp', alt: 'In Madina', cap: 'Madina' },
  { src: '/about/transit.webp', alt: 'In transit', cap: 'In Transit' },
  { src: '/about/singapore-street-1.webp', alt: 'On a street in Singapore', cap: 'North Bridge Singapore' },
  { src: '/about/ai-build.webp', alt: 'Building with AI', cap: 'AI coding' },
]

// "My approach" principles, each iconified with a hero sticker that reflects
// Yahaya. These are SVG stickers, so plain <img> (no AVIF derivation).
const APPROACH = [
  {
    icon: '/playground/stickers/Search.svg',
    w: 238,
    h: 224,
    title: 'Start with the problem',
    body: 'I came to design from civil engineering, so I dig into the constraints and root cause before touching a pixel.',
  },
  {
    icon: '/playground/stickers/Pallete.svg',
    w: 284,
    h: 239,
    title: 'Sweat the craft',
    body: 'Clear, human, and joyful. The details are where trust is earned, so I obsess over them.',
  },
  {
    icon: '/playground/stickers/Door.svg',
    w: 259,
    h: 252,
    title: 'Design for outcomes',
    body: 'Design isn’t decoration. I treat it as a lever for retention, conversion, and real business growth.',
  },
  {
    icon: '/playground/stickers/5.svg',
    w: 433,
    h: 360,
    title: 'Learn & give back',
    body: 'I keep learning across design and engineering, and give back by mentoring the designers coming up behind me.',
  },
]

// Left/right arrows for the "Drag me" pill.
function DragIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 7 4 12 9 17" />
      <polyline points="15 7 20 12 15 17" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

export default function AboutPage2() {
  const galleryRef = useRef(null)
  const trackRef = useRef(null)
  const pillRef = useRef(null)
  const offsetRef = useRef(0)
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0 })
  const [pillVisible, setPillVisible] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Auto-scrolling marquee: the track drifts left forever and loops seamlessly
  // because the photos are rendered twice (wrap by one group width). Dragging
  // pauses the drift and moves the track directly; it resumes on release.
  // Honours reduced motion (drift off; drag still works).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    let last = 0
    let groupWidth = 0
    const SPEED = reduced ? 0 : 42 // px/s, gentle drift

    // Two identical halves, so one group is exactly half the track.
    const measure = () => {
      groupWidth = track.scrollWidth / 2
    }
    const frame = (now) => {
      if (!last) last = now
      const dt = now - last
      last = now
      if (!dragRef.current.active && SPEED) {
        offsetRef.current -= (SPEED * dt) / 1000
      }
      if (groupWidth) {
        if (offsetRef.current <= -groupWidth) offsetRef.current += groupWidth
        else if (offsetRef.current > 0) offsetRef.current -= groupWidth
      }
      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`
      raf = requestAnimationFrame(frame)
    }

    measure()
    // Item widths depend on each photo's decoded aspect at the fixed height, so
    // re-measure as photos load, on window load, and on resize.
    const imgs = [...track.querySelectorAll('img')]
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', measure, { once: true })
    })
    window.addEventListener('load', measure, { once: true })
    window.addEventListener('resize', measure)
    const settle = setTimeout(measure, 600)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
      window.removeEventListener('resize', measure)
      window.removeEventListener('load', measure)
    }
  }, [reduced])

  // Move the cursor pill without spamming React state (mirrors the project grid).
  const movePill = useCallback((x, y) => {
    const pill = pillRef.current
    if (pill) {
      pill.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }
  }, [])

  // Drag works for mouse + touch (touch-action: pan-y keeps vertical page
  // scroll). The "Drag me" pill is mouse-only, like the project grid's "Open".
  const onGalleryEnter = useCallback(
    (e) => {
      if (e.pointerType !== 'mouse') return
      setPillVisible(true)
      movePill(e.clientX, e.clientY)
    },
    [movePill],
  )

  const onGalleryMove = useCallback(
    (e) => {
      if (e.pointerType === 'mouse') movePill(e.clientX, e.clientY)
      const drag = dragRef.current
      if (drag.active) {
        offsetRef.current = drag.startOffset + (e.clientX - drag.startX)
      }
    },
    [movePill],
  )

  const onGalleryLeave = useCallback(() => {
    setPillVisible(false)
    if (dragRef.current.active) {
      dragRef.current.active = false
      galleryRef.current?.classList.remove('is-dragging')
    }
  }, [])

  const onGalleryDown = useCallback((e) => {
    const el = galleryRef.current
    if (!el) return
    if (e.pointerType === 'mouse') e.preventDefault()
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startOffset: offsetRef.current,
    }
    el.classList.add('is-dragging')
    el.setPointerCapture?.(e.pointerId)
  }, [])

  const onGalleryUp = useCallback((e) => {
    dragRef.current.active = false
    const el = galleryRef.current
    if (!el) return
    el.classList.remove('is-dragging')
    if (e.pointerId != null) el.releasePointerCapture?.(e.pointerId)
  }, [])

  return (
    <>
      <TopNav />

      <main className="ab2">
        <section className="ab2__hero">
          <h1 className="ab2__headline" data-reveal>
            {HEADLINE}
          </h1>
          <p className="ab2__lede" data-reveal>
            {LEDE}
          </p>
        </section>

        <section className="ab2__portraits" data-reveal>
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
            <figcaption className="ab2__portrait-cap">Headshot</figcaption>
          </figure>
          <figure className="ab2__portrait">
            <Picture
              src="/about/workspace.webp"
              alt="At the studio"
              className="ab2__portrait-img"
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <figcaption className="ab2__portrait-cap">At the studio</figcaption>
          </figure>
        </section>

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

        <hr className="ab2__rule" />

        <section className="ab2__work">
          <h2 className="ab2__work-title" data-reveal>
            Work Experience
          </h2>
          <ul className="ab2__exp">
            {EXPERIENCE.map((x) => (
              <li className="ab2__exp-row" key={x.company} data-reveal>
                <span className="ab2__exp-role">
                  <span className="ab2__exp-role-title">{x.role}</span>
                  <span className="ab2__exp-company">{x.company}</span>
                </span>
                <span className="ab2__exp-period">{x.period}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          ref={galleryRef}
          className="ab2__gallery"
          data-reveal
          aria-label="Photos from my life and work"
          onPointerEnter={onGalleryEnter}
          onPointerMove={onGalleryMove}
          onPointerLeave={onGalleryLeave}
          onPointerDown={onGalleryDown}
          onPointerUp={onGalleryUp}
          onPointerCancel={onGalleryUp}
        >
          {/* Rendered twice so the marquee can loop seamlessly (the second set is
              an aria-hidden duplicate). Eager so off-screen photos still load. */}
          <div ref={trackRef} className="ab2__gallery-track">
            {[...GALLERY, ...GALLERY].map((img, i) => (
              <figure
                className="ab2__gallery-item"
                key={i}
                aria-hidden={i >= GALLERY.length || undefined}
              >
                <Picture
                  src={img.src}
                  alt={i < GALLERY.length ? img.alt : ''}
                  className="ab2__gallery-img"
                  loading="eager"
                  decoding="async"
                  fetchPriority="low"
                  draggable={false}
                />
                <figcaption className="ab2__gallery-cap">{img.cap}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <span
          ref={pillRef}
          className={`ab2__drag-pill${pillVisible ? ' ab2__drag-pill--visible' : ''}`}
          aria-hidden="true"
        >
          <DragIcon />
          Drag me
        </span>
      </main>

      <Footer />
    </>
  )
}
