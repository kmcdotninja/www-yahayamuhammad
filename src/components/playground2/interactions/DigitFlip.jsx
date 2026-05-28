import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function DigitFlipBase({ value, direction, height, width, duration, dimmed }) {
  const restOpacity = dimmed ? 0.22 : 1

  return (
    <div className="pg2-digit" style={{ height, width }}>
      <AnimatePresence initial={false}>
        <motion.span
          key={String(value)}
          className="pg2-digit__glyph"
          style={{ willChange: 'transform, filter, opacity' }}
          initial={{ y: direction * height, filter: 'blur(8px)', opacity: 0 }}
          animate={{
            y: 0,
            filter: 'blur(0px)',
            opacity: restOpacity,
            textShadow: dimmed
              ? '0 0 0px rgba(255,255,255,0)'
              : ['0 0 18px rgba(255,255,255,0.45)', '0 0 0px rgba(255,255,255,0)'],
            transition: {
              y: { type: 'spring', duration, bounce: 0.2 },
              filter: { duration: duration * 0.55, ease: 'easeOut' },
              opacity: { duration: duration * 0.45, ease: 'easeOut' },
              textShadow: { duration: duration * 0.7, ease: 'easeOut' },
            },
          }}
          exit={{
            y: -direction * height,
            filter: 'blur(8px)',
            opacity: 0,
            transition: {
              y: { type: 'spring', duration: duration * 0.85, bounce: 0 },
              filter: { duration: duration * 0.4, ease: 'easeIn' },
              opacity: { duration: duration * 0.5, ease: 'easeIn' },
            },
          }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export const DigitFlip = memo(DigitFlipBase)
