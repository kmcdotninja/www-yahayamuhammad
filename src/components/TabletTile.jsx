import { useRef } from 'react'
import './PhoneTile.css'
import './TabletTile.css'
import { useLazyLoop } from '../hooks/useLazyLoop.js'

// <TabletTile> — the iPad (landscape) sibling of <PhoneTile>: the same silver
// band, black bezel and grey panel, the camera on the long edge, a 9:41 status
// bar, and a silent looping recording of the real app (1180 x 820 points at 2x, encoded 1440 x 1000; recorded
// with the iPad's safe areas so the app sits under the status bar). Lazy and
// polite like the phone: loads near the viewport, plays only while visible,
// reduced motion keeps the poster.

const posterOf = (src) => src.replace(/\.mp4$/i, '-poster.webp')

export default function TabletTile({ tablet, caption }) {
  const ref = useRef(null)
  useLazyLoop(ref, tablet)
  return (
    <div className={`ptile ttile${caption ? '' : ' ptile--nocap'}`} role="img" aria-label={caption ? `Kiko app on iPad: ${caption}` : 'Kiko app on iPad'}>
      <div className="ttile__pad" aria-hidden="true">
        <div className="ttile__bezel" />
        <span className="ttile__cam" />
        <div className="ttile__screen">
          <video
            ref={ref}
            className="ptile__media"
            poster={posterOf(tablet)}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            width="1440"
            height="1000"
          />
          <div className="ttile__status">
            <span>9:41&nbsp;&nbsp;Mon Oct 13</span>
            <span className="ptile__icons ttile__icons">
              <svg viewBox="0 0 17 12" className="ptile__wifi"><path d="M8.5 2.4c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.9 1.7 11.3.6 8.5.6S3.1 1.7 1.1 3.7l1.2 1.2C3.9 3.3 6.1 2.4 8.5 2.4zm0 3.5c1.4 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.9 10.4 4.1 8.5 4.1S4.8 4.9 3.5 6.2l1.2 1.2c1-.9 2.4-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.4 7 9.9c.4-.4.9-.6 1.5-.6z" /></svg>
              <svg viewBox="0 0 27 13" className="ptile__bat"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" strokeOpacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2.3" /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fillOpacity=".4" /></svg>
            </span>
          </div>
        </div>
      </div>
      {caption && <span className="ptile__cap">{caption}</span>}
    </div>
  )
}
