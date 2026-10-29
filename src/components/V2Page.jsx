import MosaicFeed from './MosaicFeed.jsx'

// /v2: a playground experiment, not linked from anywhere. Every project's
// strongest pieces in one mosaic instead of a section each, to see whether the
// work reads better as a single feed. A few picks from each, dealt so no two
// neighbours come from the same project, and Kiko's website animations
// (components/kiko/web) in among them. useMosaic packs it with no holes.

// [project, media, options]: media is anything ProjectMedia takes, or { web }
// for one of Kiko's website cards. Options: `tone`, the tile's colour family
// (measured from the image itself), which useMosaic uses to keep matching
// colours apart; `wide` spans two columns. The order is only a starting deal:
// useMosaic reshuffles a little for colour and to leave no holes.
const FEED = [
  ['Kiko', { web: 'trace' }, { tone: 'violet' }],
  ['Kutuby', '/projects/kutuby/website.webp', { tone: 'blue', wide: true }],
  ['Groq', '/projects/Groq/2.png', { tone: 'light' }],
  ['Kutuby', '/projects/kutuby/mobile-app-2.webp', { tone: 'orange' }],
  ['Kiko', { web: 'pop' }, { tone: 'dark' }],
  ['Rednoxx', '/projects/Rednoxx/Reg%20Slip.webp', { tone: 'light' }],
  ['Kutuby', '/projects/kutuby/components.webp', { tone: 'green' }],
  ['Kiko', { phone: '/video/kiko/kikos-look.mp4' }, { tone: 'light' }],
  ['Rednoxx', { video: '/video/rednoxx/him-patients.mp4', width: 1600, height: 900 }, { tone: 'light', wide: true }],
  ['Groq', '/projects/Groq/1.png', { tone: 'blue' }],
  ['Kiko', { web: 'roll' }, { tone: 'dark' }],
  ['Kutuby', '/projects/kutuby/mobile-app-1.webp', { tone: 'cyan' }],
  ['Rednoxx', '/projects/Rednoxx/Rednoxx%20Logo.webp', { tone: 'violet' }],
  ['Kiko', { web: 'count' }, { tone: 'light' }],
  ['Kutuby', '/projects/kutuby/website-2.webp', { tone: 'yellow', wide: true }],
  ['Groq', '/projects/Groq/6.png', { tone: 'light' }],
  ['Kiko', { video: '/video/kiko/web-runner.mp4', width: 540, height: 720 }, { tone: 'dark' }],
  ['Rednoxx', '/projects/Rednoxx/Button.webp', { tone: 'light' }],
  ['Kutuby', '/projects/kutuby/characters.png', { tone: 'blue' }],
  ['Kiko', { tablet: '/video/kiko/ipad-catch-levelup.mp4' }, { tone: 'light', wide: true }],
  ['Kutuby', '/projects/kutuby/type-2-1.png', { tone: 'orange' }],
  ['Kiko', { web: 'stories' }, { tone: 'dark' }],
  ['Rednoxx', '/projects/Rednoxx/Components.webp', { tone: 'light' }],
  ['Kiko', { snippet: 'new-in-kiko' }, { tone: 'light' }],
  ['Groq', '/projects/Groq/3.png', { tone: 'light' }],
  ['Kiko', { video: '/video/kiko/web-levelup.mp4', width: 540, height: 720 }, { tone: 'dark' }],
]

export default function V2Page() {
  return (
    <MosaicFeed
      feed={FEED}
      title={<>The work,<br />all at once</>}
      sub="An experiment: every project in one feed."
    />
  )
}
