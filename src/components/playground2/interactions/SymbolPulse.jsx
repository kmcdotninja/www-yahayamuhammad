import { AnimatePresence, motion } from 'framer-motion'

export const SYMBOLS = ['*', '+', '✦', '✳', '◆', '·', '○']

// The leading mark. Three nested motion spans so each motion stays
// independent: the outer rotates continuously, the middle pulses on
// `blinking`, the inner swaps glyphs whenever `index` changes.
export function SymbolPulse({ index, color, blinking }) {
  return (
    <motion.span
      className="pg2-symbol"
      style={{ color }}
      animate={{ rotate: 360 }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    >
      <motion.span
        className="pg2-symbol__inner"
        animate={
          blinking
            ? { scale: [1, 1.55, 1], opacity: [1, 0.35, 1] }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {SYMBOLS[index % SYMBOLS.length]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </motion.span>
  )
}
