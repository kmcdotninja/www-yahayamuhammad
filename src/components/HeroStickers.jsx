import './HeroStickers.css'
import HeroVideoCard from './HeroVideoCard.jsx'

// The hero's sticker collage (a selection from /public/playground/stickers),
// shared by the desktop <HeroCentered> and mobile <Hero>. `mod` selects the CSS
// rule that sizes each one (its --pin/--brain/… width); the physics engine
// (useStickerPhysics) owns placement, so `mod` is purely the size hook. Adding
// one is: drop the SVG in the folder, append a row, add a .hero-sticker--<mod>
// width block. w/h are the art's true intrinsic sizes so each box is reserved
// at the right ratio before it decodes.
//
// The Kanemi Kudi and Portfolio Website wordmarks and the "I'm a designer"
// die-cut used to sit here; they came out to leave the pile room for the
// build-clip polaroid below.
const STICKERS = [
  { id: 'pin', mod: 'pin', src: '/playground/stickers/4.svg', w: 333, h: 388 },
  { id: 'brain', mod: 'brain', src: '/playground/stickers/8.svg', w: 277, h: 242 },
  { id: 'book', mod: 'book', src: '/playground/stickers/5.svg', w: 433, h: 360 },
  // The face self-rights instead of tumbling — a portrait resting upside-down
  // reads as broken, where a wordmark at an angle reads as a slapped sticker.
  // Rastered PNG, not the 561KB traced SVG: at display size it's identical but
  // rasterizes instantly, so it never stutters the fall (the SVG is kept too).
  { id: 'face', mod: 'face', src: '/playground/stickers/Yahaya.png', w: 320, h: 485, upright: true },
]

function Sticker({ mod, src, w, h, upright }) {
  return (
    <img
      className={`hero-sticker hero-sticker--${mod}`}
      src={src}
      alt=""
      aria-hidden="true"
      width={w}
      height={h}
      loading="eager"
      decoding="async"
      draggable={false}
      data-upright={upright ? '' : undefined}
    />
  )
}

// Renders the stickers as bare siblings so they drop straight into whichever
// hero <section> hosts them; that section calls useStickerPhysics on its ref.
// The video polaroid is one of the bodies too — it just carries a lightbox.
export default function HeroStickers() {
  return (
    <>
      {STICKERS.map((sticker) => (
        <Sticker key={sticker.id} {...sticker} />
      ))}
      <HeroVideoCard />
    </>
  )
}
