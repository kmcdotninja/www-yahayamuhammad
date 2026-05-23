import { useState } from 'react'
import './ColorSwatch.css'

const SWATCHES = [
  { id: 'default', bg: '#0a0a0a', text: '#e6e3dc', border: 'rgba(255,255,255,0.12)', label: 'Default' },
  { id: 'orange',  bg: '#ff7a1c', text: '#101010', border: 'rgba(0,0,0,0.18)',   label: 'Orange' },
  { id: 'blue',    bg: '#1e62ff', text: '#f5f3ee', border: 'rgba(255,255,255,0.22)', label: 'Blue' },
  { id: 'maroon',  bg: '#6f2a2a', text: '#f5f3ee', border: 'rgba(255,255,255,0.18)', label: 'Maroon' },
  { id: 'yellow',  bg: '#f1de40', text: '#101010', border: 'rgba(0,0,0,0.18)',   label: 'Yellow' },
  { id: 'white',   bg: '#FFF9E0', text: '#101010', border: 'rgba(0,0,0,0.12)',   label: 'White' },
]

export default function ColorSwatch() {
  const [active, setActive] = useState('default')

  const apply = (s) => {
    const root = document.documentElement
    root.style.setProperty('--bg', s.bg)
    root.style.setProperty('--text', s.text)
    root.style.setProperty('--border', s.border)
    setActive(s.id)
  }

  return (
    <div className="cs" role="toolbar" aria-label="Site color">
      {SWATCHES.map((s) => (
        <button
          key={s.id}
          className={`cs__dot ${active === s.id ? 'cs__dot--active' : ''}`}
          style={{ background: s.bg }}
          onClick={() => apply(s)}
          aria-label={s.label}
          aria-pressed={active === s.id}
          title={s.label}
        />
      ))}
    </div>
  )
}
