import MosaicFeed from './MosaicFeed.jsx'
import { everyProject } from '../data.js'

// /v3: a playground experiment, not linked from anywhere. /v2 with nothing
// left out: every image, clip and card of every project (Waffle too, though
// it's hidden on the home page), in one mosaic, each project spread evenly
// through it; useMosaic then packs it with no holes and keeps colours and
// projects apart, measuring each image's colour itself.

// one column or two is left to the layout (smartWide): any landscape piece may
// go wide, so nothing is marked here.
// Spread evenly, not dealt in turns: each piece sits at its share of the way
// through its own project (the 3rd of 12 at 0.21, the 3rd of 18 at 0.14...) and
// the feed is sorted by that, so a big project (Kutuby's 18) runs through the
// whole feed instead of piling up at the end once the small ones run out.
const FEED = everyProject
  .flatMap((p, pi) => (p.images || []).map((src, i, all) => ({ at: (i + 0.5) / all.length, pi, item: [p.name, src] })))
  .sort((a, b) => a.at - b.at || a.pi - b.pi)
  .map((x) => x.item)

export default function V3Page() {
  return (
    <MosaicFeed
      feed={FEED}
      smartWide
      columnControl
      title={<>Everything,<br />all at once</>}
      sub={`An experiment: all ${FEED.length} pieces of every project in one feed.`}
    />
  )
}
