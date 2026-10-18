import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './AskYahaya.css'
import Picture from './Picture.jsx'
import { ScrambleText } from './playground2/interactions/ScrambleText.jsx'
import { SymbolPulse, SYMBOLS } from './playground2/interactions/SymbolPulse.jsx'
import { VOCAB } from './playground2/data/thinkingVocab.js'
// The scramble/symbol styles live with the playground component that owns them.
// Imported rather than copied so the two can't drift apart; only the
// .pg2-scramble and .pg2-symbol rules are used here.
import './playground2/interactions/ThinkingStream.css'
import { askYahaya } from '../lib/yahayaLLM.js'
import { GREETING, STARTERS } from '../lib/yahayaKnowledge.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { useSnd } from '../hooks/useSnd.js'

// Selections shorter than this are almost always a stray double-click rather
// than someone meaning to ask about a passage.
const MIN_SELECTION = 12
// Long selections are truncated before they reach the engine and the chip.
const MAX_QUOTE = 400
const MOBILE_MQ = '(max-width: 760px)'
// The local engine answers in well under a millisecond, so without a floor the
// thinking state never paints a single frame and a reply just materialises.
// This is pacing, not fake work: it is a floor, so once the hosted engine is
// wired its real latency simply exceeds it and nothing is added.
//
// Tuning the feel: this and WORD_MS below are the two numbers that matter. The
// floor wants to be a little over one word cycle, so the line lands, holds,
// and turns over once before the answer replaces it.
const MIN_THINK_MS = 2000

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
// Gap between the selection and the pill.
const PILL_GAP = 8
// Below this much headroom the pill flips under the selection instead.
const PILL_FLIP = 64

// Where the pill should sit for a given range.
//
// Deliberately the LAST client rect rather than the bounding box: the bounding
// box of a multi-line highlight spans every line, so anchoring to it parks the
// pill at the top of the whole block, which is nowhere near the words you just
// dragged over. The last rect is the end of the selection, which is where the
// pointer actually let go.
function measureRange(range) {
  const rects = range.getClientRects()
  const rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) return null
  const below = rect.top < PILL_FLIP
  return {
    x: clamp(rect.left + rect.width / 2, 96, window.innerWidth - 96),
    y: below
      ? clamp(rect.bottom + PILL_GAP, 0, window.innerHeight - 44)
      : clamp(rect.top - PILL_GAP, 44, window.innerHeight - 8),
    below,
  }
}
const trimQuote = (s) =>
  s.length > MAX_QUOTE ? `${s.slice(0, MAX_QUOTE).trimEnd()}…` : s

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z"
        fill="currentColor"
      />
      <path d="M19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none">
      <path
        d="M4 12a8 8 0 1 1 2.5 5.8M4 19v-5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Reveals an answer a word at a time. Purely presentational: the whole string
// already exists, so nothing is lost if the reveal is skipped, which is what
// Reduced Motion does.
function Streamed({ text, reduced, onTick }) {
  const words = useMemo(() => text.split(' '), [text])
  // A message's text never changes once it is in the thread, and each one is
  // keyed by id, so the starting value is set once here rather than reset from
  // inside the effect.
  const [shown, setShown] = useState(reduced ? words.length : 0)

  useEffect(() => {
    if (reduced) return undefined
    let i = 0
    const id = setInterval(() => {
      i += 1
      setShown(i)
      onTick?.()
      if (i >= words.length) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [words, reduced, onTick])

  // Reading `reduced` here as well as in the initial state covers the case
  // where the preference flips part-way through a reveal: the rest of the
  // answer appears at once instead of freezing where the interval stopped.
  const visible = reduced ? text : words.slice(0, shown).join(' ')
  // The engine joins a two-part answer with a blank line. Rendering those as
  // separate paragraphs keeps "what do you use, and who with?" reading as two
  // answers rather than one run-on block.
  // Index keys are safe here: the paragraphs are a fixed split of a string that
  // never changes once the message is in the thread.
  return visible.split('\n\n').map((para, i) => (
    <p className="yllm__answer" key={i}>
      {para}
    </p>
  ))
}

// The waiting state, borrowing the playground's thinking stream. `analytical`
// is the honest vocabulary for what is actually happening while it waits:
// the engine is decomposing the question, ranking chunks and parsing terms.
const THINK_WORDS = VOCAB.analytical
// Matching the playground's own cadence rather than rushing it: the symbol
// shimmers on its own fast ticker while the word holds its phrase long enough
// to actually be read.
const SYMBOL_MS = 200
const WORD_MS = 1150
const BLINK_MS = 380

function Thinking({ reduced }) {
  const slot = useMemo(() => Math.max(...THINK_WORDS.map((w) => w.length)) + 3, [])
  const [word, setWord] = useState(THINK_WORDS[0])
  const [symbol, setSymbol] = useState(0)
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    if (reduced) return undefined
    let blinkTimer
    const symbols = setInterval(() => {
      setSymbol((i) => {
        let n = Math.floor(Math.random() * SYMBOLS.length)
        if (n === i && SYMBOLS.length > 1) n = (n + 1) % SYMBOLS.length
        return n
      })
    }, SYMBOL_MS)
    const words = setInterval(() => {
      setBlinking(true)
      blinkTimer = setTimeout(() => setBlinking(false), BLINK_MS)
      setWord((w) => {
        let n = THINK_WORDS[Math.floor(Math.random() * THINK_WORDS.length)]
        if (n === w) n = THINK_WORDS[(THINK_WORDS.indexOf(n) + 1) % THINK_WORDS.length]
        return n
      })
    }, WORD_MS)
    return () => {
      clearInterval(symbols)
      clearInterval(words)
      clearTimeout(blinkTimer)
    }
  }, [reduced])

  // Under Reduced Motion the word never changes, so ScrambleText never animates
  // and the symbol holds still: the same line, without the movement.
  return (
    <p className="yllm__thinking" aria-live="polite" aria-label="Thinking">
      <SymbolPulse index={symbol} color="var(--text-dim)" blinking={blinking} />
      <ScrambleText
        target={`${word}...`}
        accent="var(--text-dim)"
        showBar={!reduced}
        minChars={slot}
      />
    </p>
  )
}

export default function AskYahaya() {
  const reduced = useReducedMotion()
  const { play, SOUNDS } = useSnd()

  // The floating pill: { text, x, y } in viewport coordinates, or null.
  const [pill, setPill] = useState(null)
  const [open, setOpen] = useState(false)
  const [quote, setQuote] = useState('')
  const [thread, setThread] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Only the full-screen mobile panel freezes the page. On desktop the panel
  // sits beside the page on purpose, so you can keep scrolling and highlight
  // another passage without closing it.
  useScrollLock(open && isMobile)

  const rangeRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const restoreFocusRef = useRef(null)

  const scrollToEnd = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // ---- Selection -> pill -------------------------------------------------
  const placePill = useCallback(() => {
    const range = rangeRef.current
    if (!range) return
    const at = measureRange(range)
    if (!at) {
      setPill(null)
      return
    }
    setPill((p) => (p ? { ...p, ...at } : p))
  }, [])

  useEffect(() => {
    let frame = 0

    const read = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        rangeRef.current = null
        setPill(null)
        return
      }
      const text = sel.toString().replace(/\s+/g, ' ').trim()
      // Needs to be a real passage: long enough to be deliberate, and with
      // actual words in it rather than a run of punctuation or digits.
      if (text.length < MIN_SELECTION || !/[a-zA-Z]{3}/.test(text)) {
        rangeRef.current = null
        setPill(null)
        return
      }
      // Ignore anything highlighted inside the assistant's own surfaces,
      // otherwise reading an answer offers to ask about the answer.
      const host = sel.anchorNode?.parentElement?.closest?.('.yllm, .yllm-pill')
      if (host) return

      const range = sel.getRangeAt(0)
      rangeRef.current = range
      const at = measureRange(range)
      if (!at) {
        setPill(null)
        return
      }
      setPill({ text: trimQuote(text), ...at })
    }

    const onSelectionChange = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(read)
    }
    // The pill is position:fixed but anchors to a range that moves with the
    // page, so it is re-measured rather than left behind.
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(placePill)
    }

    document.addEventListener('selectionchange', onSelectionChange)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', onSelectionChange)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [placePill])

  // ---- Asking ------------------------------------------------------------
  // The chunk the last answer came from. A short follow-up ("tell me more") is
  // meaningless on its own, so the engine is told what was just being discussed.
  const lastTopicRef = useRef(null)

  const ask = useCallback(
    async (question, withQuote) => {
      const q = String(question || '').trim()
      if (!q || busy) return
      setBusy(true)
      setThread((t) => [...t, { role: 'user', text: q, id: `u${Date.now()}` }])
      setDraft('')
      requestAnimationFrame(scrollToEnd)

      const startedAt = performance.now()
      const res = await askYahaya(q, { quote: withQuote, previousId: lastTopicRef.current })
      const waited = performance.now() - startedAt
      if (waited < MIN_THINK_MS) {
        await new Promise((r) => setTimeout(r, MIN_THINK_MS - waited))
      }
      lastTopicRef.current = res.id
      setThread((t) => [...t, { ...res, role: 'bot', id: `b${Date.now()}` }])
      setBusy(false)
      play(SOUNDS.NOTIFICATION)
      requestAnimationFrame(scrollToEnd)
    },
    [busy, play, SOUNDS.NOTIFICATION, scrollToEnd],
  )

  const openWith = useCallback(
    (selected) => {
      restoreFocusRef.current = document.activeElement
      // A highlight brings its passage in; opening from the launcher starts
      // clean rather than resurrecting a quote from an earlier visit.
      setQuote(selected || '')
      // Already open means this is a second highlight, not a new session: the
      // quote swaps underneath, the thread carries on, and it doesn't re-chime.
      // Read outside the updater — React may run an updater twice.
      if (!open) play(SOUNDS.TRANSITION_UP)
      setOpen(true)
      setPill(null)
      // Clear the browser selection so the highlight doesn't sit there
      // competing with the quote chip now showing the same words.
      window.getSelection()?.removeAllRanges()
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [open, play, SOUNDS.TRANSITION_UP],
  )

  const close = useCallback(() => {
    setOpen(false)
    play(SOUNDS.TRANSITION_DOWN)
    const back = restoreFocusRef.current
    if (back && typeof back.focus === 'function') back.focus()
  }, [play, SOUNDS.TRANSITION_DOWN])

  const reset = useCallback(() => {
    lastTopicRef.current = null
    setThread([])
    setQuote('')
    setDraft('')
    play(SOUNDS.TAP)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [play, SOUNDS.TAP])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const onSubmit = (e) => {
    e.preventDefault()
    ask(draft, quote)
  }

  const last = thread[thread.length - 1]
  const suggestions =
    last?.role === 'bot' && last.suggestions?.length ? last.suggestions : STARTERS

  return (
    <>
      {/* Persistent launcher. Highlighting text is the nicer way in, but it is
          not discoverable on its own, so the assistant also has a door. Hidden
          while the panel is open, and while a selection pill is showing, so
          there is only ever one "ask" affordance on screen. */}
      {!open && !pill && (
        <button
          type="button"
          className="yllm-fab"
          onClick={() => openWith('')}
          aria-label="Ask YahayaLLM"
        >
          <SparkIcon />
          <span>Ask YahayaLLM</span>
        </button>
      )}

      {/* Shown even while the panel is open: the page stays live beside it, so
          highlighting another passage should swap the quote rather than do
          nothing. Kept as an explicit tap rather than replacing the quote the
          moment a selection changes, which would hijack an accidental drag. */}
      {pill && (
        <button
          type="button"
          className={`yllm-pill${pill.below ? ' yllm-pill--below' : ''}`}
          style={{ left: `${pill.x}px`, top: `${pill.y}px` }}
          // The pill must survive the mousedown that would otherwise collapse
          // the selection before the click lands.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => openWith(pill.text)}
        >
          <SparkIcon />
          Ask YahayaLLM
        </button>
      )}

      {createPortal(
        <div
          className={`yllm${open ? ' yllm--open' : ''}${reduced ? ' yllm--still' : ''}`}
          aria-hidden={!open}
        >
          <button
            type="button"
            className="yllm__scrim"
            onClick={close}
            tabIndex={-1}
            aria-label="Close YahayaLLM"
          />

          <aside
            className="yllm__panel"
            role="dialog"
            aria-modal={isMobile ? 'true' : 'false'}
            aria-label="Ask YahayaLLM"
          >
            <header className="yllm__bar">
              <span className="yllm__title">YahayaLLM</span>
              <div className="yllm__bar-actions">
                <button
                  type="button"
                  className="yllm__icon"
                  onClick={reset}
                  aria-label="Start over"
                  title="Start over"
                  tabIndex={open ? 0 : -1}
                >
                  <ResetIcon />
                </button>
                <button
                  type="button"
                  className="yllm__icon"
                  onClick={close}
                  aria-label="Close"
                  title="Close"
                  tabIndex={open ? 0 : -1}
                >
                  <CloseIcon />
                </button>
              </div>
            </header>

            {/* data-lenis-prevent: Lenis owns the wheel globally, and on desktop
                the panel opens with the page still live behind it, so without
                this the wheel scrolls the page instead of the thread. */}
            <div className="yllm__list" ref={listRef} data-lenis-prevent>
              {thread.length === 0 && <p className="yllm__greeting">{GREETING}</p>}

              {thread.map((m) =>
                m.role === 'user' ? (
                  <p className="yllm__ask" key={m.id}>
                    {m.text}
                  </p>
                ) : (
                  <div className="yllm__reply" key={m.id}>
                    <Streamed text={m.answer} reduced={reduced} onTick={scrollToEnd} />

                    {m.images?.length > 0 && (
                      <div className="yllm__shots">
                        {m.images.map((src) => (
                          <Picture key={src} src={src} alt="" className="yllm__shot" />
                        ))}
                      </div>
                    )}

                    {m.links?.length > 0 && (
                      <div className="yllm__links">
                        {m.links.map((l) => (
                          <a
                            key={l.href}
                            href={l.href}
                            className="yllm__link"
                            target={l.href.startsWith('http') || l.href.endsWith('.pdf') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            tabIndex={open ? 0 : -1}
                          >
                            {l.label}
                            {(l.href.startsWith('http') || l.href.endsWith('.pdf')) && ' ↗'}
                          </a>
                        ))}
                      </div>
                    )}

                    {m.source && <p className="yllm__source">{m.source}</p>}
                  </div>
                ),
              )}

              {busy && <Thinking reduced={reduced} />}

              {!busy && (
                <div className="yllm__suggestions">
                  {suggestions.map((s) => (
                    <button
                      type="button"
                      className="yllm__suggestion"
                      key={s}
                      onClick={() => ask(s, quote)}
                      tabIndex={open ? 0 : -1}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form className="yllm__composer" onSubmit={onSubmit}>
              {quote && (
                <div className="yllm__quote">
                  <p>{quote}</p>
                  <button
                    type="button"
                    className="yllm__icon yllm__icon--tiny"
                    onClick={() => setQuote('')}
                    aria-label="Remove the quoted passage"
                    tabIndex={open ? 0 : -1}
                  >
                    <CloseIcon />
                  </button>
                </div>
              )}
              <div className="yllm__field">
                <input
                  ref={inputRef}
                  className="yllm__input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={quote ? 'Ask about this quote...' : 'Ask about Yahaya...'}
                  aria-label="Ask a question"
                  tabIndex={open ? 0 : -1}
                />
                <button
                  type="submit"
                  className="yllm__send"
                  disabled={!draft.trim() || busy}
                  aria-label="Send"
                  tabIndex={open ? 0 : -1}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </aside>
        </div>,
        document.body,
      )}
    </>
  )
}
