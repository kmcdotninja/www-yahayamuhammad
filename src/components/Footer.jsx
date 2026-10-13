import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import './Footer.css'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

// CommitSticker renders 17×17 = 289 cells + a hover tilt with rAF logic.
// The whole sticker sits below the fold of every page that mounts the
// footer, so we lazy-load it — first paint never pays for it.
const CommitSticker = lazy(() => import('./CommitSticker.jsx'))

const EMAIL = 'yahayabinmuhammad@gmail.com'

// One tap on the heart lets go of a whole handful, Instagram-double-tap style.
const HEARTS_PER_TAP = 14
// Ceiling on what can be airborne at once, so mashing the heart can't pile up
// hundreds of nodes. Oldest bits are dropped first; they're the faintest.
const MAX_LIVE = 60

const rand = (min, max) => min + Math.random() * (max - min)

// Each bit gets its own drift, tilt, size, height and duration written in as
// custom properties, so the flight itself is one CSS animation the compositor
// owns — React only spawns and reaps. Regular values read as a machine, so
// every number here is deliberately odd.
function makeHeart(id) {
  return {
    id,
    x: rand(-14, 14).toFixed(1),
    drift: rand(-64, 64).toFixed(1),
    tilt: rand(-42, 42).toFixed(1),
    size: rand(11, 24).toFixed(1),
    rise: rand(88, 172).toFixed(0),
    life: rand(1500, 2400).toFixed(0),
    // A stagger, so the handful streams out instead of firing as one clump.
    delay: rand(0, 260).toFixed(0),
  }
}

export default function Footer() {
  const { play, SOUNDS } = useSnd()
  const reduced = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const [beating, setBeating] = useState(false)
  const [hearts, setHearts] = useState([])
  const idRef = useRef(0)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      play(SOUNDS.CELEBRATION)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  // Re-triggering a CSS animation needs the class off for a frame, so the
  // heart un-sets it on animationend rather than on a timer.
  const bounceHeart = () => {
    play(SOUNDS.TAP)
    if (reduced) return
    setBeating(true)
    setHearts((live) => {
      const batch = Array.from({ length: HEARTS_PER_TAP }, () =>
        makeHeart((idRef.current += 1)),
      )
      const next = [...live, ...batch]
      return next.length > MAX_LIVE ? next.slice(next.length - MAX_LIVE) : next
    })
  }

  // Every bit reaps itself the moment its flight ends — nothing lingers in the
  // tree, and a burst already in the air is never cut short by the next tap.
  const reapHeart = useCallback((id) => {
    setHearts((live) => live.filter((h) => h.id !== id))
  }, [])

  return (
    <>
      <CopyToast visible={copied} />
      <hr className="hr-full" aria-hidden="true" />
      <section
        className="footer-art"
        aria-label="YMD"
        data-reveal
      >
        <div className="footer-art__cta">
          <p className="footer-art__bio">
            {'Let’s build something '}
            <br className="footer-art__br--desktop" />
            {'or talk about design.'}
          </p>
          <div className="footer-art__contact">
            <a
              href={`mailto:${EMAIL}`}
              className="footer-art__email"
            >
              {EMAIL}
            </a>
            <button
              type="button"
              className="footer-art__copy"
              onClick={copyEmail}
              aria-label="Copy email"
            >
              <span>{copied ? 'Copied' : 'Copy email'}</span>
            </button>
          </div>
        </div>

        <span className="footer-art__text">YMD</span>

        <div className="footer-art__sticker">
          <Suspense fallback={null}>
            <CommitSticker />
          </Suspense>
        </div>
      </section>

      <footer className="footer">
        <span className="footer__copy">
          {'Designed + Coded with '}
          <span className="footer__love">
            {/* Zero-sized stage anchored to the heart. Absolute, so a bit in
                flight never reflows the sentence it launched from. */}
            <span className="footer__hearts" aria-hidden="true">
              {hearts.map((h) => (
                <span
                  key={h.id}
                  className="footer__heart-bit"
                  style={{
                    '--x': `${h.x}px`,
                    '--drift': `${h.drift}px`,
                    '--tilt': `${h.tilt}deg`,
                    '--size': `${h.size}px`,
                    '--rise': `${h.rise}px`,
                    '--life': `${h.life}ms`,
                    '--delay': `${h.delay}ms`,
                  }}
                  onAnimationEnd={() => reapHeart(h.id)}
                >
                  ❤️
                </span>
              ))}
            </span>
            <button
              type="button"
              className={`footer__heart${beating ? ' is-beating' : ''}`}
              onClick={bounceHeart}
              onAnimationEnd={() => setBeating(false)}
              aria-label="Love"
            >
              <span aria-hidden="true">❤️</span>
            </button>
          </span>
          {' by Yahaya'}
        </span>
        <nav className="footer__links" aria-label="elsewhere">
          <a
            href="https://github.com/kmcdotninja"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://x.com/kmcdotninja"
            target="_blank"
            rel="noopener noreferrer"
          >
            X
          </a>
          <a
            href="https://www.instagram.com/kmcdotninja"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
          <a
            href="https://www.linkedin.com/in/yahyabinmuhammad/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </nav>
      </footer>
    </>
  )
}
