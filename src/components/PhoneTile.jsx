import { useRef } from 'react'
import './PhoneTile.css'
import { useLazyLoop } from '../hooks/useLazyLoop.js'

// <PhoneTile> — a project tile with a phone in it, built in code: the grey
// panel, an iPhone (silver band, black bezel, Dynamic Island, 9:41 status bar)
// and the small uppercase caption under it. It matches the baked Groq mockups
// (1800 x 2250 design, phone 824 x 1723 at 488,216) so the two read as one set,
// but the screen is live: a silent looping video of the real app, or a still.
//
// Screens are recorded at 393 x 852 with the iPhone's safe areas, so the app
// already sits under the status bar; the bar here is only the time, icons and
// island, drawn over the app's own top.
//
// Video is lazy: nothing downloads until the tile is near the viewport
// (preload="none" + IntersectionObserver), it plays only while visible, and
// with reduced motion it never loads: the poster stays.

const posterOf = (src) => src.replace(/\.mp4$/i, '-poster.webp')

export default function PhoneTile({ phone, caption }) {
  const ref = useRef(null)
  const isVideo = /\.mp4$/i.test(phone)
  useLazyLoop(ref, isVideo ? phone : null)

  return (
    <div className={`ptile${caption ? '' : ' ptile--nocap'}`} role="img" aria-label={caption ? `Kiko app: ${caption}` : undefined}>
      <span className="ptile__btn ptile__btn--action" aria-hidden="true" />
      <span className="ptile__btn ptile__btn--up" aria-hidden="true" />
      <span className="ptile__btn ptile__btn--down" aria-hidden="true" />
      <span className="ptile__btn ptile__btn--power" aria-hidden="true" />
      <div className="ptile__phone" aria-hidden="true">
        <div className="ptile__bezel" />
        <div className="ptile__screen">
          {isVideo ? (
            <video
              ref={ref}
              className="ptile__media"
              poster={posterOf(phone)}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              width="480"
              height="1040"
            />
          ) : (
            <img
              className="ptile__media"
              src={phone}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              width="480"
              height="1040"
            />
          )}
          <div className="ptile__status">
            <span className="ptile__time">9:41</span>
            <span className="ptile__icons">
              <svg viewBox="0 0 19 12" className="ptile__sig"><rect x="0" y="8" width="3.2" height="4" rx="1" /><rect x="5.2" y="5.5" width="3.2" height="6.5" rx="1" /><rect x="10.4" y="3" width="3.2" height="9" rx="1" /><rect x="15.6" y="0" width="3.2" height="12" rx="1" /></svg>
              <svg viewBox="0 0 17 12" className="ptile__wifi"><path d="M8.5 2.4c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.9 1.7 11.3.6 8.5.6S3.1 1.7 1.1 3.7l1.2 1.2C3.9 3.3 6.1 2.4 8.5 2.4zm0 3.5c1.4 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.9 10.4 4.1 8.5 4.1S4.8 4.9 3.5 6.2l1.2 1.2c1-.9 2.4-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.4 7 9.9c.4-.4.9-.6 1.5-.6z" /></svg>
              <svg viewBox="0 0 27 13" className="ptile__bat"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" strokeOpacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2.3" /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fillOpacity=".4" /></svg>
            </span>
          </div>
          <span className="ptile__island" />
        </div>
      </div>
      {caption && <span className="ptile__cap">{caption}</span>}
    </div>
  )
}
