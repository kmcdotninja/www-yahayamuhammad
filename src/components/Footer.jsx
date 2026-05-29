import { lazy, Suspense, useState } from 'react'
import './Footer.css'
import Clock from './Clock.jsx'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'

// CommitSticker renders 17×17 = 289 cells + a hover tilt with rAF logic.
// The whole sticker sits below the fold of every page that mounts the
// footer, so we lazy-load it — first paint never pays for it.
const CommitSticker = lazy(() => import('./CommitSticker.jsx'))

const EMAIL = 'yahayabinmuhammad@gmail.com'

export default function Footer() {
  const { play, SOUNDS } = useSnd()
  const [copied, setCopied] = useState(false)

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
            {'Always up for new '}
            <br />
            {"collaborations. Let’s "}
            <br className="footer-art__br--mobile" />
            {'create '}
            <br className="footer-art__br--desktop" />
            {'something or '}
            <br className="footer-art__br--mobile" />
            {'chat about design.'}
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
        <span className="footer__copy">© 2026 Yahaya Muhammad</span>
        <div className="footer__status">
          <Clock />
        </div>
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
