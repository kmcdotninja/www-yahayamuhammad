import { useRef, useState } from 'react'
import './Footer.css'
import Clock from './Clock.jsx'
import CommitSticker from './CommitSticker.jsx'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'

const ICONS = [
  '/Work%201.webp',
  '/Note%201.webp',
  '/Playground%201.webp',
  '/Robot%201.webp',
]

const EMAIL = 'yahayabinmuhammad@gmail.com'

// Flip to true to re-enable the YMD hover cursor-trail and the static
// Y/M/D letter icons. Kept here so the behavior is easy to bring back.
const TRAIL_ENABLED = false

export default function Footer() {
  const { play, SOUNDS } = useSnd()
  const [trail, setTrail] = useState([])
  const [copied, setCopied] = useState(false)
  const lastSpawnRef = useRef(0)
  const sectionRef = useRef(null)

  const spawn = (e) => {
    if (!sectionRef.current) return
    const now = performance.now()
    if (now - lastSpawnRef.current < 90) return
    lastSpawnRef.current = now

    const rect = sectionRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Math.random().toString(36).slice(2)
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)]
    const rotation = (Math.random() - 0.5) * 50
    const size = 120 + Math.random() * 80
    const ox = (Math.random() - 0.5) * 60
    const oy = (Math.random() - 0.5) * 60

    setTrail((prev) => [...prev, { id, x: x + ox, y: y + oy, icon, rotation, size }])
    setTimeout(() => {
      setTrail((prev) => prev.filter((t) => t.id !== id))
    }, 900)
  }

  const clear = () => {
    setTimeout(() => setTrail([]), 900)
  }

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
        ref={sectionRef}
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

        <span
          className="footer-art__text"
          onMouseMove={TRAIL_ENABLED ? spawn : undefined}
          onMouseLeave={TRAIL_ENABLED ? clear : undefined}
        >
          YMD
        </span>

        <div className="footer-art__sticker">
          <CommitSticker />
        </div>

        {TRAIL_ENABLED && (
          <>
            <img
              src="/Note%201.webp"
              alt=""
              aria-hidden="true"
              className="footer-art__letter-icon footer-art__letter-icon--y"
            />
            <img
              src="/Work%201.webp"
              alt=""
              aria-hidden="true"
              className="footer-art__letter-icon footer-art__letter-icon--m"
            />
            <img
              src="/Robot%201.webp"
              alt=""
              aria-hidden="true"
              className="footer-art__letter-icon footer-art__letter-icon--d"
            />
          </>
        )}

        {TRAIL_ENABLED &&
          trail.map((t) => (
            <img
              key={t.id}
              src={t.icon}
              alt=""
              className="footer-art__icon"
              style={{
                left: t.x,
                top: t.y,
                width: t.size,
                height: t.size,
                '--rot': `${t.rotation}deg`,
              }}
            />
          ))}
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
