import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import './Works.css'
import './Works2.css'
import ProjectMedia from './ProjectMedia.jsx'
import { useMasonry } from '../hooks/useMasonry.js'
import { projects } from '../data.js'

// ProjectDrawer is heavy (image loader + portal + lenis hooks) and only
// opens on a click — keep it out of the home-page initial chunk.
const ProjectDrawer = lazy(() => import('./ProjectDrawer.jsx'))

const Project = memo(function Project({ project, onOpen }) {
  const { name, description, roles, team, images, comingSoon, statusLabel, kind, solo, link, linkLabel } = project
  // Parked projects carry their own label (Rednoxx is actively being written
  // up, the rest are queued), so the ribbon and hover pill read the same word.
  const parkedLabel = statusLabel || 'Coming Soon'
  const pillRef = useRef(null)
  const [pillVisible, setPillVisible] = useState(false)

  // movePill writes the transform directly so we don't spam React state on
  // every pointermove. The pill node is a sibling of the figure so this
  // does not invalidate sibling layout.
  const movePill = useCallback((clientX, clientY) => {
    const pill = pillRef.current
    if (!pill) return
    pill.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`
  }, [])

  const onImageEnter = useCallback(
    (e) => {
      if (e.pointerType !== 'mouse') return
      setPillVisible(true)
      movePill(e.clientX, e.clientY)
    },
    [movePill],
  )

  const onImageMove = useCallback(
    (e) => {
      if (e.pointerType !== 'mouse') return
      movePill(e.clientX, e.clientY)
    },
    [movePill],
  )

  const onImageLeave = useCallback(() => setPillVisible(false), [])

  const openDrawer = useCallback(
    (e) => {
      e?.preventDefault?.()
      // a project with its own page (Kiko's "The making of Kiko") opens that page in a new tab
      if (link) { window.open(link, '_blank', 'noopener'); return }
      if (comingSoon) return
      onOpen()
    },
    [comingSoon, onOpen, link],
  )

  const gridRef = useRef(null)
  const hasWide = images.some((src) => src?.wide)
  useMasonry(gridRef, hasWide)

  const renderTile = (src, i) => {
    const snip = !!src?.snippet
    return (
      <div
        // entries are image/video paths, or { phone } / { tablet } / { video } / { snippet } / { image } objects
        key={typeof src === 'string' ? src : src.phone || src.tablet || src.video || src.snippet || src.image}
        className={`project__tile-frame${src?.wide ? ' project__tile-frame--wide' : ''}`}
        // `wide: 'full'` spans every column (Rednoxx's films); `wide: true` two
        data-wide={src?.wide === 'full' ? 'full' : src?.wide ? '1' : undefined}
        data-reveal-card
      >
        <figure
          className={`project__tile${snip ? ' project__tile--nopill' : ''}`}
          onClick={openDrawer}
          // Kiko's animated snippet tiles keep the cursor pill off, so it
          // never sits on top of what's moving in them
          onPointerEnter={snip ? undefined : onImageEnter}
          onPointerMove={snip ? undefined : onImageMove}
          onPointerLeave={snip ? undefined : onImageLeave}
        >
          <ProjectMedia
            src={src}
            alt={`${name} ${i + 1}`}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            draggable={false}
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
          />
        </figure>
      </div>
    )
  }

  return (
    <article className={`project${comingSoon && !link ? ' project--soon' : ''}`}>
      {comingSoon && !link && (
        <span
          className={`project__ribbon${
            parkedLabel.length > 12 ? ' project__ribbon--long' : ''
          }`}
          aria-label={`case study ${parkedLabel.toLowerCase()}`}
        >
          {parkedLabel}
        </span>
      )}
      <h2 className="project__title" data-reveal>
        {name}
      </h2>

      {/* The masonry. A project with a `wide` entry (Kiko's iPads) is laid out
          by useMasonry: natural heights, the wide tile across two columns;
          every other project keeps the CSS-column masonry. */}
      <div ref={gridRef} className={`project__grid${hasWide ? ' project__grid--js' : ''}`}>
        {images.map((src, i) => renderTile(src, i))}
      </div>

      <div className="project__info" data-reveal-stagger>
        <div className="info-block">
          <span className="info-block__label">Context</span>
          <p className="info-block__text">{description}</p>
          {link && (
            <a className="info-block__link" href={link} target="_blank" rel="noopener">
              {linkLabel || 'Open'} ↗
            </a>
          )}
        </div>
        <div className="info-block">
          <span className="info-block__label">Role</span>
          <ul className="info-block__list">
            {roles.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        {team.length ? (
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
        ) : (
          // Solo side projects (Kiko) have no team: the block is labelled with
          // the project's `kind` and carries its `solo` line instead.
          <div className="info-block">
            <span className="info-block__label">{kind || 'Team'}</span>
            <p className="info-block__text">{solo}</p>
          </div>
        )}
      </div>

      <span
        ref={pillRef}
        className={`project__cursor ${
          pillVisible ? 'project__cursor--visible' : ''
        }`}
        aria-hidden="true"
      >
        {link ? `${linkLabel || 'Open'} ↗` : comingSoon ? parkedLabel : 'Open'}
      </span>
    </article>
  )
})

export default function Works2() {
  const [openIndex, setOpenIndex] = useState(null)
  // Track whether the drawer has been opened at least once so we can keep
  // it mounted (and benefit from cached images / measured dims) on
  // subsequent opens.
  const [drawerArmed, setDrawerArmed] = useState(false)
  const openProject = openIndex !== null ? projects[openIndex] : null

  const openByIndex = useCallback((i) => {
    setOpenIndex(i)
    setDrawerArmed(true)
  }, [])

  // Pre-warm the drawer chunk on first idle so the click feels instant
  // even though the chunk itself is split off the home bundle.
  useEffect(() => {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = ric(() => {
      import('./ProjectDrawer.jsx').catch(() => {})
    }, { timeout: 4000 })
    return () => cancel(id)
  }, [])

  return (
    <section className="works works--grid" id="work">
      {projects.map((p, i) => (
        <Project key={p.name} project={p} onOpen={() => openByIndex(i)} />
      ))}
      {drawerArmed && (
        <Suspense fallback={null}>
          <ProjectDrawer
            project={openProject}
            open={openIndex !== null}
            onClose={() => setOpenIndex(null)}
          />
        </Suspense>
      )}
    </section>
  )
}
