import { useEffect, useId, useRef, useState } from 'react'
import './KikoTalks.css'
import { bezier, clamp01, seg, useLoop } from './motion.js'
import { prefersReducedMotion } from '../../hooks/useOnScreen.js'
import { useKikoSound, setKikoSound, playKiko, pauseKikoFor } from './kikoSound.js'

// Kiko talks: Kiko (Cyan) says its real recorded lines one after another while
// each line types in under it, the word to look at on Kiko's cyan block (the
// app's [word] headings). Happy between lines. No sound on the page.
//
// Kiko is the real character, rendered from Kiko's Brand page in its own layers
// (nothing redrawn; public/projects/kiko/talks/): the body; the speaking
// state's light, the orange (#ff9f45) blob that sweeps round inside the shape
// (Figure.jsx .bswirl: turning once every 2.4 s about (87, 130), at opacity
// .45 + lv * .55, clipped to the body: here by the body's own alpha as a mask);
// and the faces alone: happy, and speaking at five mouth openings (the app's
// --lv 0 to 1). While it talks, the mouth follows Kiko's own speaking rhythm
// (filmvoice.js rhythm(): 3.6 syllables a second under a slow breathing swell),
// closed wherever the real recording pauses, and the body swells with it as
// the app's figure does (scale 1 + lv * .025, 1 - lv * .02).
//
// The voice: Kiko's real recorded clips (public/sounds/kiko-talks/, from the
// app's voice/ and voice-experiment/storytime/). Each line's timing comes from
// its clip, muted or not: Kiko is in its speaking state for exactly the clip's
// length, the line types in across the spoken part, then 1.5 s happy. Sound is
// opt-in (the corner toggle, kikoSound.js: one shared audio element unlocked by
// the tap, one Kiko card at a time, stops off screen and in a hidden tab, off
// on every load); when on, each clip starts as its line starts to type.
//
// No flicker by construction: the line box is a fixed-height clip holding all
// five lines, always mounted and laid out once (fonts loaded first); a line's
// letters are already in place and only fade/rise in as they are "typed", the
// block's cyan grows behind them by clip-path, and a finished line slides up
// and out as the next one types in, transform only. One clock (useLoop) draws
// every frame while on screen; reduced motion: Kiko happy and one whole line.
//
// Props: ratio (CSS aspect-ratio, default 4 / 5), className.

const IMG = '/projects/kiko/talks/'
const BODY = `${IMG}kiko-body.webp`
const SWIRL = `${IMG}kiko-swirl.webp`
const TALK = [0, 1, 2, 3, 4].map((k) => `${IMG}kiko-face-talk-${k}.webp`)
const HAPPY = `${IMG}kiko-face-happy.webp`

const SND = '/sounds/kiko-talks/'
// [line, clip, clip length (ffprobe), where the speech ends, speech gate at 30 Hz
// (0-9: where the recording is voiced, from its loudness)]
const LINES = [
  ['Start at the [green dot].', 'start-at-the-green-dot', 1.8, 1.4, '489939999999410000996009956999999919999996000010000000'],
  ['Pop all the [Baa] letters!', 'pop-all-the-baas', 2.48, 2.233, '569999304200099999963999200000899999999999999999999999999988777766510000000'],
  ['[Alhamdulillah]! Next level!', 'alhamdulillah-next-level', 3.08, 2.8, '999999999999998999999999999999999999999777410000000599999994387649999998199999999863100000000'],
  ['It’s [Story Time]!', 'its-story-time', 1.751, 1.567, '09999299998600199999999999369999999999987777752000000'],
  ['Try [again]!', 'try-again', 1.0, 0.767, '999999999459999999998652000000'],
]

// timing (seconds)
const TYPE_AT = 0.2 // after a swap starts, the first letter
const HOLD = 1.5 // a whole line, held (Kiko happy)
const SWAP = 0.56 // the old line out / the new one in
const LETTER = 0.2 // one letter fading and rising in
const FACE = 0.05 // speaking <-> happy crossfade (three frames)
const SYL = 3.6 // syllables a second (Kiko's speaking rhythm)
const HZ = 30 // the speech gate's rate
const SWIRL_FADE = 0.3 // the speaking light fades in / out (buddy.css: .3s)

// the sound hint (the toggle pulses twice, "Tap to hear Kiko" beside it) shows
// once per page view, the first time the card comes on screen
let hinted = false
const HINT_MS = 4000

const outExpo = bezier(0.16, 1, 0.3, 1)
const outQuart = bezier(0.25, 1, 0.5, 1)
const inOut = bezier(0.55, 0, 0.3, 1)

// Kiko's mouth while a line is said (filmvoice.js rhythm, u in seconds)
const rhythm = (u) => Math.max(0, Math.sin(u * Math.PI * 2 * SYL)) ** 1.4 * (0.55 + 0.35 * Math.sin(u * 1.9) ** 2)

// split a line into characters, flagging those on the block
function parse(text) {
  const chars = []
  let on = false
  for (const ch of text) {
    if (ch === '[') on = true
    else if (ch === ']') on = false
    else chars.push({ ch, br: on })
  }
  return chars
}

// the timeline: each line's start, its clip (and Kiko's speaking state) from
// `at` for the clip's length, the letters typed across the spoken part
let t0 = 0
const LINE_T = LINES.map(([text, clip, dur, spoken, gate]) => {
  const chars = parse(text)
  const at = t0 + TYPE_AT
  const ch = spoken / chars.length // per character typed
  const r = { text, chars, src: `${SND}${clip}.mp3`, start: t0, at, ch, end: at + spoken, talkA: at, talkB: at + dur, gate }
  t0 = r.talkB + HOLD
  return r
})
const PERIOD = t0
// the speaking light turns a whole number of times a loop (about every 2.4 s)
const SPIN = PERIOD / Math.round(PERIOD / 2.4)
const STATIC_T = LINE_T[2].talkB + 0.6 // reduced motion: "Alhamdulillah! Next level!", happy

// the voice's level 0..1 at t: Kiko's rhythm, where the recording is voiced
function level(t) {
  for (const L of LINE_T) {
    if (t < L.talkA || t > L.talkB) continue
    const x = (t - L.talkA) * HZ
    const i = Math.floor(x)
    const a = +(L.gate[i] || 0) / 9
    const b = +(L.gate[i + 1] || 0) / 9
    return rhythm(t - L.talkA) * (a + (b - a) * (x - i))
  }
  return 0
}

// the speaking light: fades in as Kiko starts talking, out once it stops
// (buddy.css: an opacity transition of .3s on the state change)
function light(t) {
  for (const L of LINE_T) {
    if (t >= L.talkA && t <= L.talkB + SWIRL_FADE) return Math.min(clamp01((t - L.talkA) / SWIRL_FADE), clamp01((L.talkB + SWIRL_FADE - t) / SWIRL_FADE))
  }
  return 0
}

// how far into a ramp around each talking span (1 = talking)
function within(t, fade) {
  for (const L of LINE_T) {
    if (t >= L.talkA - fade && t <= L.talkB + fade) return Math.min(clamp01((t - (L.talkA - fade)) / fade), clamp01((L.talkB + fade - t) / fade))
  }
  return 0
}

export default function KikoTalks({ ratio = '4 / 5', className = '' }) {
  const root = useRef(null)
  const fig = useRef(null)
  const swirl = useRef(null)
  const blob = useRef(null)
  const talks = useRef([])
  const happy = useRef(null)
  const lines = useRef([]) // per line: { el, chars: [el], bg, edges }
  const shown = useRef(-1)
  const state = useRef({ fresh: true, last: 0 })
  const lastT = useRef(-1)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)
  const id = useId()
  const soundOn = useKikoSound(id)

  // fonts first: the letters are laid out once, the block's edges measured
  useEffect(() => {
    let dead = false
    const fonts = document.fonts
      ? document.fonts.load('800 40px "SF Pro Rounded Kiko"').then(() => document.fonts.ready)
      : Promise.resolve()
    Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).then(() => {
      if (dead) return
      lines.current.forEach((D) => {
        const br = D.el.querySelector('.ktk__br')
        if (!br) return
        const w = br.offsetWidth
        const bits = [...br.querySelectorAll('.ktk__ch')]
        // the block's right edge after each letter, as a share of its width
        D.edges = bits.map((b, i) => (i === bits.length - 1 ? 1 : (b.offsetLeft + b.offsetWidth) / w))
      })
      setReady(true)
    })
    return () => {
      dead = true
    }
  }, [])

  const draw = (t) => {
    t = ((t % PERIOD) + PERIOD) % PERIOD
    // a line starting to type: its clip plays (when this card has the sound)
    const prev = lastT.current
    lastT.current = t
    if (prev >= 0 && t - prev > 0 && t - prev < 0.5) {
      for (const L of LINE_T) if (prev < L.at && t >= L.at) playKiko(id, L.src)
    }
    const st = state.current
    // the very first pass (or a fresh start): no previous line to slide away
    if (t < st.last - 0.5 && st.last < PERIOD - 0.25) st.fresh = true
    if (t > SWAP + 0.05) st.fresh = false
    st.last = t

    // Kiko: the mouth at the voice's level, the body swelling with it, the
    // speaking light turning inside
    const lv = level(t)
    const f = within(t, FACE)
    const k = Math.min(4, Math.round(lv * 4))
    if (k !== shown.current) {
      talks.current.forEach((el, i) => {
        el.style.opacity = i === k ? '1' : '0'
      })
      shown.current = k
    }
    // the happy face over the talking one (the face layers only: the body stays)
    happy.current.style.opacity = (1 - f).toFixed(3)
    const tf = talks.current[k]
    if (tf) tf.style.opacity = f.toFixed(3)
    const sw = light(t)
    swirl.current.style.opacity = (sw * (0.45 + lv * 0.55)).toFixed(3)
    blob.current.style.transform = `rotate(${(((t % SPIN) / SPIN) * 360).toFixed(2)}deg)`
    // a small happy nod when a line is done
    let nod = 0
    for (const L of LINE_T) {
      const p = seg(t, L.talkB + 0.05, L.talkB + 0.65)
      if (p > 0 && p < 1) nod = Math.sin(p * Math.PI) * (1 - p) * 1.6
    }
    const s = lv * f
    fig.current.style.transform = `translate3d(0, ${(-nod * 1.4).toFixed(3)}%, 0) scale(${(1 + s * 0.025 + nod * 0.004).toFixed(4)}, ${(1 - s * 0.02 - nod * 0.006).toFixed(4)})`

    // the lines
    LINE_T.forEach((L, i) => {
      const D = lines.current[i]
      if (!D) return
      let u = t - L.start
      if (u < 0) u += PERIOD
      const len = (LINE_T[i + 1] ? LINE_T[i + 1].start : PERIOD) - L.start
      const leaving = u >= len
      const visible = u < len + SWAP && !(leaving && st.fresh && i === LINE_T.length - 1)
      if (!visible) {
        if (D.on) {
          D.el.style.visibility = 'hidden'
          D.on = false
        }
        return
      }
      if (!D.on) {
        D.el.style.visibility = 'visible'
        D.on = true
      }
      const y = leaving ? -100 * inOut(clamp01((u - len) / SWAP)) : 62 * (1 - outExpo(clamp01(u / SWAP)))
      D.el.style.transform = `translate3d(0, ${y.toFixed(3)}%, 0)`
      // letters: typed one by one, each fading and rising in
      const tu = u - (L.at - L.start)
      L.chars.forEach((c, j) => {
        const o = leaving ? 1 : clamp01((tu - j * L.ch) / LETTER)
        const el = D.chars[j]
        if (el._o !== o) {
          el.style.opacity = o >= 1 ? '1' : Math.min(1, o * 2.2).toFixed(3)
          el.style.transform = o >= 1 ? 'none' : `translate3d(0, ${((1 - outQuart(o)) * 0.16).toFixed(4)}em, 0)`
          el._o = o
        }
      })
      // the block's cyan, growing behind its letters as they are typed
      if (D.bg && D.edges) {
        const n = D.edges.length
        const q = leaving ? n : clamp01((tu - D.brFrom * L.ch) / (n * L.ch)) * n
        const whole = Math.floor(q)
        const prev = whole === 0 ? 0 : D.edges[Math.min(n, whole) - 1]
        const next = whole >= n ? 1 : D.edges[whole]
        const edge = whole >= n ? 1 : prev + (next - prev) * outQuart(q - whole)
        const e = edge.toFixed(4)
        if (D._e !== e) {
          D.bg.style.clipPath = `inset(0 ${((1 - edge) * 100).toFixed(3)}% 0 0 round 0.18em)`
          D._e = e
        }
      }
    })
  }

  const { near, on } = useLoop(root, PERIOD, draw, STATIC_T)

  // off screen: the voice stops (the toggle stays as it was)
  useEffect(() => {
    if (!on) pauseKikoFor(id)
  }, [on, id])

  // the first time on screen: point out the sound, once per page view
  const hintTimer = useRef(0)
  useEffect(() => {
    if (!on || hinted || soundOn) return
    hinted = true
    setHint(true)
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS)
  }, [on, soundOn])
  useEffect(() => () => clearTimeout(hintTimer.current), [])

  const toggle = (e) => {
    e.stopPropagation()
    e.preventDefault()
    // reduced motion: the one line shown is said once, right away
    setHint(false)
    setKikoSound(id, !soundOn, false)
    if (!soundOn && prefersReducedMotion()) playKiko(id, LINE_T[2].src)
  }
  const stop = (e) => e.stopPropagation()
  const img = (src, ref, cls, style) => (
    <img
      key={src}
      ref={ref}
      className={cls}
      src={near ? src : undefined}
      alt=""
      width="720"
      height="811"
      decoding="async"
      draggable="false"
      style={style}
    />
  )

  return (
    <div
      ref={root}
      className={`ktk${ready ? ' ktk--ready' : ''}${hint ? ' ktk--hint' : ''} ${className}`.trim()}
      style={{ aspectRatio: ratio }}
    >
      <div
        className="ktk__stage"
        role="img"
        aria-label="Kiko talks: Start at the green dot. Pop all the Baa letters! Alhamdulillah! Next level! It's Story Time! Try again!"
      >
        <div className="ktk__kiko">
          <div className="ktk__fig" ref={fig}>
            {img(BODY, null, 'ktk__body')}
            <div className="ktk__swirl" ref={swirl} style={near ? { '--ktk-mask': `url(${BODY})` } : null}>
              <img ref={blob} className="ktk__blob" src={near ? SWIRL : undefined} alt="" width="320" height="320" decoding="async" draggable="false" />
            </div>
            {TALK.map((src, i) =>
              img(src, (el) => {
                talks.current[i] = el
              }, 'ktk__face', { opacity: 0 }),
            )}
            {img(HAPPY, happy, 'ktk__face')}
          </div>
        </div>
        <div className="ktk__box" aria-hidden="true">
          {LINE_T.map((L, i) => {
            const brFrom = L.chars.findIndex((c) => c.br)
            const nBr = L.chars.filter((c) => c.br).length
            const ch = (c, j) => (
              <span key={j} className="ktk__ch">
                {c.ch === ' ' ? ' ' : c.ch}
              </span>
            )
            const before = L.chars.slice(0, Math.max(0, brFrom)).map((c, j) => ch(c, j))
            const inBr = L.chars.slice(brFrom, brFrom + nBr).map((c, j) => ch(c, brFrom + j))
            let rest = brFrom + nBr
            // the block's full stop / mark stays with it (never alone)
            const mark = /^[.,!?]/.test(L.chars[rest]?.ch || '') ? ch(L.chars[rest], rest++) : null
            const after = L.chars.slice(rest).map((c, j) => ch(c, rest + j))
            return (
              <div
                key={L.text}
                className="ktk__line"
                ref={(el) => {
                  if (!el) return
                  const D = lines.current[i] || (lines.current[i] = {})
                  D.el = el
                  D.chars = [...el.querySelectorAll('.ktk__ch')]
                  D.bg = el.querySelector('.ktk__bg')
                  D.brFrom = brFrom
                }}
              >
                {before}
                <span className="ktk__nw">
                  <span className="ktk__br">
                    <span className="ktk__bg" />
                    {inBr}
                  </span>
                  {mark}
                </span>
                {after}
              </div>
            )
          })}
        </div>
      </div>
      <span className="ktk__hint" aria-hidden="true">
        Tap to hear Kiko
      </span>
      <button
        type="button"
        className={`ktk__sound${soundOn ? ' is-on' : ''}`}
        aria-pressed={soundOn}
        aria-label="Play Kiko's voice"
        title={soundOn ? 'Sound on' : 'Sound off'}
        onClick={toggle}
        onPointerDown={stop}
        onPointerEnter={stop}
        onPointerMove={stop}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" fill="currentColor" />
          {soundOn ? (
            <>
              <path d="M15.5 9a4 4 0 0 1 0 6" />
              <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
            </>
          ) : (
            <path d="m16 9.5 5 5m0-5-5 5" />
          )}
        </svg>
      </button>
    </div>
  )
}
