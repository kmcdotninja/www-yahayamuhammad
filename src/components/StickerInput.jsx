import { useState } from 'react'

// A pill text field that lives in the hero as its own physics sticker: it drops
// in and is tossable like the rest (useStickerPhysics registers it because it
// carries the .hero-sticker class), but its <input>/<button> stay interactive —
// the drag hook ignores pointerdowns on those, and focusing the field freezes
// the box so it doesn't drift while you type. Submitting spawns a text sticker.
export default function StickerInput({ onSubmit }) {
  const [value, setValue] = useState('')

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
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type something…"
          aria-label="Type to add a sticker"
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
