import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import './Works.css'
import './Works2.css'
import Picture from './Picture.jsx'
import { projects } from '../data.js'

// ProjectDrawer is heavy (image loader + portal + lenis hooks) and only
// opens on a click — keep it out of the home-page initial chunk.
const ProjectDrawer = lazy(() => import('./ProjectDrawer.jsx'))

const Project = memo(function Project({ project, onOpen }) {
  const { name, description, roles, team, images, comingSoon } = project
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
      if (comingSoon) return
      onOpen()
    },
    [comingSoon, onOpen],
  )

  return (
    <article className={`project${comingSoon ? ' project--soon' : ''}`}>
      {comingSoon && (
        <span className="project__ribbon" aria-label="case study coming soon">
          Coming Soon
        </span>
      )}
      <h2 className="project__title" data-reveal>
        {name}
      </h2>

      <div className="project__grid">
        {images.map((src, i) => (
          <div key={src} className="project__tile-frame" data-reveal-card>
            <figure
              className="project__tile"
              onClick={openDrawer}
              onPointerEnter={onImageEnter}
              onPointerMove={onImageMove}
              onPointerLeave={onImageLeave}
            >
              <Picture
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
        ))}
      </div>

      <div className="project__info" data-reveal-stagger>
        <div className="info-block">
          <span className="info-block__label">Context</span>
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
        className={`project__cursor ${
          pillVisible ? 'project__cursor--visible' : ''
        }`}
        aria-hidden="true"
      >
        {comingSoon ? 'Coming Soon' : 'Open'}
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
