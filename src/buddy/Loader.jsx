// The loader: a black screen before the site. The Robot (Yahaya's assistant) is kickboxing: a Singapore snapshot drops
// in at each kick and is sent spinning off to stick on the screen, then the screen lifts away to the site. A click
// skips it.
// The Robot is a pre-rendered clip (public/loader/robot-kicks.mp4, 3s, rendered frame by frame from DeFleet's 3D Robot,
// its 'kicks' move, on the site's own black), so it plays at once; the snapshots are real elements over it, timed to
// its kicks (at .75s, 1.35s and 2.04s) and its closing flying kick (2.64s), so the photos stay sharp and can be swapped freely.
// First visit (nothing cached yet): the clip and the snapshots are fetched whole BEFORE anything moves (index.html starts
// those downloads as the page is parsed), and the snapshots' clock starts only when the clip is really playing. Until
// then the screen holds on the site's black, briefly (WAIT below), or the loader is skipped. Without this the kicks ran on time against a clip and photos still on
// their way: empty frames flying past no Robot.
import { useEffect, useRef, useState } from 'react'
import './loader.css'

const CLIP = '/loader/robot-kicks.mp4'
// (the snapshots are small 400x500 copies of the /about photos, made for the loader: 150KB for the four)
const SHOTS = [
  { src: '/loader/north-bridge.webp', cap: 'North Bridge', at: .75, cls: 'k1' },
  { src: '/loader/marina-bay.webp', cap: 'Marina Bay', at: 1.35, cls: 'k2' },
  { src: '/loader/arab-street.webp', cap: 'Arab Street', at: 2.04, cls: 'k3' },
  { src: '/loader/selfie.webp', cap: 'Singapore, me', at: 2.64, cls: 'k4' },   // (the flying kick at the end)
]
// No one waits on a blank screen for the loader: if the clip and snapshots are not all here within WAIT of the loader
// going up, there is no loader on this visit, straight to the site. (On a quick connection they are here already.)
const WAIT = 1500

export default function Loader({ onLift, onDone }) {
  const [out, setOut] = useState(false), [clip, setClip] = useState(null), [go, setGo] = useState(false)
  const v = useRef(null), done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true; setOut(true); onLift?.()   // (the site starts as it lifts: the stickers fall)
    setTimeout(onDone, 700)   // (the lift)
  }
  // 1. everything down first: the clip whole (as a blob, so it cannot stall mid-kick), each snapshot decoded
  useEffect(() => {
    let off = false, url = null
    const late = setTimeout(finish, WAIT)
    const shots = SHOTS.map(s => { const i = new Image(); i.src = s.src; return i.decode().catch(() => {}) })   // (a missing photo never blocks)
    // (index.html has usually started this fetch already, as the page was parsed: window.__pfClip)
    const film = (window.__pfClip || fetch(CLIP).then(r => r.ok ? r.blob() : Promise.reject(new Error('clip ' + r.status))))
      .then(b => (url = URL.createObjectURL(new Blob([b], { type: 'video/mp4' }))))
      .catch(() => CLIP)   // (the fetch refused: let the video element load it itself)
    Promise.all([film, ...shots]).then(([src]) => { if (!off) { clearTimeout(late); setClip(src) } })
    return () => { off = true; clearTimeout(late); if (url) URL.revokeObjectURL(url) }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  // 2. then play; the snapshots start on the clip's 'playing' (onPlaying below), so they stay in time with its kicks
  useEffect(() => {
    if (!clip) return
    const cap = setTimeout(finish, 7000)   // (never stuck: a clip that will not play still lets the site through)
    v.current?.play?.().catch(() => finish())   // (autoplay refused: straight to the site)
    return () => clearTimeout(cap)
  }, [clip])   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={'pf-loader' + (go ? ' go' : '') + (out ? ' out' : '')} onClick={finish} role="presentation">
      <div className="pf-loader-stage">
        <video ref={v} className="pf-loader-clip" src={clip || undefined} muted playsInline preload="auto" onPlaying={() => setGo(true)} onEnded={() => setTimeout(finish, 600)} aria-hidden="true" />
        {SHOTS.map(s => (
          <figure key={s.cls} className={'pf-snap ' + s.cls} style={{ animationDelay: `${s.at - .4}s` }} aria-hidden="true">
            <img src={s.src} alt="" /><figcaption>{s.cap}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
