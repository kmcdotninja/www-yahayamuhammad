import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import './PlaygroundSection.css'

export default function PlaygroundSection({
  title,
  meta,
  span = 'half',
  aspect = 'wide',
  children,
}) {
  const stageRef = useRef(null)
  const inView = useInView(stageRef, { amount: 0.3, once: false })

  return (
    <figure className={`pg2-section ${span === 'full' ? 'pg2-section--full' : ''}`}>
      <motion.div
        ref={stageRef}
        className={`pg2-section__stage ${
          aspect === 'square' ? 'pg2-section__stage--square' : 'pg2-section__stage--wide'
        }`}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0.2, y: 12 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {children({ inView })}
      </motion.div>

      <figcaption className="pg2-section__caption">
        <h2 className="pg2-section__title">{title}</h2>
        {meta && <span className="pg2-section__meta">{meta}</span>}
      </figcaption>
    </figure>
  )
}
