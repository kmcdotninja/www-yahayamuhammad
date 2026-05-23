import { useRef, useState } from 'react'
import './Footer.css'
import Clock from './Clock.jsx'
import CopyToast from './CopyToast.jsx'
import { useSnd } from '../hooks/useSnd.js'

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
            I&rsquo;m always excited to explore new collaborations and
            opportunities. Whether you&rsquo;re looking to create something
            innovative or just want to chat about design, feel free to reach
            out.
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
            >
              {copied ? 'Copied' : 'Copy'}
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
          <a href="#">Twitter (X)</a>
          <a href="#">Instagram</a>
          <a href="#">LinkedIn</a>
        </nav>
      </footer>
    </>
  )
}
