import { useEffect, useMemo, useRef, useState } from 'react'
import './ProjectDrawer.css'
import { getLenis } from '../lib/lenisStore.js'

const NARROW_RATIO = 1.15 // width/height — anything below is treated as pairable

const isNarrow = (src, dims) => {
  const d = dims[src]
  if (!d) return false
  return d.w / d.h < NARROW_RATIO
}

// Walk a list of image URLs, pairing adjacent narrow ones into a 2-col row.
// Everything else renders as a full-width single.
function buildRows(images, dims) {
  const rows = []
  let i = 0
  while (i < images.length) {
    const a = images[i]
    const b = images[i + 1]
    if (a && b && isNarrow(a, dims) && isNarrow(b, dims)) {
      rows.push({ type: 'pair', srcs: [a, b] })
      i += 2
    } else {
      rows.push({ type: 'single', srcs: [a] })
      i += 1
    }
  }
  return rows
}

// Fallback for projects that don't have sections: interleave story paragraphs
// between image rows at a fixed cadence.
function buildFlatRows(images, dims, story) {
  const imageRows = buildRows(images, dims)
  const rows = []
  let storyIdx = 0
  imageRows.forEach((row, idx) => {
    rows.push(row)
    const shouldInsert =
      story &&
      storyIdx < story.length &&
      idx > 0 &&
      (idx + 1) % 2 === 0 &&
      idx !== imageRows.length - 1
    if (shouldInsert) {
      rows.push({ type: 'note', text: story[storyIdx] })
      storyIdx += 1
    }
  })
  while (story && storyIdx < story.length) {
    rows.push({ type: 'note', text: story[storyIdx] })
    storyIdx += 1
  }
  return rows
}

export default function ProjectDrawer({
  project,
  nextProject,
  open,
  onClose,
  onNext,
}) {
  const [dims, setDims] = useState({})
  const contentRef = useRef(null)

  // Reset dims + scroll content to top whenever the project changes.
  useEffect(() => {
    setDims({})
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [project?.name])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const lenis = getLenis()
    lenis?.stop()

    const scrollY = window.scrollY
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    return () => {
      document.removeEventListener('keydown', onKey)
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.left = prev.bodyLeft
      body.style.right = prev.bodyRight
      body.style.width = prev.bodyWidth
      window.scrollTo(0, scrollY)
      lenis?.start()
    }
  }, [open, onClose])

  // Prefer grouped sections; otherwise fall back to flat images + story.
  const sections = useMemo(() => {
    if (!project) return []
    if (project.sections?.length) {
      return project.sections.map((s) => ({
        heading: s.heading,
        note: s.note,
        rows: buildRows(s.images || [], dims),
      }))
    }
    return [
      {
        heading: null,
        note: null,
        rows: buildFlatRows(project.images || [], dims, project.story),
      },
    ]
  }, [project, dims])

  const onImgLoad = (src) => (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    if (!w || !h) return
    setDims((d) => (d[src] ? d : { ...d, [src]: { w, h } }))
  }

  const renderRow = (row, key) => {
    if (row.type === 'note') {
      return (
        <p className="pd__note" key={key}>
          {row.text}
        </p>
      )
    }
    return (
      <div key={key} className={`pd__row pd__row--${row.type}`}>
        {row.srcs.map((src) => (
          <figure className="pd__image" key={src}>
            <img
              src={src}
              alt=""
              loading="lazy"
              draggable={false}
              onLoad={onImgLoad(src)}
            />
          </figure>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`pd ${open ? 'pd--open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label={project ? `${project.name} details` : 'Project details'}
    >
      <button
        type="button"
        className="pd__scrim"
        onClick={onClose}
        aria-label="Close project details"
        tabIndex={open ? 0 : -1}
      />

      <aside className="pd__panel">
        <header className="pd__top">
          <span className="pd__eyebrow">
            {project ? `${project.name} case study` : 'Case study'}
          </span>
          <button
            type="button"
            className="pd__close"
            onClick={onClose}
            aria-label="Close"
            tabIndex={open ? 0 : -1}
          >
            Close
          </button>
        </header>

        {project && (
          <div ref={contentRef} className="pd__content" data-lenis-prevent>
            <header className="pd__head">
              <h2 className="pd__title">{project.name}</h2>
              <p className="pd__lede">{project.description}</p>
            </header>

            <div className="pd__meta">
              <div className="pd__meta-block">
                <span className="pd__meta-label">Role</span>
                <ul className="pd__meta-list">
                  {project.roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="pd__meta-block">
                <span className="pd__meta-label">Team</span>
                <ul className="pd__meta-list">
                  {project.team.map((t) => (
                    <li key={t.name}>
                      {t.name} ({t.role})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pd__gallery">
              {sections.map((section, si) => (
                <section
                  className={`pd__section ${section.heading ? '' : 'pd__section--bare'}`}
                  key={section.heading || `section-${si}`}
                >
                  {section.heading && (
                    <header className="pd__section-head">
                      <span className="pd__section-num">
                        {String(si + 1).padStart(2, '0')}
                      </span>
                      <h3 className="pd__section-title">{section.heading}</h3>
                      {section.note && (
                        <p className="pd__section-note">{section.note}</p>
                      )}
                    </header>
                  )}
                  <div className="pd__section-rows">
                    {section.rows.map((row, ri) =>
                      renderRow(row, `${si}-${ri}`),
                    )}
                  </div>
                </section>
              ))}
            </div>

            {nextProject && onNext && (
              <button
                type="button"
                className="pd__next"
                onClick={onNext}
                aria-label={`Open next project: ${nextProject.name}`}
              >
                <span className="pd__next-label">↓ Next project</span>
                <span className="pd__next-title">{nextProject.name}</span>
                {nextProject.images?.[0] && (
                  <img
                    src={nextProject.images[0]}
                    alt=""
                    className="pd__next-hero"
                    loading="lazy"
                    draggable={false}
                  />
                )}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
