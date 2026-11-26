import { useEffect, useRef } from 'react'
import { createLensCanvas } from './lensCanvas.js'
import './deviceTiles.css'
import './LensCanvas.css'

// Every project clip on an endless canvas you drag around, seen through a fisheye lens (see lensCanvas.js).
export default function LensCanvas({ className = '', topInset = 0, onPan }) {
  const ref = useRef(null)
  const panRef = useRef(onPan)
  useEffect(() => { panRef.current = onPan }, [onPan])
  // (set up once: topInset, a number or a function giving one, only places the opening view)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => createLensCanvas(ref.current, { topInset: typeof topInset === 'function' ? topInset() : topInset, onPan: (d) => panRef.current?.(d) }), [])
  return (
    <div
      ref={ref}
      className={`lens ${className}`}
      role="img"
      aria-label="Yahaya Muhammad's work: clips from Gukart, Kiko, Kutuby and Bayan on a canvas you can drag around. Click a clip to open it."
    />
  )
}
