import { useMemo } from 'react'
import { motion } from 'framer-motion'

const SYMS = ['·', '+', '*', '✦', '◆', '○']

// Decorative ambient tokens drifting across the background. Procedurally
// placed and animated; positions are stable per mount.
export function FloatingToken({ count = 14 }) {
  const tokens = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        symbol: SYMS[Math.floor(Math.random() * SYMS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 5 + Math.random() * 8,
        delay: Math.random() * 4,
        drift: 6 + Math.random() * 12,
      })),
    [count],
  )

  return (
    <>
      {tokens.map((t) => (
        <motion.span
          key={t.id}
          className="pg2-think__token"
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
          animate={{
            y: [-t.drift, t.drift, -t.drift],
            opacity: [0.05, 0.2, 0.05],
          }}
          transition={{
            duration: t.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: t.delay,
          }}
        >
          {t.symbol}
        </motion.span>
      ))}
    </>
  )
}
