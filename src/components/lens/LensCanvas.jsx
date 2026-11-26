import { useEffect, useRef } from 'react'
import { createLensCanvas } from './lensCanvas.js'
import './deviceTiles.css'
import './LensCanvas.css'

// Every project clip on an endless canvas you drag around, seen through a fisheye lens (see lensCanvas.js).
export default function LensCanvas({ className = '' }) {
  const ref = useRef(null)
  useEffect(() => createLensCanvas(ref.current), [])
  return (
    <div
      ref={ref}
      className={`lens ${className}`}
      role="img"
      aria-label="Yahaya Muhammad's work: clips from Gukart, Kiko, Kutuby and Bayan on a canvas you can drag around. Click a clip to open it."
    />
  )
}
