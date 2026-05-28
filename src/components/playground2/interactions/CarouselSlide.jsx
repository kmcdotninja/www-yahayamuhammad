import { memo } from 'react'
import { motion, useTransform } from 'framer-motion'

function CarouselSlideBase({ children, index, x, base, step, slideWidth, active, onSelect }) {
  const targetX = base - index * step
  const distance = useTransform(x, (v) => v - targetX)

  const scale = useTransform(distance, [-step, 0, step], [0.9, 1, 0.9], { clamp: true })
  const opacity = useTransform(distance, [-step * 1.1, 0, step * 1.1], [0.45, 1, 0.45], { clamp: true })
  const zIndex = useTransform(distance, (d) => Math.round(30 - Math.min(29, Math.abs(d) / 20)))

  return (
    <motion.div
      className="pg2-carousel__slot"
      style={{ left: index * step, width: slideWidth, zIndex }}
    >
      <motion.div
        onClick={() => !active && onSelect(index)}
        style={{ scale, opacity }}
        className={`pg2-carousel__card ${active ? 'pg2-carousel__card--active' : ''}`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export const CarouselSlide = memo(CarouselSlideBase)
