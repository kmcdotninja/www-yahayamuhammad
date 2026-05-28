import { useEffect, useRef, useState } from 'react'

const RAND_CHARS = '!@#$%^&*<>?/+=-_:;|.,abcdef0123456789'

const TOTAL_DURATION = 720
const SCRAMBLE_PER_CHAR = 110

/**
 * Animates the text from its previous value to `target` with a left-to-right
 * scramble. Characters early in the string settle first; later ones cycle
 * random glyphs longer — gives the classic "decryption" wave.
 */
export function ScrambleText({ target, accent = '#fff', showBar = true, minChars }) {
  const [text, setText] = useState(target)
  const [activePos, setActivePos] = useState(-1)
  const prevRef = useRef(target)

  useEffect(() => {
    if (target === prevRef.current) return undefined
    let cancelled = false
    let raf = 0
    const startedAt = performance.now()
    const maxLen = Math.max(target.length, prevRef.current.length)
    const spread = Math.max(0, TOTAL_DURATION - SCRAMBLE_PER_CHAR)

    const tick = () => {
      if (cancelled) return
      const elapsed = performance.now() - startedAt
      let out = ''
      let firstActive = -1
      let done = true
      for (let i = 0; i < maxLen; i += 1) {
        const charStart = (i / Math.max(1, maxLen)) * spread
        const tgt = target[i] ?? ''
        const old = prevRef.current[i] ?? ''
        if (elapsed >= charStart + SCRAMBLE_PER_CHAR) {
          out += tgt
        } else if (elapsed >= charStart) {
          out += RAND_CHARS[Math.floor(Math.random() * RAND_CHARS.length)]
          if (firstActive < 0) firstActive = i
          done = false
        } else {
          out += old
          done = false
        }
      }
      setText(out)
      setActivePos(firstActive)
      if (done) {
        prevRef.current = target
        setActivePos(-1)
      } else {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [target])

  return (
    <span
      className="pg2-scramble"
      style={{ minWidth: minChars ? `${minChars}ch` : undefined }}
    >
      {text}
      {showBar && activePos >= 0 && (
        <span
          aria-hidden="true"
          className="pg2-scramble__bar"
          style={{
            transform: `translateX(${activePos}ch)`,
            backgroundColor: accent,
          }}
        />
      )}
    </span>
  )
}
