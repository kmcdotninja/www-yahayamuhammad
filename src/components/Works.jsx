import { useEffect, useRef, useState } from 'react'
import './Works.css'
import ProjectDrawer from './ProjectDrawer.jsx'
import { projects } from '../data.js'

const AUTO_SPEED_PX_PER_FRAME = 0.5

function Project({ project, onOpen }) {
  const { name, description, roles, team, images, comingSoon } = project
  const scrollerRef = useRef(null)
  const pillRef = useRef(null)
  const hoverRef = useRef(false)
  const dragRef = useRef({
    dragging: false,
    pointerId: 0,
    startX: 0,
    startScroll: 0,
    moved: false,
  })
  const [grabbing, setGrabbing] = useState(false)
  const [pillVisible, setPillVisible] = useState(false)

  // Auto-scroll + seamless loop.
  // Safari rounds `scrollLeft` to an integer, so writing back `current + 0.5`
  // gets re-rounded to `current` and the scroller appears frozen. We
  // accumulate fractional deltas and only apply whole-pixel steps.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    let rafId
    let acc = 0
    const half = () => el.scrollWidth / 2

    const normalise = () => {
      const w = half()
      if (!w) return
      if (el.scrollLeft >= w) el.scrollLeft -= w
      else if (el.scrollLeft < 0) el.scrollLeft += w
    }

    const tick = () => {
      if (!hoverRef.current && !dragRef.current.dragging) {
        acc += AUTO_SPEED_PX_PER_FRAME
        if (acc >= 1) {
          const step = Math.floor(acc)
          el.scrollLeft += step
          acc -= step
          normalise()
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const onScroll = () => normalise()
    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  // ---- Drag ----
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = scrollerRef.current
    if (!el) return
    dragRef.current = {
      dragging: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    }
  }

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return
    if (e.pointerId !== dragRef.current.pointerId) return
    const dx = e.clientX - dragRef.current.startX
    if (Math.abs(dx) > 3 && !dragRef.current.moved) {
      dragRef.current.moved = true
      setGrabbing(true)
      setPillVisible(false)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignored
      }
    }
    if (dragRef.current.moved) {
      scrollerRef.current.scrollLeft = dragRef.current.startScroll - dx
    }
  }

  const endDrag = (e) => {
    if (!dragRef.current.dragging) return
    dragRef.current.dragging = false
    setGrabbing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignored
    }
  }

  // ---- Cursor-following pill (per image) ----
  const movePill = (clientX, clientY) => {
    const pill = pillRef.current
    if (!pill) return
    pill.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`
  }

  const onImageEnter = (e) => {
    if (e.pointerType !== 'mouse') return
    if (dragRef.current.dragging) return
    setPillVisible(true)
    movePill(e.clientX, e.clientY)
  }

  const onImageMove = (e) => {
    if (dragRef.current.dragging) return
    if (e.pointerType !== 'mouse') return
    movePill(e.clientX, e.clientY)
  }

  const onImageLeave = () => setPillVisible(false)

  const openDrawer = (e) => {
    if (dragRef.current.moved) return
    e?.preventDefault?.()
    // Don't blank the pill on click — the image has `cursor: none`, so
    // hiding the pill leaves the user with no visible pointer at all
    // (especially obvious on "Coming Soon" where the drawer never
    // opens). Pill still hides naturally on pointerleave.
    if (comingSoon) return
    onOpen()
  }

  return (
    <article className="project">
      <h2 className="project__title" data-reveal>{name}</h2>

      <div
        ref={scrollerRef}
        className={`project__scroller ${grabbing ? 'project__scroller--grabbing' : ''}`}
        role="region"
        aria-label={`${name} images`}
        data-reveal
        onMouseEnter={() => (hoverRef.current = true)}
        onMouseLeave={() => {
          hoverRef.current = false
          setPillVisible(false)
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="project__track">
          {[...images, ...images].map((src, i) => (
            <figure
              className="project__image"
              key={i}
              aria-hidden={i >= images.length}
              onClick={openDrawer}
              onPointerEnter={onImageEnter}
              onPointerMove={onImageMove}
              onPointerLeave={onImageLeave}
            >
              <img
                src={src}
                alt={i < images.length ? `${name} ${i + 1}` : ''}
                loading="lazy"
                draggable={false}
              />
            </figure>
          ))}
        </div>
      </div>

      <div className="project__info" data-reveal-stagger>
        <div className="info-block">
          <span className="info-block__label">Project</span>
          <p className="info-block__text">{description}</p>
        </div>
        <div className="info-block">
          <span className="info-block__label">Role</span>
          <ul className="info-block__list">
            {roles.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="info-block">
          <span className="info-block__label">Team</span>
          <ul className="info-block__list">
            {team.map((t) => (
              <li key={t.name}>
                {t.name} ({t.role})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <span
        ref={pillRef}
        className={`project__cursor ${pillVisible ? 'project__cursor--visible' : ''}`}
        aria-hidden="true"
      >
        {comingSoon ? 'Coming Soon' : 'Open'}
      </span>
    </article>
  )
}

export default function Works() {
  const [openIndex, setOpenIndex] = useState(null)
  const openProject = openIndex !== null ? projects[openIndex] : null
  const nextProject =
    openIndex !== null
      ? projects[(openIndex + 1) % projects.length]
      : null

  return (
    <section className="works" id="work">
      {projects.map((p, i) => (
        <Project key={p.name} project={p} onOpen={() => setOpenIndex(i)} />
      ))}
      <ProjectDrawer
        project={openProject}
        nextProject={nextProject}
        open={openIndex !== null}
        onClose={() => setOpenIndex(null)}
        onNext={() => setOpenIndex((i) => (i + 1) % projects.length)}
      />
    </section>
  )
}
