import { motion } from 'framer-motion'
import './HeroCentered.css'
import TopNav from './TopNav.jsx'
import { useSnd } from '../hooks/useSnd.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'

// The headline reveals line-by-line on load: each line sits inside an
// overflow-clipped mask and slides up from below, staggered. Splitting the
// copy into an array keeps one mask wrapper per line in the markup.
const HEADLINE_LINES = [
  'Product designer',
  'crafting brands, products',
  'and websites',
]

// Soft expo.out — the same settle curve the scroll reveals use, expressed as
// a cubic-bezier so Framer Motion matches the rest of the site's motion feel.
const REVEAL_EASE = [0.16, 1, 0.3, 1]

export default function HeroCentered() {
  const { play, SOUNDS } = useSnd()
  const reduced = useReducedMotion()

  // Container orchestrates the per-line stagger; each line slides its inner
  // text up out of the clip. Under Reduced Motion we drop the transform and
  // just fade so nothing slides.
  const lineMask = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduced ? 0 : 0.12, delayChildren: 0.15 },
    },
  }
  const lineInner = {
    hidden: reduced ? { opacity: 0 } : { y: '110%' },
    visible: {
      y: '0%',
      opacity: 1,
      transition: { duration: reduced ? 0.4 : 0.9, ease: REVEAL_EASE },
    },
  }

  return (
    <section className="introC">
      <TopNav />

      <h1 className="sr-only">
        Yahaya Muhammad — Product Designer & UX Designer
      </h1>

      {/* Casual stickers anchored to the headline — same SVG set the
          playground StickerStack uses (4 = thumbtack pinning "PRODUCT",
          8 = brain trailing "BRANDS,"). Decorative only (aria-hidden)
          and width-gated so they never crowd the headline on tablet. */}
      <img
        className="introC__sticker introC__sticker--pin"
        src="/playground/stickers/4.svg"
        alt=""
        aria-hidden="true"
        width="220"
        height="220"
        loading="eager"
        decoding="async"
        draggable={false}
      />
      <img
        className="introC__sticker introC__sticker--brain"
        src="/playground/stickers/8.svg"
        alt=""
        aria-hidden="true"
        width="485"
        height="340"
        loading="eager"
        decoding="async"
        draggable={false}
      />

      <motion.p
        className="introC__big"
        aria-hidden="true"
        variants={lineMask}
        initial="hidden"
        animate="visible"
      >
        {HEADLINE_LINES.map((line) => (
          <span key={line} className="introC__line">
            <motion.span className="introC__line-inner" variants={lineInner}>
              {line}
            </motion.span>
          </span>
        ))}
      </motion.p>

      <div className="introC__about">
        <p className="introC__bio">
          Currently designing at Kutuby to make Islamic studies more fun and engaging for kids.
        </p>
        <a
          href="#work"
          className="introC__scroll"
          onClick={() => play(SOUNDS.BUTTON)}
        >
          ↓ SCROLL FOR MORE
        </a>
      </div>
    </section>
  )
}
