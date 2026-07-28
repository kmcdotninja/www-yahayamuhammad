import { useRef, useState } from 'react'
import { useSnd } from '../hooks/useSnd.js'

// A held-down key fires `input` far faster than the sample is long, which turns
// the keyboard into a buzz. One hit per ~45ms keeps it reading as typing.
const TYPE_MIN_GAP = 45

// A pill text field that lives in the hero as its own physics sticker: it drops
// in and is tossable like the rest (useStickerPhysics registers it because it
// carries the .hero-sticker class), but its <input>/<button> stay interactive —
// the drag hook ignores pointerdowns on those, and focusing the field freezes
// the box so it doesn't drift while you type. Submitting spawns a text sticker.
export default function StickerInput({ onSubmit }) {
  const [value, setValue] = useState('')
  const { play, SOUNDS } = useSnd()
  const lastTypeAt = useRef(0)

  // snd-lib's `type` picks one of five variants per hit, so a word doesn't
  // sound like the same key struck over and over.
  const change = (e) => {
    setValue(e.target.value)
    const now = performance.now()
    if (now - lastTypeAt.current < TYPE_MIN_GAP) return
    lastTypeAt.current = now
    play(SOUNDS.TYPE, { volume: 1 })
  }

  const submit = (e) => {
    e.preventDefault()
    const t = value.trim()
    if (!t) return
    onSubmit?.(t)
    setValue('')
  }

  return (
    <div className="hero-sticker hero-sticker--input" data-upright>
      <form className="hero-input" onSubmit={submit}>
        <input
          className="hero-input__field"
          value={value}
          onChange={change}
          placeholder="Type your sticker"
          aria-label="Type your sticker"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="hero-input__go" type="submit" aria-label="Add sticker">
          →
        </button>
      </form>
    </div>
  )
}
