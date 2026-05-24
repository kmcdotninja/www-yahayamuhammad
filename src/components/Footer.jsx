import { useRef, useState } from 'react'
import './Footer.css'
import Clock from './Clock.jsx'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

const ICONS = [
  '/Work%201.png',
  '/Note%201.png',
  '/Playground%201.png',
  '/Robot%201.png',
]

const EMAIL = 'yahayabinmuhammad@gmail.com'

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
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? 'Copied' : 'Copy email'}</span>
            </button>
          </div>
        </div>

        <span
          className="footer-art__text"
          onMouseMove={spawn}
          onMouseLeave={clear}
        >
          YMD
        </span>

        <img
          src="/Note%201.png"
          alt=""
          aria-hidden="true"
          className="footer-art__letter-icon footer-art__letter-icon--y"
        />
        <img
          src="/Work%201.png"
          alt=""
          aria-hidden="true"
          className="footer-art__letter-icon footer-art__letter-icon--m"
        />
        <img
          src="/Robot%201.png"
          alt=""
          aria-hidden="true"
          className="footer-art__letter-icon footer-art__letter-icon--d"
        />

        {trail.map((t) => (
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
        <Clock />
        <nav className="footer__links" aria-label="elsewhere">
          <a
            href="https://x.com/kmcdotninja"
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter (X)
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
          <a
            href="https://github.com/kmcdotninja"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </footer>
    </>
  )
}
