import { useEffect, useMemo, useRef, useState } from 'react'
import './V2Page.css'
import Footer from './Footer.jsx'
import TopNav from './TopNav.jsx'
import ProjectMedia from './ProjectMedia.jsx'
import { WebTrace, WebPop, WebCount, WebStories, WebRoll } from './kiko/web/WebCards.jsx'
import { useMosaic } from '../hooks/useMosaic.js'

// The mosaic feed page behind /v2 and /v3: a heading, then every tile packed by
// useMosaic (every tile its own size; no holes, colours kept apart). `feed` is a list of
// [project, media, options]: media is anything ProjectMedia takes, or { web }
// for one of Kiko's website cards; options `wide` (two columns) and `tone`
// (a colour family; left out, useMosaic measures it from the image).
// `smartWide` lets every landscape piece go one column or two (useMosaic);
// `columnControl` adds the floating 2 / 3 / 4 column switch (default 3).

const WEB = { trace: WebTrace, pop: WebPop, count: WebCount, stories: WebStories, roll: WebRoll }

// 4 columns on a desktop, 3 on a laptop, 2 on a tablet, 1 on a phone
const columnsFor = (w) => (w > 1200 ? 4 : w > 900 ? 3 : w > 600 ? 2 : 1)
// with the column control: the chosen count, never more than the screen holds
// (3 needs a laptop, 4 a desktop; tablets get 2 at most, phones 1)
const capped = (pick) => (w) => Math.min(pick, w > 1200 ? 4 : w > 900 ? 3 : w > 600 ? 2 : 1)
const PICKS = [2, 3, 4]
const KEY = 'feed-columns'
const saved = () => { try { const v = Number(localStorage.getItem(KEY)); return PICKS.includes(v) ? v : 3 } catch { return 3 } }

export default function MosaicFeed({ feed, title, sub, smartWide = false, columnControl = false }) {
  const grid = useRef(null)
  const [pick, setPick] = useState(saved)
  const choose = (n) => { setPick(n); try { localStorage.setItem(KEY, String(n)) } catch { /* storage off */ } }
  const cols = useMemo(() => (columnControl ? capped(pick) : columnsFor), [columnControl, pick])
  useMosaic(grid, cols, { smartWide })
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <TopNav />
      <main className="v2">
        <header className="v2__head" data-reveal>
          <h1 className="v2__title">{title}</h1>
          <p className="v2__sub">{sub}</p>
        </header>

        <div ref={grid} className="v2__grid">
          {feed.map(([project, src, opts], i) => {
            const Web = src.web && WEB[src.web]
            return (
              <div
                key={i}
                className="v2__frame"
                data-wide={opts?.wide ? '1' : undefined}
                data-tone={opts?.tone}
                data-project={project}
              >
                <figure className="v2__tile">
                  {Web ? (
                    <Web />
                  ) : (
                    <ProjectMedia src={src} alt={`${project} ${i + 1}`} loading="eager" decoding="async" draggable={false} />
                  )}
                  <figcaption className="v2__tag">{project}</figcaption>
                </figure>
              </div>
            )
          })}
        </div>
      </main>
      {columnControl && (
        <div className="v2__cols" role="radiogroup" aria-label="Columns">
          {PICKS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={pick === n}
              aria-label={`${n} columns`}
              className={`v2__col${pick === n ? ' is-on' : ''}`}
              onClick={() => choose(n)}
            >
              <span className="v2__col-icon" style={{ '--n': n }} aria-hidden="true">
                {Array.from({ length: n }, (_, i) => <i key={i} />)}
              </span>
            </button>
          ))}
        </div>
      )}
      <Footer />
    </>
  )
}
