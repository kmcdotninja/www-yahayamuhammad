// The loader: a black screen before the site. The Robot (Yahaya's assistant) is kickboxing: a Singapore snapshot drops
// in at each kick and is sent spinning off to stick on the screen, then the screen lifts away to the site. A click
// skips it.
// The Robot is a pre-rendered clip (public/loader/robot-kicks.mp4, 3s, rendered frame by frame from DeFleet's 3D Robot,
// its 'kicks' move, on the site's own black), so it plays at once; the snapshots are real elements over it, timed to
// its kicks (at .75s, 1.35s and 2.04s) and its closing flying kick (2.64s), so the photos stay sharp and can be swapped freely.
import { useEffect, useRef, useState } from 'react'
import './loader.css'

const SHOTS = [
  { src: '/about/singapore-street-1.webp', cap: 'North Bridge', at: .75, cls: 'k1' },
  { src: '/about/Singapore/Marina Bay Night.webp', cap: 'Marina Bay', at: 1.35, cls: 'k2' },
  { src: '/about/Singapore/Arab Street Exploration.webp', cap: 'Arab Street', at: 2.04, cls: 'k3' },
  { src: '/about/Singapore/Selfie.webp', cap: 'Singapore, me', at: 2.64, cls: 'k4' },   // (the flying kick at the end)
]

export default function Loader({ onLift, onDone }) {
  const [out, setOut] = useState(false), v = useRef(null), done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true; setOut(true); onLift?.()   // (the site starts as it lifts: the stickers fall)
    setTimeout(onDone, 700)   // (the lift)
  }
  useEffect(() => {
    const cap = setTimeout(finish, 7000)   // (never stuck: a slow or blocked video still lets the site through)
    v.current?.play?.().catch(() => finish())   // (autoplay refused: straight to the site)
    return () => clearTimeout(cap)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={'pf-loader' + (out ? ' out' : '')} onClick={finish} role="presentation">
      <div className="pf-loader-stage">
        <video ref={v} className="pf-loader-clip" src="/loader/robot-kicks.mp4" muted playsInline preload="auto" onEnded={() => setTimeout(finish, 600)} aria-hidden="true" />
        {SHOTS.map(s => (
          <figure key={s.cls} className={'pf-snap ' + s.cls} style={{ animationDelay: `${s.at - .4}s` }} aria-hidden="true">
            <img src={s.src} alt="" /><figcaption>{s.cap}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
